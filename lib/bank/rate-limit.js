/**
 * Rate limit in-memory (Vercel serverless: per-instance, vẫn hạn chế spam cơ bản)
 */
const buckets = new Map();

export function checkRateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now - bucket.startedAt > windowMs) {
    bucket = { startedAt: now, count: 0 };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterMs: windowMs - (now - bucket.startedAt),
    };
  }

  return { allowed: true, remaining: limit - bucket.count };
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}
