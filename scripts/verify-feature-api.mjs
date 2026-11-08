import assert from "node:assert/strict";
import { io } from "socket.io-client";
const origin = process.env.VERIFY_ORIGIN || "http://localhost:3000";
for (const [path, method] of [
  ["/api/listings", "POST"],
  ["/api/rent/inquiries", "POST"],
  ["/api/chat/messages", "POST"],
  ["/api/chat/threads", "POST"],
  ["/api/security/admin/cases", "POST"],
  ["/api/security/admin/signals", "POST"],
  ["/api/affiliate/link", "POST"],
  ["/api/affiliate/sync", "POST"],
]) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-User-Id": "user_admin",
    },
    body: JSON.stringify({
      userId: "user_admin",
      role: "admin",
      activationStatus: "ACTIVE",
    }),
    signal: AbortSignal.timeout(40000),
  });
  assert.equal(
    response.status,
    401,
    `${method} ${path} must reject a forged client identity`,
  );
  console.log(`${path}: unauthenticated writes rejected`);
}
const quote = await fetch(`${origin}/api/ghtk/quote`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ weight: -1 }),
  signal: AbortSignal.timeout(40000),
});
assert.equal(quote.status, 400);
const affiliate = await fetch(`${origin}/api/affiliate/status`, {
  signal: AbortSignal.timeout(40000),
}).then((response) => response.json());
assert.equal(affiliate.ok, true);
const socket = io(origin, {
  path: "/socket.io",
  auth: { userId: "user_admin" },
  transports: ["websocket"],
  reconnection: false,
});
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    socket.disconnect();
    reject(new Error("Unauthenticated socket did not fail promptly"));
  }, 15000);
  socket.on("connect", () => {
    clearTimeout(timer);
    socket.disconnect();
    reject(new Error("Unauthenticated socket was accepted"));
  });
  socket.on("connect_error", () => {
    clearTimeout(timer);
    socket.disconnect();
    resolve();
  });
});
console.log(
  "API verification passed: backend identity gates, invalid quotes and unauthenticated Socket.io rejection.",
);
