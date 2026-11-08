import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import {isChatHost,CHAT_HOST} from '../chat-control/host.js';

export class HttpError extends Error {
  constructor(status, message, code = "REQUEST_FAILED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function clientIp(request) {
  if (process.env.RELOO_EDGE_SECRET && secretMatches(request.headers.get("x-reloo-edge"), process.env.RELOO_EDGE_SECRET)) {
    const value = request.headers.get("x-reloo-client-ip");
    return value && isIP(value) ? value : null;
  }
  if (process.env.TRUST_PROXY !== "true") return null;
  const value = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return value && isIP(value) ? value : null;
}

const windows = new Map();
export function rateLimit(request, scope, limit = 20, interval = 60000) {
  const now = Date.now();
  if (windows.size > 1000)
    for (const [key, entry] of windows)
      if (entry.until <= now) windows.delete(key);
  const key = `${scope}:${clientIp(request) || "shared"}`;
  const current = windows.get(key);
  if (!current || current.until <= now) {
    windows.set(key, { count: 1, until: now + interval });
    return;
  }
  if (current.count >= limit)
    throw new HttpError(
      429,
      "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
      "RATE_LIMITED",
    );
  current.count += 1;
}

export async function readJson(request, maxBytes = 24000) {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new HttpError(413, "Nội dung quá lớn.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Thiếu nội dung yêu cầu.");
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Nội dung quá lớn.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Nội dung JSON không hợp lệ.");
  }
}

export async function readMultipart(request, maxBytes = 6500000) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Thiếu ảnh cần gửi.");
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, "Ảnh vượt giới hạn dung lượng."); }
    chunks.push(value);
  }
  try { return await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") } }).formData(); }
  catch { throw new HttpError(400, "Không đọc được ảnh gửi lên."); }
}

export function assertOrigin(request) {
  if(isChatHost(request)){
    const origin=request.headers.get('origin');
    if(origin&&origin!=='https://'+CHAT_HOST)throw new HttpError(403,'Origin denied','ORIGIN_DENIED');
    return;
  }
  const origin = request.headers.get("origin");
  if (
    origin &&
    origin !== new URL(request.url).origin &&
    origin !== process.env.APP_ORIGIN &&
    origin !== process.env.CRM_ORIGIN
  )
    throw new HttpError(
      403,
      "Nguồn yêu cầu không được chấp nhận.",
      "ORIGIN_DENIED",
    );
}

export function errorResponse(error) {
  return Response.json(
    {
      ok: false,
      code: error instanceof HttpError ? error.code : "SERVICE_UNAVAILABLE",
      error:
        error instanceof HttpError
          ? error.message
          : "Dịch vụ chưa sẵn sàng. Vui lòng thử lại sau.",
    },
    {
      status: error instanceof HttpError ? error.status : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function secretMatches(value, secret) {
  if (!value || !secret) return false;
  return timingSafeEqual(
    createHash("sha256").update(value).digest(),
    createHash("sha256").update(secret).digest(),
  );
}
