/**
 * Next.js + Socket.io custom server — chat realtime (presence, read receipts, typing)
 */
import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import { Server } from 'socket.io';
import { ChatSocketEvents as E } from './lib/chat-socket-events.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/** @type {Map<string, Set<string>>} userId → socket ids */
const onlineUsers = new Map();

function getOnlineUserIds() {
  return [...onlineUsers.keys()];
}

function broadcastPresence(io) {
  io.emit(E.PRESENCE_UPDATE, getOnlineUserIds());
}

await app.prepare();

const httpServer = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  handle(req, res, parsedUrl);
});

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: { origin: dev ? true : false },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  let registeredUserId = null;

  socket.on(E.PRESENCE_REGISTER, (userId) => {
    if (!userId || typeof userId !== 'string') return;
    registeredUserId = userId;
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    broadcastPresence(io);
  });

  socket.on(E.THREAD_JOIN, (threadId) => {
    if (threadId) socket.join(`thread:${threadId}`);
  });

  socket.on(E.THREAD_LEAVE, (threadId) => {
    if (threadId) socket.leave(`thread:${threadId}`);
  });

  socket.on(E.MESSAGE_SEND, (payload) => {
    if (!payload?.threadId || !payload?.message) return;
    socket.to(`thread:${payload.threadId}`).emit(E.MESSAGE_NEW, payload);
  });

  socket.on(E.MESSAGE_READ, (payload) => {
    if (!payload?.threadId || !payload?.readerId) return;
    socket.to(`thread:${payload.threadId}`).emit(E.MESSAGE_READ, payload);
  });

  socket.on(E.TYPING, (payload) => {
    if (!payload?.threadId || !payload?.userId) return;
    socket.to(`thread:${payload.threadId}`).emit(E.TYPING, payload);
  });

  socket.on('disconnect', () => {
    if (!registeredUserId) return;
    const sockets = onlineUsers.get(registeredUserId);
    if (!sockets) return;
    sockets.delete(socket.id);
    if (sockets.size === 0) onlineUsers.delete(registeredUserId);
    broadcastPresence(io);
  });
});

httpServer.listen(port, () => {
  console.log(`> RELOO ready on http://${hostname}:${port} (Socket.io enabled)`);
});
