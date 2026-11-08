import { request } from "node:https";
import { lookup } from "node:dns/promises";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { publicImageAddress } from "../images/import-source.js";
import {
  validateGeometry,
  normalize,
  normalizeAdministrative,
} from "./domain.js";
export function validateFeedUrl(
  input,
  allowed = process.env.RELOO_NEIGHBORHOOD_FEED_HOSTS || "",
) {
  const url = new URL(input);
  const hosts = allowed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !hosts.includes(url.hostname) ||
    url.hash ||
    url.search
  )
    throw Error("SOURCE_NOT_ALLOWED");
  return url;
}
export async function fetchPartnerFeed(
  source,
  { allowedHosts, resolveDns = lookup } = {},
) {
  if (
    source.provider !== "PARTNER_JSON" ||
    !source.storage_allowed ||
    !source.enabled
  )
    throw Error("SOURCE_NOT_ALLOWED");
  const url = validateFeedUrl(source.feed_url, allowedHosts);
  const addresses = await resolveDns(url.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some((a) => !publicImageAddress(a.address))
  )
    throw Error("SOURCE_NOT_ALLOWED");
  const pinned = addresses[0];
  const bytes = await new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "RELOO-Neighborhood/1.0",
        },
        lookup: (_h, options, cb) =>
          options.all
            ? cb(null, [pinned])
            : cb(null, pinned.address, pinned.family),
      },
      (res) => {
        if (
          res.statusCode !== 200 ||
          !res.headers["content-type"]?.includes("application/json")
        ) {
          res.resume();
          reject(Error("SOURCE_HTTP_ERROR"));
          return;
        }
        let size = 0;
        const chunks = [];
        res.on("data", (b) => {
          size += b.length;
          if (size > 2000000) {
            req.destroy(Error("SOURCE_TOO_LARGE"));
            return;
          }
          chunks.push(b);
        });
        res.on("error", reject);
        res.on("end", () => resolve(Buffer.concat(chunks)));
      },
    );
    const timer = setTimeout(() => req.destroy(Error("SOURCE_TIMEOUT")), 12000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end();
  });
  const feed = JSON.parse(bytes.toString("utf8"));
  if (!Array.isArray(feed.places) || feed.places.length > 1000)
    throw Error("SOURCE_INVALID");
  return feed.places.map(normalizePlace);
}
export function normalizePlace(input) {
  if (
    !input ||
    !["AREA", "SUBZONE", "BUILDING", "HANDOVER"].includes(input.kind) ||
    typeof input.externalId !== "string" ||
    !input.externalId ||
    input.externalId.length > 160 ||
    typeof input.name !== "string" ||
    input.name.trim().length < 2 ||
    input.name.length > 160
  )
    throw Error("SOURCE_INVALID");
  const p = {
    kind: input.kind,
    externalId: input.externalId,
    name: input.name.trim(),
    aliases: (input.aliases || [])
      .filter((s) => typeof s === "string" && s.length <= 160)
      .slice(0, 20),
    parent: input.parent || null,
    parentExternalId: input.parentExternalId
      ? String(input.parentExternalId).slice(0, 160)
      : null,
    addressRaw: String(input.addressRaw || "").slice(0, 500),
    address: String(input.address || input.addressRaw || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 500),
    administrative: normalizeAdministrative(input.administrative || {}),
    sourceVersion: String(input.sourceVersion || "").slice(0, 80),
    geometry: validateGeometry(input.geometry),
    confidence: Math.min(1, Math.max(0, Number(input.confidence) || 0)),
  };
  return p;
}
export function duplicateCandidates(place, existing) {
  return existing
    .filter(
      (e) =>
        e.kind === place.kind &&
        (e.external_id === place.externalId ||
          (normalize(e.name) === normalize(place.name) &&
            normalize(e.address_normalized) === normalize(place.address))),
    )
    .map((e) => e.id);
}
export function verifySandboxWebhook(raw, headers, secret, now = Date.now()) {
  if (!secret || secret.length < 32) throw Error("PAYMENT_UNAVAILABLE");
  const timestamp = headers.get("x-reloo-timestamp"),
    signature = headers.get("x-reloo-signature");
  if (
    !/^\d{10}$/.test(timestamp || "") ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !/^v1=[a-f0-9]{64}$/.test(signature || "")
  )
    throw Error("WEBHOOK_REJECTED");
  const expected = createHmac("sha256", secret)
    .update(timestamp + "." + raw)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature.slice(3), "hex")))
    throw Error("WEBHOOK_REJECTED");
  const event = JSON.parse(raw);
  if (
    !/^[a-zA-Z0-9_-]{1,100}$/.test(event.eventId) ||
    !Number.isSafeInteger(event.amount) ||
    event.amount < 0 ||
    !Number.isSafeInteger(event.sequence) ||
    event.sequence < 1 ||
    !["PAID", "FAILED", "PENDING"].includes(event.status)
  )
    throw Error("INVALID_INPUT");
  return {
    ...event,
    fingerprint: createHash("sha256").update(raw).digest("hex"),
  };
}
