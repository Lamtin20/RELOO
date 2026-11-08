import {requireProfileIdentity} from '../security/identity.js';
import {neighborhoodIdentityRequired} from '../identity-access.js';
import { createHmac } from "node:crypto";
import {withinRentalWindow} from '../rental-window.js';
import {linkRentalMeasurement} from '../analytics/order-link.js';
import {socketCookieToken} from '../auth/socket-cookie.js';
import canonicalize from "canonicalize";
import { createSupabaseAdminClient } from "../supabase/admin.js";
import { requireAccount } from "../security/authorization.js";
import { requirePermission } from "../operations/permissions.js";
import {
  HttpError,
  readJson,
  assertOrigin,
  rateLimit,
} from "../server/http.js";
import { prepareListingImages } from "../images/listing-media.js";
import { validateInput } from "./validation.js";
import { validateFeedUrl } from "./providers.js";
import { text } from "./content.js";
import { UUID } from "./domain.js";
import { residencyMethods } from "./residency.js";
import {
  localTestRequest,
  testAccount,
  testDatabase,
  testDbFacade,
} from "./test-runtime.js";
const known = [
  "RESIDENCY_METHOD_DISABLED",
  "RESIDENCY_PROVIDER_UNAVAILABLE",
  "INVALID_GEOMETRY",
  "ACCOUNT_RESTRICTED",
  "IDENTITY_EXPIRED",
  "PROFILE_INCOMPLETE",
  "EMAIL_NOT_VERIFIED",
  "RETRY_LATER",
  "IMAGE_INVALID",
  "INVALID_INPUT",
  "INVALID_TIME",
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "AREA_DISABLED",
  "SLOT_CONFLICT",
  "IDENTITY_REQUIRED",
  "OTHER_IDENTITY_REQUIRED",
  "RESIDENCY_REQUIRED",
  "INVALID_STATE",
  "POLICY_CHANGED",
  "OTP_INVALID",
  "OTP_LOCKED",
  "CHECKLIST_REQUIRED",
  "EXPIRED_HOLD",
  "RATE_LIMITED",
  "REQUEST_CONFLICT",
  "INVITE_INVALID",
  "SOURCE_NOT_ALLOWED",
  "ADMIN_LOCKED",
  "PAYMENT_UNAVAILABLE",
  "PROMOTION_INELIGIBLE",
];
export function localeOf(request) {
  return new URL(request.url).searchParams.get("lang") === "en-US"
    ? "en-US"
    : "vi-VN";
}
export function neighborhoodError(e, request) {
  const code =
    (known.includes(e.code) ? e.code : null) ||
    known.find((c) => e.message?.includes(c)) ||
    (e.status === 401
      ? "AUTH_REQUIRED"
      : e.status === 403
        ? "FORBIDDEN"
        : "SERVICE_UNAVAILABLE");
  return Response.json(
    { ok: false, code, error: text(localeOf(request), code) },
    {
      status:
        e.status ||
        {
          AUTH_REQUIRED: 401,
          FORBIDDEN: 403,
          ACCOUNT_RESTRICTED: 403,
          IDENTITY_REQUIRED: 403,
          IDENTITY_EXPIRED: 403,
          NOT_FOUND: 404,
          RATE_LIMITED: 429,
          SOURCE_NOT_ALLOWED: 400,
          SERVICE_UNAVAILABLE: 503,
        }[code] ||
        409,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function neighborhoodAccount(
  request,
  {
    admin = false,
    verify = false,
    evidence = false,
    read = false,
    write = false,
  } = {},
) {
  const test = await testAccount(request);
  if (test) {
    if (admin && test.profile.id !== "nk-test-admin") throw Error("FORBIDDEN");
    return test;
  }
  if (localTestRequest(request)) throw new HttpError(401, "AUTH_REQUIRED");
  return admin
    ? requirePermission(
        request,
        evidence
          ? "neighborhood.evidence"
          : verify
            ? "neighborhood.verify"
            : read
              ? "neighborhood.read"
              : "neighborhood.write",
      )
    : requireAccount(request, { active: write, scope: "inquiry_write" });
}
export function secretDigest(kind, value) {
  const key =
    process.env.RELOO_NEIGHBORHOOD_OTP_KEY ||
    process.env.RELOO_PRIVATE_DATA_KEY;
  if (!key || key.length < 32) throw Error("SERVICE_UNAVAILABLE");
  return createHmac("sha256", key)
    .update("neighborhood:" + kind + ":" + value)
    .digest("hex");
}
export async function neighborhoodGet(request, { admin = false } = {}) {
  try {
    rateLimit(
      request,
      admin ? "neighborhood-admin-read" : "neighborhood-search",
      admin ? 60 : 150,
    );
    const url = new URL(request.url);
    const section = admin
      ? "admin"
      : url.searchParams.get("section") || "catalog";
    if (
      !admin &&
      ![
        "catalog",
        "search",
        "needs",
        "quote",
        "promotions",
        "mine",
        "order",
        "need",
      ].includes(section)
    )
      throw Error("NOT_FOUND");
    if (
      process.env.RELOO_NEIGHBORHOOD_ENABLED !== "true" &&
      !localTestRequest(request)
    )
      return Response.json(
        {
          ok: true,
          enabled: false,
          places: [],
          sources: [],
          items: [],
          needs: [],
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    let db,
      actor = null,
      testMode = false;
    if (
      ["catalog", "search", "needs", "quote", "promotions"].includes(section) &&
      !admin
    ) {
      if (localTestRequest(request)) {
        const test = await testAccount(request);
        db = test?.db || testDbFacade(await testDatabase());
        actor = test?.profile.id || null;
        testMode = true;
      } else {
        db = createSupabaseAdminClient();
        if (
          socketCookieToken(request.headers.get("cookie")||'') ||
          request.headers.get("authorization")
        ) {
          try{const account = await neighborhoodAccount(request);
          actor = account.profile.id;
          db = account.db;}catch(e){if(e.status!==401)throw e;}
        }
      }
    } else {
      const account = await neighborhoodAccount(request, { admin, read: true });
      db = account.db;
      actor = account.profile.id;
      testMode = !!account.testMode;
    }
    if (!db) throw Error("SERVICE_UNAVAILABLE");
    const filter = Object.fromEntries(
      [...url.searchParams].filter(([k]) =>
        [
          "id",
          "area",
          "subzone",
          "building",
          "start",
          "end",
          "asset",
          "q",
          "scope",
          "category",
          "price",
          "deposit",
          "promotion",
        ].includes(k),
      ),
    );
    if (Object.values(filter).some((v) => v.length > 200))
      throw Error("INVALID_INPUT");
    for (const k of ["id", "area", "subzone", "building", "promotion"])
      if (filter[k] && !UUID.test(filter[k])) throw Error("INVALID_INPUT");
    for (const k of ["price", "deposit"])
      if (filter[k] && !/^\d{1,10}$/.test(filter[k]))
        throw Error("INVALID_INPUT");
    for (const k of ["start", "end"])
      if (filter[k] && !Number.isFinite(Date.parse(filter[k])))
        throw Error("INVALID_TIME");
    if (
      filter.start &&
      filter.end &&
      (Date.parse(filter.end) <= Date.parse(filter.start) ||
        Date.parse(filter.end) - Date.parse(filter.start) > 90 * 86400000)
    )
      throw Error("INVALID_TIME");
    const r = await db.rpc("reloo_neighborhood_read", {
      p_actor: actor,
      p_section: section,
      p_filter: filter,
    });
    if (r.error) throw Error(r.error.message);
    if(!admin&&section==='quote'&&r.data?.quote){const context=await db.rpc('reloo_neighborhood_quote_context',{p_actor:actor,p_asset:filter.asset});if(context.error)throw Error(context.error.message);r.data.quote={...r.data.quote,...context.data};}
    if (
      !admin &&
      section === "search" &&
      actor &&
      process.env.RELOO_PERSONALIZATION_ENABLED === "true"
    ) {
      const ppDb = testMode
        ? (await import("../rental-care/test-runtime.js")).careTestDb(
            await testDatabase(),
          )
        : db;
      const context = await ppDb.rpc("reloo_pp_context", { p_actor: actor });
      if (context.error) throw Error("SERVICE_UNAVAILABLE");
      const exclusions = context.data.exclusions || [];
      const eligible = (r.data.items || []).filter(
        (i) =>
          !exclusions.some(
            (x) =>
              (x.kind === "PRODUCT" && x.target === i.asset_id) ||
              (x.kind === "OWNER" && x.target === i.owner_id) ||
              (x.kind === "CATEGORY" && x.target === i.category),
          ),
      );
      const { rankProducts } = await import("../personalization/domain.js");
      const ranked = rankProducts(
        eligible.map((i) => ({
          ...i,
          id: i.asset_id,
          ownerId: i.owner_id,
          dailyPrice: i.rate,
        })),
        context.data,
        Date.now(),
        eligible.length,
      );
      const order = new Map(
        ranked.items.map((i, index) => [i.id, { index, reason: i.reason }]),
      );
      r.data.items = eligible
        .map((i, index) => ({
          ...i,
          recommendationReason:
            order.get(i.asset_id)?.reason === "interest" ? "interest" : null,
          _original: index,
        }))
        .sort(
          (a, b) =>
            a.rank - b.rank ||
            (filter.q ? b.match_score - a.match_score : 0) ||
            (order.get(a.asset_id)?.index ?? 1000 + a._original) -
              (order.get(b.asset_id)?.index ?? 1000 + b._original),
        )
        .map(({ _original, ...i }) => {
          void _original;
          return i;
        });
    }
    return Response.json(
      { ok: true, enabled: true, testMode, actor, ...r.data },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return neighborhoodError(e, request);
  }
}
export async function neighborhoodPost(request, { admin = false } = {}) {
  let media,
    committed = false;
  try {
    assertOrigin(request);
    rateLimit(request, "neighborhood-" + (admin ? "admin" : "write"), 40);
    if (
      process.env.RELOO_NEIGHBORHOOD_ENABLED !== "true" &&
      !localTestRequest(request)
    )
      throw Error("AREA_DISABLED");
    const input = await readJson(request, 14500000);
    if (!UUID.test(input.key || "")) throw Error("INVALID_INPUT");
    const data = validateInput(input.action, input.data, { admin });
    if (
      input.action === "VERIFY" &&
      !residencyMethods().includes(data.invite ? "INVITE" : "MANUAL")
    )
      throw Error("RESIDENCY_METHOD_DISABLED");
    const account = await neighborhoodAccount(request, {
      admin,
      verify: ["ADMIN_VERIFY", "ADMIN_INVITE"].includes(input.action),
      write:
        ![
          "PREFERENCES",
          "CLOSE_NEED",
          "CANCEL",
          "ISSUE",
          "REFUND_ACK",
          "DEPOSIT_RETURN_ACK",
          "MEMBERSHIP",
          "VERIFY",
          "SUGGEST_AREA",
        ].includes(input.action) &&
        !(input.action === "HANDOVER" && data.phase === "RETURN"),
    });
    const { profile, db } = account;
    const requestHash = secretDigest(
      "request",
      canonicalize({ action: input.action, data }),
    );
    let secret;
    if (input.action === "ISSUE_OTP")
      secret = String(
        parseInt(
          secretDigest("issue-otp", profile.id + ":" + input.key).slice(0, 12),
          16,
        ) % 1000000,
      ).padStart(6, "0");
    if (input.action === "ADMIN_INVITE")
      secret = secretDigest("issue-invite", profile.id + ":" + input.key).slice(
        0,
        36,
      );
    const previous = await db.rpc("reloo_neighborhood_replay", {
      p_actor: profile.id,
      p_key: input.key,
      p_action: input.action,
      p_fingerprint: requestHash,
    });
    if (previous.error) throw Error(previous.error.message);
    if (previous.data) {
      if (previous.data.error) throw Error(previous.data.error);
      const qr =
        input.action === "ISSUE_OTP"
          ? await (
              await import("./qr.js")
            ).handoverQr(data.id, data.phase, secret)
          : null;
      return Response.json(
        {
          ok: true,
          ...previous.data,
          ...(secret ? { secret } : {}),
          ...(qr ? { qr } : {}),
          correlationId: input.key,
        },
        { headers: { "Cache-Control": "private,no-store" } },
      );
    }
    if(!admin&&neighborhoodIdentityRequired(input.action,data)){
      await requireProfileIdentity(db,profile.id);
      if(['BOOK','BOOK_DRAFT'].includes(input.action)){
        const item=await db.from('nk_listings').select('owner_id').eq('asset_id',data.asset).maybeSingle();
        if(item.error||!item.data)throw new HttpError(404,'NOT_FOUND');
        await requireProfileIdentity(db,item.data.owner_id,{other:true});
      }else if(['SUBMIT_DRAFT','ACCEPT','EXTENSION_ACCEPT'].includes(input.action)){
        const order=await db.from('nk_orders').select('owner_id,renter_id').eq('id',data.id).maybeSingle();
        if(order.error||!order.data||![order.data.owner_id,order.data.renter_id].includes(profile.id))throw new HttpError(404,'NOT_FOUND');
        await requireProfileIdentity(db,order.data.owner_id===profile.id?order.data.renter_id:order.data.owner_id,{other:true});
      }
    }
    if(['BOOK','BOOK_DRAFT'].includes(input.action)&&!withinRentalWindow(Date.parse(data.start),Date.parse(data.end)))throw new HttpError(400,'Lịch thuê vượt quá khoảng thời gian cho phép.','DATES_INVALID');
    if(input.action==='SUBMIT_DRAFT'){const draft=await db.from('nk_orders').select('starts_at,ends_at').eq('id',data.id).eq('renter_id',profile.id).maybeSingle();if(draft.error)throw new HttpError(503,'Chưa kiểm tra được lịch thuê.');if(!draft.data||!withinRentalWindow(Date.parse(draft.data.starts_at),Date.parse(draft.data.ends_at)))throw new HttpError(400,'Lịch thuê vượt quá khoảng thời gian cho phép.','DATES_INVALID');}
    data._requestHash = requestHash;
    if (input.action === "VERIFY" && data.invite) {
      data.inviteHash = secretDigest("invite", data.invite);
      delete data.invite;
    }
    if (input.action === "ISSUE_OTP")
      data.codeHash = secretDigest("otp:" + data.id + ":" + data.phase, secret);
    if (input.action === "HANDOVER" && data.code) {
      data.codeHash = secretDigest(
        "otp:" + data.id + ":" + data.phase,
        data.code,
      );
      delete data.code;
    }
    if (input.action === "ADMIN_INVITE")
      data.codeHash = secretDigest("invite", secret);
    if (input.action === "ADMIN_SOURCE" && data.provider === "PARTNER_JSON")
      validateFeedUrl(data.feedUrl);
    if (data.images?.length) {
      if (["HANDOVER", "ISSUE"].includes(input.action)) {
        const { prepareEvidence } = await import("./evidence.js");
        media = await prepareEvidence(data.images, {
          account,
          orderId: data.id,
        });
      } else {
        media = await prepareListingImages(data.images, {
          db,
          ownerId: profile.id,
          purpose: "neighborhood",
        });
        if (account.testMode)
          media.urls = media.urls.map((url) =>
            url.replace("/api/media/", "/api/neighborhood/test-media/"),
          );
      }
      data.images = media.urls;
    }
    const r = await db.rpc("reloo_neighborhood_action", {
      p_actor: profile.id,
      p_key: input.key,
      p_action: input.action,
      p_data: data,
    });
    if (r.error) throw Error(r.error.message);
    if (r.data?.error) throw Error(r.data.error);
    if (r.data?._replayed && media) await media.rollback();
    if (r.data) delete r.data._replayed;
    committed = true;
    if(['BOOK','SUBMIT_DRAFT'].includes(input.action)&&r.data?.id)await linkRentalMeasurement(request,db,profile.id,'NEIGHBORHOOD',r.data.id);
    const qr =
      input.action === "ISSUE_OTP"
        ? await (
            await import("./qr.js")
          ).handoverQr(data.id, data.phase, secret)
        : null;
    // OTP/invite plaintext is returned only to its issuer, never stored in history/outbox/logs.
    return Response.json(
      {
        ok: true,
        ...r.data,
        ...(secret ? { secret } : {}),
        ...(qr ? { qr } : {}),
        correlationId: input.key,
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    if (media && !committed) await media.rollback();
    return neighborhoodError(e, request);
  }
}
