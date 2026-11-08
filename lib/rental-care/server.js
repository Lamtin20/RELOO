import { requireAccount } from "../security/authorization.js";
import {
  HttpError,
  assertOrigin,
  rateLimit,
  readJson,
  errorResponse,
} from "../server/http.js";
import { testAccount, localTestRequest } from "../neighborhood/test-runtime.js";
import { socketCookieToken } from "../auth/socket-cookie.js";
export const careEnabled = () =>
  process.env.RELOO_RENTAL_CARE_ENABLED === "true";
export const personalEnabled = () =>
  process.env.RELOO_PERSONALIZATION_ENABLED === "true";
export async function anonymousCareTest(request) {
  return localTestRequest(request) && !(await testAccount(request));
}
export async function careAccount(request) {
  const test = await testAccount(request);
  if (test) {
    const { careTestDb } = await import("./test-runtime.js");
    return {
      ...test,
      db: careTestDb(
        await (await import("../neighborhood/test-runtime.js")).testDatabase(),
      ),
      authUser: {
        email: test.profile.id + "@example.test",
        email_confirmed_at: "2026-01-01",
      },
    };
  }
  if (localTestRequest(request))
    throw new HttpError(401, "AUTH_REQUIRED", "AUTH_REQUIRED");
  if (request.headers.get("x-reloo-calendar-background") === "1") {
    // Background calendar jobs must never rotate a WebView refresh token behind
    // a simultaneous account switch. Verify only the existing access token.
    const token = socketCookieToken(request.headers.get("cookie") || "");
    if (!token) throw new HttpError(401, "AUTH_REQUIRED", "AUTH_REQUIRED");
    const headers = new Headers(request.headers);
    headers.set("authorization", "Bearer " + token);
    return requireAccount(new Request(request.url, { headers }), {
      active: false,
    });
  }
  return requireAccount(request, { active: false });
}
export const rpc = async (db, name, args) => {
  const r = await db.rpc(name, args);
  if (r.error) throw Error(r.error.message);
  return r.data;
};
export const safeResponse = (data) =>
  Response.json(data, { headers: { "Cache-Control": "private,no-store" } });
const codes = [
  "INVALID_INPUT",
  "FORBIDDEN",
  "AUTH_REQUIRED",
  "ACCOUNT_CONFIRMATION_REQUIRED",
  "DESTINATION_CONFIRMATION_REQUIRED",
  "REAUTH",
  "CALENDAR_NOT_CONFIGURED",
  "CALENDAR_REVIEW",
  "CALENDAR_PERMISSION",
  "CALENDAR_FAILED",
  "PROVIDER_RETRY",
  "NO_CONSENT",
  "FEATURE_DISABLED",
];
export function careError(e) {
  if (codes.includes(e.code || e.message)) {
    const code = e.code || e.message;
    return Response.json(
      { ok: false, code },
      {
        status:
          code === "AUTH_REQUIRED"
            ? 401
            : code === "FORBIDDEN"
              ? 403
              : code.endsWith("REQUIRED")
                ? 409
                : code === "INVALID_INPUT"
                  ? 400
                  : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  return errorResponse(e);
}
export async function bodyFor(request, account) {
  assertOrigin(request);
  rateLimit(request, "rental-care-write", 60);
  const body = await readJson(request, 20000);
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw Error("INVALID_INPUT");
  if (body.subject !== account.profile.id) throw Error("FORBIDDEN");
  return body;
}
export const isUuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
export function oauthConfig() {
  const origin = process.env.APP_ORIGIN;
  let u;
  try {
    u = new URL(origin);
  } catch {
    throw Error("CALENDAR_NOT_CONFIGURED");
  }
  if (
    !process.env.RELOO_CALENDAR_CLIENT_ID ||
    !process.env.RELOO_CALENDAR_CLIENT_SECRET ||
    !(
      u.protocol === "https:" ||
      (process.env.NODE_ENV === "development" &&
        ["127.0.0.1", "localhost"].includes(u.hostname))
    )
  )
    throw Error("CALENDAR_NOT_CONFIGURED");
  return {
    clientId: process.env.RELOO_CALENDAR_CLIENT_ID,
    clientSecret: process.env.RELOO_CALENDAR_CLIENT_SECRET,
    redirect: u.origin + "/api/rental-care/google/callback",
    origin: u.origin,
  };
}
