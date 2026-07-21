const RECENT_KEY = "reloo-recent-searches";
const SAVED_KEY = "reloo-saved-searches";
const LAST_CATEGORY_KEY = "reloo-last-category";
const MAX_RECENT = 10;
const MAX_SAVED = 12;

function readJson(key, fallback = []) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getRecentSearches() {
  return readJson(RECENT_KEY);
}

export function addRecentSearch(term) {
  const q = term?.trim();
  if (!q) return getRecentSearches();
  const next = [q, ...getRecentSearches().filter((s) => s !== q)].slice(0, MAX_RECENT);
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
  const q = term?.trim();
  if (!q) return getSavedSearches();
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
  window.localStorage.setItem(LAST_CATEGORY_KEY, slug);
}

export function getLastViewedCategory() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_CATEGORY_KEY);
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
