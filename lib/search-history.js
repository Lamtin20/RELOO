import { classifyQuery } from "./personalization/domain.js";
import { CATEGORIES } from "./constants.js";
const SAFE_TERMS = {
  VACUUM: "Máy hút bụi",
  DRILL: "Máy khoan",
  CAMERA: "Máy ảnh",
  CAMPING: "Cắm trại",
  LAPTOP: "Laptop",
  PROJECTOR: "Máy chiếu",
  STROLLER: "Xe đẩy",
  CLEANING: "Đồ vệ sinh",
};
const canonical = (term) => {
  const c = classifyQuery(term);
  return c
    ? SAFE_TERMS[c.topic] ||
        CATEGORIES.find((cat) => cat.id === c.category)?.name
    : null;
};
const RECENT_KEY = "reloo-recent-searches";
const SAVED_KEY = "reloo-saved-searches";
const LAST_CATEGORY_KEY = "reloo-last-category";
const MAX_RECENT = 10;
const MAX_SAVED = 12;
// Optional search history is account/consent-epoch scoped. Never import the old
// shared keys or retain raw sensitive queries for anonymous visitors.
function scopedKey(key) {
  if (typeof window === "undefined") return null;
  const scope = window.__relooInterestScope;
  return scope?.enabled && scope.actor
    ? `${key}:${encodeURIComponent(scope.actor)}:${scope.epoch}`
    : null;
}

function readJson(key, fallback = []) {
  if (typeof window === "undefined") return fallback;
  key = scopedKey(key);
  if (!key) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed?.until > Date.now() && Array.isArray(parsed.value))
      return parsed.value;
    window.localStorage.removeItem(key);
    return fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  key = scopedKey(key);
  if (!key) return;
  window.localStorage.setItem(
    key,
    JSON.stringify({ value, until: Date.now() + 30 * 86400000 }),
  );
}

export function getRecentSearches() {
  return readJson(RECENT_KEY);
}

export function addRecentSearch(term) {
  const q = canonical(term);
  if (!q || q.length > 120 || /@|https?:|\d{6,}/i.test(q))
    return getRecentSearches();
  const next = [q, ...getRecentSearches().filter((s) => s !== q)].slice(
    0,
    MAX_RECENT,
  );
  writeJson(RECENT_KEY, next);
  return next;
}

export function removeRecentSearch(term) {
  const next = getRecentSearches().filter((s) => s !== term);
  writeJson(RECENT_KEY, next);
  return next;
}

export function clearRecentSearches() {
  writeJson(RECENT_KEY, []);
  return [];
}

export function getSavedSearches() {
  return readJson(SAVED_KEY);
}

export function saveSearch(term) {
  const q = canonical(term);
  if (!q || q.length > 120 || /@|https?:|\d{6,}/i.test(q))
    return getSavedSearches();
  if (getSavedSearches().includes(q)) return getSavedSearches();
  const next = [q, ...getSavedSearches()].slice(0, MAX_SAVED);
  writeJson(SAVED_KEY, next);
  return next;
}

export function removeSavedSearch(term) {
  const next = getSavedSearches().filter((s) => s !== term);
  writeJson(SAVED_KEY, next);
  return next;
}

export function toggleSavedSearch(term) {
  const saved = getSavedSearches();
  if (saved.includes(term)) return removeSavedSearch(term);
  return saveSearch(term);
}

export function isSearchSaved(term) {
  return getSavedSearches().includes(term);
}

export function setLastViewedCategory(slug) {
  if (typeof window === "undefined" || !slug) return;
  const key = scopedKey(LAST_CATEGORY_KEY);
  if (key)
    window.localStorage.setItem(
      key,
      JSON.stringify({ value: slug, until: Date.now() + 30 * 86400000 }),
    );
}

export function getLastViewedCategory() {
  if (typeof window === "undefined") return null;
  const key = scopedKey(LAST_CATEGORY_KEY);
  try {
    const value = key
      ? JSON.parse(window.localStorage.getItem(key) || "null")
      : null;
    return value?.until > Date.now() ? value.value : null;
  } catch {
    return null;
  }
}

/** Danh mục gợi ý nhanh trên panel tìm kiếm */
export const SEARCH_SUGGEST_CATEGORIES = [
  "may-anh",
  "camping",
  "laptop-pc",
  "thoi-trang",
  "ao-dai-cuoi",
  "me-be",
  "dien-tu",
  "may-quay",
  "gia-dung",
];
