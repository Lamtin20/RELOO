import { createHash } from "node:crypto";
import { safeNextPath } from "../auth-navigation.js";
export function mobileVerifierHash(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43,128}$/.test(value))
    throw new Error("INVALID_MOBILE_VERIFIER");
  return createHash("sha256").update(value).digest("hex");
}
export function mobileNext(value) {
  const path = safeNextPath(value, "/");
  return path.startsWith("/api/") ||
    path.startsWith("/auth/callback") ||
    path.startsWith("/mobile/auth")
    ? "/"
    : path;
}
