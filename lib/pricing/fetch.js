import { request } from "node:https";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import robotsParser from "robots-parser";
import { sourceUrl } from "./sources.js";
export const PRICE_USER_AGENT = "RelooPriceBot/1.0";
export function publicAddress(value) {
  try {
    return ipaddr.process(value).range() === "unicast";
  } catch {
    return false;
  }
}
export async function boundedPage(url, sourceId, redirects = 0) {
  const address = sourceUrl(url, sourceId),
    host = new URL(address).hostname;
  const records = await lookup(host, { all: true });
  if (
    !records.length ||
    records.some((record) => !publicAddress(record.address))
  )
    throw new Error("NON_PUBLIC_ADDRESS");
  const pinned = records[0];
  const response = await new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    const req = request(
      address,
      {
        headers: {
          "User-Agent": PRICE_USER_AGENT,
          Accept: "text/html,text/plain,application/json",
          "Accept-Encoding": "identity",
        },
        agent: false,
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [pinned]);
          else callback(null, pinned.address, pinned.family);
        },
      },
      (res) => {
        res.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > 2000000) req.destroy(new Error("PAGE_TOO_LARGE"));
          else chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            type: String(res.headers["content-type"] || ""),
            location: res.headers.location,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        res.on("error", reject);
      },
    );
    const timer = setTimeout(
      () => req.destroy(new Error("SOURCE_TIMEOUT")),
      15000,
    );
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end();
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= 3 || !response.location) throw new Error("REDIRECT_LIMIT");
    const next = sourceUrl(new URL(response.location, address).href, sourceId);
    // Robots must be checked by the collection flow again for a changed path/host.
    return { ...response, url: address, redirectTo: next };
  }
  return { ...response, url: address };
}
const robotsCache = new Map(),
  lastRequest = new Map();
export async function permittedPage(url, sourceId) {
  let current = sourceUrl(url, sourceId);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const origin = new URL(current).origin;
    let policy = robotsCache.get(origin);
    if (!policy || policy.until < Date.now()) {
      const response = await boundedPage(`${origin}/robots.txt`, sourceId);
      if (
        response.status !== 200 ||
        !/^(text\/plain|text\/html)/i.test(response.type) ||
        !/^\s*(?:#|user-agent|sitemap)/im.test(response.body) ||
        /<html/i.test(response.body)
      )
        throw new Error("ROBOTS_UNAVAILABLE");
      policy = {
        rules: robotsParser(`${origin}/robots.txt`, response.body),
        until: Date.now() + 3600000,
      };
      robotsCache.set(origin, policy);
    }
    if (policy.rules.isAllowed(current, PRICE_USER_AGENT) !== true) {
      const error = new Error("ROBOTS_DENIED");
      error.collectionStatus = "BLOCKED_ROBOTS";
      throw error;
    }
    const delay = Math.max(
        5000,
        (policy.rules.getCrawlDelay(PRICE_USER_AGENT) || 0) * 1000,
      ),
      elapsed = Date.now() - (lastRequest.get(origin) || 0);
    if (elapsed < delay)
      await new Promise((resolve) => setTimeout(resolve, delay - elapsed));
    lastRequest.set(origin, Date.now());
    const response = await boundedPage(current, sourceId);
    if (response.redirectTo) {
      current = response.redirectTo;
      continue;
    }
    if (response.status !== 200 || !/^text\/html/i.test(response.type))
      throw new Error(`SOURCE_HTTP_${response.status}`);
    return response;
  }
  throw new Error("REDIRECT_LIMIT");
}
