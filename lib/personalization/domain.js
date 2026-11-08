import { CATEGORIES } from "../constants.js";
const categories = new Set(CATEGORIES.map((c) => c.id));
export const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
const TOPICS = [
  ["VACUUM", "gia-dung", /\b(may hut bui|robot hut bui|vacuum)\b/],
  ["DRILL", "cong-cu", /\b(may khoan|drill)\b/],
  ["CAMERA", "may-anh", /\b(may anh|camera|lens)\b/],
  ["CAMPING", "camping", /\b(camping|cam trai|leu)\b/],
  ["LAPTOP", "laptop-pc", /\b(laptop|may tinh)\b/],
  ["PROJECTOR", "may-chieu", /\b(may chieu|projector)\b/],
  ["STROLLER", "me-be", /\b(xe day|stroller)\b/],
  ["CLEANING", "gia-dung", /\b(may giat|ve sinh|don dep)\b/],
];
export function classifyQuery(query) {
  if (
    typeof query !== "string" ||
    query.length > 120 ||
    /@|https?:|\d{6,}|\b(password|cccd|otp|mat khau|tai khoan ngan hang)\b/i.test(
      normalize(query),
    )
  )
    return null;
  const term = normalize(query),
    topic = TOPICS.find(([, , pattern]) => pattern.test(term));
  if (topic) return { topic: topic[0], category: topic[1] };
  const cat = CATEGORIES.find((c) => normalize(c.name) === term);
  return cat ? { category: cat.id, topic: null } : null;
}
export function safeSearchTerm(query) {
  const c = classifyQuery(query);
  if (!c) return null;
  const terms = {
    VACUUM: "vacuum",
    DRILL: "drill",
    CAMERA: "camera",
    CAMPING: "camping",
    LAPTOP: "laptop",
    PROJECTOR: "projector",
    STROLLER: "stroller",
    CLEANING: "ve sinh",
  };
  return (
    terms[c.topic] ||
    CATEGORIES.find((category) => category.id === c.category)?.name ||
    null
  );
}
export const CLIENT_EVENTS = new Set([
  "SEARCH",
  "VIEW",
  "ENGAGED_VIEW",
  "CATEGORY",
  "FILTER",
  "SAVE",
  "START_RENT",
  "NEGATIVE",
]);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateEvent(input, now = Date.now()) {
  const allowed = [
    "id",
    "version",
    "epoch",
    "kind",
    "asset",
    "category",
    "query",
    "at",
    "activeSeconds",
    "subject",
  ];
  if (
    !input ||
    Object.keys(input).some((k) => !allowed.includes(k)) ||
    !uuid.test(input.id || "") ||
    input.version !== 1 ||
    !Number.isInteger(input.epoch) ||
    !CLIENT_EVENTS.has(input.kind) ||
    !Number.isFinite(Date.parse(input.at)) ||
    Date.parse(input.at) < now - 600000 ||
    Date.parse(input.at) > now + 30000
  )
    throw Error("INVALID_INPUT");
  if (
    input.asset != null &&
    (typeof input.asset !== "string" || input.asset.length > 150)
  )
    throw Error("INVALID_INPUT");
  if (input.category && !categories.has(input.category))
    throw Error("INVALID_INPUT");
  if (
    input.kind === "ENGAGED_VIEW" &&
    (!Number.isFinite(input.activeSeconds) ||
      input.activeSeconds < 10 ||
      input.activeSeconds > 120)
  )
    throw Error("INVALID_INPUT");
  const classified =
    input.kind === "SEARCH" ? classifyQuery(input.query) : null;
  if (input.kind === "SEARCH" && !classified) return null;
  return {
    ...input,
    query: undefined,
    category: classified?.category || input.category,
    topic: classified?.topic || null,
  };
}
export function rankProducts(
  items,
  context = {},
  now = Date.now(),
  limit = 12,
) {
  const cfg = context.config || {},
    weights = cfg.weights || {},
    scores = new Map(),
    topicScores = new Map(),
    views = new Map(),
    recent = new Map();
  const hasDeclared=Array.isArray(context.manualCategories)&&context.manualCategories.length>0;
  for(const category of context.manualCategories??(context.enabled?context.categories||[]:[]))scores.set(category,3);
  if (context.enabled) {
    for (const e of context.events || []) {
      const age = (now - Date.parse(e.recorded_at)) / 86400000;
      if (age < 0 || age > (cfg.profileTtlDays || 30)) continue;
      const value =
        (weights[e.kind] ?? 0) * 2 ** (-age / (cfg.halfLifeDays || 7));
      scores.set(
        e.category,
        Math.max(
          -12,
          Math.min(
            cfg.maxCategoryScore || 12,
            (scores.get(e.category) || 0) + value,
          ),
        ),
      );
      if (e.topic)
        topicScores.set(
          e.topic,
          Math.min(12, (topicScores.get(e.topic) || 0) + value),
        );
      if (e.asset_id && ["VIEW", "ENGAGED_VIEW"].includes(e.kind)) {
        views.set(e.asset_id, (views.get(e.asset_id) || 0) + 1);
        if (!recent.has(e.asset_id))
          recent.set(e.asset_id, Date.parse(e.recorded_at));
      }
    }
  }
  const ranked = items
    .filter((item) => !item.isBoosted)
    .map((item, index) => {
      const topic = classifyQuery(item.title)?.topic,
        confidence = scores.get(item.category) || 0,
        topicScore = topicScores.get(topic) || 0;
      return {
        ...item,
        reason:
          (context.enabled || hasDeclared) &&
          (confidence >= (cfg.minimumConfidence || 2) || topicScore >= 2)
            ? "interest"
            : "explore",
        score:
          (context.enabled || hasDeclared
            ? Math.max(0, confidence) +
              Math.max(0, topicScore) * 2 -
              Math.max(0, (views.get(item.id) || 0) - 2) * 0.6
            : 0) +
          0.01 * (items.length - index),
        recentAt: recent.get(item.id) || null,
      };
    })
    .sort((a, b) => b.score - a.score);
  const chosen = [],
    owners = new Map(),
    cats = new Map(),
    bands = new Map();
  for (const item of ranked) {
    const band =
      Number(item.dailyPrice) < 200000
        ? "low"
        : Number(item.dailyPrice) < 500000
          ? "mid"
          : "high";
    if (
      (owners.get(item.ownerId) || 0) >= (cfg.maxOwner || 2) ||
      (cats.get(item.category) || 0) >= (cfg.maxCategory || 3) ||
      (bands.get(band) || 0) >= Math.max(5, Math.ceil(limit * 0.7))
    )
      continue;
    chosen.push(item);
    owners.set(item.ownerId, (owners.get(item.ownerId) || 0) + 1);
    cats.set(item.category, (cats.get(item.category) || 0) + 1);
    bands.set(band, (bands.get(band) || 0) + 1);
    if (chosen.length >= limit) break;
  }
  return {
    items: chosen,
    recent: context.enabled
      ? ranked
          .filter((i) => i.recentAt)
          .sort((a, b) => b.recentAt - a.recentAt)
          .slice(0, 6)
      : [],
    eligibleIds: items.map((i) => i.id),
  };
}
