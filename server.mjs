import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import next from "next";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import { ChatSocketEvents as E } from "./lib/chat-socket-events.js";
import { ipSignalApplies } from "./lib/security/rules.js";
import { privateHash } from "./lib/operations/crypto.js";
import { secretMatches } from "./lib/server/http.js";
import { traceRoute, createTraceMatcher } from "./lib/operations/trace.js";
import { readFile } from 'node:fs/promises';
import { supabaseServerFetch } from './lib/supabase/fetch.js';
import {socketIdentity} from './lib/auth/socket-identity.js';
import {installMapRealtime} from './lib/maps/realtime.js';
import {mapConfiguration} from './lib/maps/config.js';

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port, ...(dev ? { webpack: true } : {}) });
await app.prepare();
const handle = app.getRequestHandler();
let routeForTrace = traceRoute;
if (!dev) {
  const manifest = JSON.parse(await readFile('.next/server/app-paths-manifest.json', 'utf8'));
  routeForTrace = createTraceMatcher(Object.keys(manifest).filter((path) => path.startsWith('/api/')).map((path) => path.replace(/\/route$/, '')));
}
const server = createServer({ maxHeaderSize: 32768 }, (request, response) => {
  const started = Date.now();
  response.once("finish", () => {
    if (db && process.env.RELOO_DATA_REGION === "VN" && request.url?.startsWith("/api/") && !request.url.startsWith("/api/health")) {
      db.from("api_traces").insert({ method: request.method, route: routeForTrace(request.url.split("?")[0]), status: response.statusCode, duration_ms: Date.now() - started }).then(() => {}).catch(() => {});
    }
  });
  return handle(request, response);
});
const origin = process.env.APP_ORIGIN || `http://${hostname}:${port}`;
const io = new Server(server, {
  allowRequest:(request,callback)=>callback(null,!request.headers.origin||[origin,...(dev?['http://localhost:3000','http://localhost:3001']:[])].includes(request.headers.origin)),
  path: "/socket.io",
  cors: {
    origin: dev
      ? [origin, "http://localhost:3000", "http://localhost:3001"]
      : origin,
  },
  transports: ["websocket", "polling"],
});
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const db =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: supabaseServerFetch,
        },
      })
    : null;
if(mapConfiguration().enabled)installMapRealtime(io,{db,origin});
const online = new Map();

async function activeAccount(socket) {
  if (!db) throw new Error("AUTH_NOT_CONFIGURED");
  const authUser=await socketIdentity(socket,{db});
  if (!authUser.email_confirmed_at) throw new Error("AUTH_REQUIRED");
  if (process.env.RELOO_EDGE_SECRET && secretMatches(socket.handshake.headers["x-reloo-edge"], process.env.RELOO_EDGE_SECRET)) {
    const ip = socket.handshake.headers["x-reloo-client-ip"];
    if (ip) {
      const network = await db.from("network_checks").select("result,expires_at").eq("ip_hash", privateHash("NETWORK", ip)).maybeSingle();
      if (network.error) throw new Error("NETWORK_CHECK_UNAVAILABLE");
      if (network.data?.result === "ANONYMOUS" && Date.parse(network.data.expires_at) > Date.now()) throw new Error("VPN_REQUIRED_OFF");
    }
  }
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (profileError || !profile) throw new Error("PROFILE_REQUIRED");
  const identity = await db.from('verified_identities').select('expires_at').eq('profile_id',profile.id).maybeSingle();
  if(identity.error)throw new Error('IDENTITY_STORAGE_UNAVAILABLE');
  if(identity.data?.expires_at&&Date.parse(identity.data.expires_at)<=Date.now())throw new Error('IDENTITY_EXPIRED');
  const { error: gateError } = await db.rpc("reloo_assert_active", {
    p_profile_id: profile.id,
  });
  if (gateError) throw new Error("ACCOUNT_RESTRICTED");
  if (process.env.TRUST_PROXY === "true") {
    const ip = socket.handshake.headers["x-forwarded-for"]
      ?.split(",")[0]
      ?.trim();
    const key = process.env.SECURITY_IP_HASH_SECRET || serviceKey;
    if (ip) {
      const hash = createHmac("sha256", key)
        .update(`reloo-ip:${ip}`)
        .digest("hex");
      const { data: signals, error: signalError } = await db
        .from("scoped_ip_signals")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("ip_hash", hash)
        .eq("scope", "chat_write");
      if (
        signalError ||
        (signals || []).some((signal) =>
          ipSignalApplies(signal, {
            profileId: profile.id,
            ipHash: hash,
            scope: "chat_write",
          }),
        )
      )
        throw new Error("SCOPED_IP_RESTRICTION");
    }
  }
  return profile.id;
}
async function member(socket, threadId) {
  if (typeof threadId !== "string" || threadId.length > 250)
    throw new Error("INVALID_THREAD");
  const profileId = await activeAccount(socket);
  const { data, error } = await db
    .from("chat_threads")
    .select("lender_id,buyer_id")
    .eq("id", threadId)
    .maybeSingle();
  if (error || !data || ![data.lender_id, data.buyer_id].includes(profileId))
    throw new Error("THREAD_ACCESS_DENIED");
  return profileId;
}
function presence() {
  io.emit(E.PRESENCE_UPDATE, [...online.keys()]);
}
io.use(async (socket, next) => {
  try {
    socket.data.profileId = await activeAccount(socket);
    next();
  } catch (error) {
    next(new Error(error.message || "AUTH_REQUIRED"));
  }
});
io.on("connection", (socket) => {
  const profileId = socket.data.profileId;
  if (!online.has(profileId)) online.set(profileId, new Set());
  online.get(profileId).add(socket.id);
  presence();
  socket.on(E.PRESENCE_REGISTER, () => presence());
  socket.on(E.THREAD_JOIN, async (threadId) => {
    try {
      await member(socket, threadId);
      socket.join(`thread:${threadId}`);
    } catch {
      /* Unauthorized sockets cannot subscribe. */
    }
  });
  socket.on(E.THREAD_LEAVE, (threadId) => {
    if (typeof threadId === "string") socket.leave(`thread:${threadId}`);
  });
  socket.on(E.MESSAGE_SEND, async (payload) => {
    try {
      const sender = await member(socket, payload?.threadId);
      if (typeof payload?.message?.id !== "string") return;
      // Only messages already accepted and persisted by the HTTP backend can be broadcast.
      const { data, error } = await db
        .from("chat_messages")
        .select("*")
        .eq("id", payload.message.id)
        .eq("thread_id", payload.threadId)
        .eq("sender_id", sender)
        .maybeSingle();
      if (error || !data) return;
      socket.to(`thread:${payload.threadId}`).emit(E.MESSAGE_NEW, {
        threadId: payload.threadId,
        message: {
          ...data.message_data,
          id: data.id,
          senderId: sender,
          type: data.message_type,
          text: data.body,
          readBy: data.read_by,
          createdAt: data.created_at,
        },
      });
    } catch {
      /* Restrictions are rechecked for every event. */
    }
  });
  socket.on(E.MESSAGE_READ, async (payload) => {
    try {
      const reader = await member(socket, payload?.threadId);
      socket.to(`thread:${payload.threadId}`).emit(E.MESSAGE_READ, {
        threadId: payload.threadId,
        readerId: reader,
        readAt: new Date().toISOString(),
      });
    } catch {
      /* Preserve thread privacy. */
    }
  });
  socket.on(E.TYPING, async (payload) => {
    try {
      const sender = await member(socket, payload?.threadId);
      socket.to(`thread:${payload.threadId}`).emit(E.TYPING, {
        threadId: payload.threadId,
        userId: sender,
        isTyping: payload.isTyping === true,
      });
    } catch {
      /* Preserve thread privacy. */
    }
  });
  socket.on("disconnect", () => {
    const sockets = online.get(profileId);
    sockets?.delete(socket.id);
    if (!sockets?.size) online.delete(profileId);
    presence();
  });
});
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  const timer = setTimeout(() => process.exit(1), 25000);
  timer.unref();
  io.close(() => {
    clearTimeout(timer);
    process.exit(0);
  });
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
server.listen(port, hostname, () =>
  console.log(`> RELOO ready on ${origin} (authenticated Socket.io)`),
);
