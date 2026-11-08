import { randomBytes } from "node:crypto";
import { encryptPrivate, decryptPrivate } from "../operations/crypto.js";
import { mobileVerifierHash } from "../mobile/validation.js";

export const GOOGLE_NONCE_COOKIE = "reloo-native-google";
export function createGoogleNonce(flow, now = Date.now()) {
  const nonce = randomBytes(32).toString("base64url");
  return {
    challenge: mobileVerifierHash(nonce),
    cookie: encryptPrivate(JSON.stringify({ flow, nonce, expires: now + 300000 })),
  };
}
export function readGoogleNonce(cookie, now = Date.now()) {
  try {
    if (typeof cookie !== "string" || cookie.length > 1500) throw Error();
    const data = JSON.parse(decryptPrivate(cookie));
    if (!/^[a-f0-9-]{36}$/.test(data.flow) || !Number.isSafeInteger(data.expires) || data.expires <= now || data.expires > now + 300000) throw Error();
    return { ...data, challenge: mobileVerifierHash(data.nonce) };
  } catch { throw Error("GOOGLE_NONCE_INVALID"); }
}
export function validGoogleIdToken(token) {
  return typeof token === "string" && token.length <= 12000 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}
