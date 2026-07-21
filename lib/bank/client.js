const CACHE_KEY = "reloo-banks-cache-v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

let memoryCache = null;

function loadCache() {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(payload) {
  memoryCache = payload;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export async function fetchBanks({ signal } = {}) {
  const cached = loadCache();
  if (cached?.banks?.length && Date.now() - (cached.__ts || 0) < CACHE_TTL_MS) {
    return cached.banks;
  }

  const res = await fetch("/api/banks", { signal });
  const json = await res.json();

  if (!res.ok || !json?.ok) {
    if (cached?.banks?.length) return cached.banks;
    throw new Error(json?.message || "Không tải được danh sách ngân hàng.");
  }

  saveCache({ __ts: Date.now(), banks: json.banks });
  return json.banks;
}

/** @deprecated */
export const fetchSupportedBanks = fetchBanks;
