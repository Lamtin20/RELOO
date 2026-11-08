/**
 * Vietnam Provinces API (2025) client.
 * Docs: https://provinces.open-api.vn/api/v2
 *
 * Cấu trúc hành chính 2025: TỈNH/THÀNH PHỐ (34) → PHƯỜNG/XÃ.
 * Không còn quận/huyện cấp 2.
 */

// Same-origin catalog proxy keeps the strict browser connect-src policy intact.
const BASE = "/api/address";
const CACHE_KEY = "reloo-vn-address-cache-v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

let memoryCache = null;

function loadCache() {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    memoryCache = parsed;
    return parsed;
  } catch {
    return {};
  }
}

function saveCache(cache) {
  memoryCache = cache;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota
  }
}

function isFresh(entry) {
  if (!entry?.__ts) return false;
  return Date.now() - entry.__ts < CACHE_TTL_MS;
}

/**
 * Lấy toàn bộ danh sách tỉnh/thành (34 tỉnh, không kèm wards).
 * Cached 7 ngày.
 */
export async function fetchProvinces({ signal } = {}) {
  const cache = loadCache();
  if (isFresh(cache.provinces)) return cache.provinces.data;

  const res = await fetch(`${BASE}/p/`, { signal });
  if (!res.ok) throw new Error(`Provinces API ${res.status}`);
  const data = await res.json();

  saveCache({
    ...cache,
    provinces: { data, __ts: Date.now() },
  });
  return data;
}

/**
 * Lấy phường/xã theo mã tỉnh. Cached theo từng province.
 */
export async function fetchWards(provinceCode, { signal } = {}) {
  const cache = loadCache();
  const key = `wards_${provinceCode}`;
  if (isFresh(cache[key])) return cache[key].data;

  const res = await fetch(`${BASE}/w/?province=${provinceCode}`, { signal });
  if (!res.ok) throw new Error(`Wards API ${res.status}`);
  const data = await res.json();

  saveCache({
    ...cache,
    [key]: { data, __ts: Date.now() },
  });
  return data;
}

/**
 * Xoá cache (dùng khi debug hoặc user chọn force refresh).
 */
export function clearAddressCache() {
  memoryCache = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Format địa chỉ đầy đủ: "[Số nhà, đường], [Phường/Xã], [Tỉnh/TP]"
 */
export function formatAddressString({ street, ward, province }) {
  return [street, ward?.name, province?.name].filter(Boolean).join(", ");
}

/**
 * Toạ độ trung tâm 34 tỉnh (2025) - dùng để tính khoảng cách khi user chưa cho phép GPS.
 */
export const PROVINCE_COORDS = {
  ha_noi: { lat: 21.0285, lng: 105.8542 },
  ho_chi_minh: { lat: 10.7626, lng: 106.6602 },
  hai_phong: { lat: 20.8449, lng: 106.6881 },
  da_nang: { lat: 16.0544, lng: 108.2022 },
  can_tho: { lat: 10.0452, lng: 105.7469 },
  hue: { lat: 16.4637, lng: 107.5909 },
  cao_bang: { lat: 22.6656, lng: 106.257 },
  lang_son: { lat: 21.8478, lng: 106.7615 },
  lai_chau: { lat: 22.3862, lng: 103.4707 },
  dien_bien: { lat: 21.386, lng: 103.0165 },
  son_la: { lat: 21.3256, lng: 103.914 },
  thanh_hoa: { lat: 19.807, lng: 105.7764 },
  nghe_an: { lat: 18.6797, lng: 105.6813 },
  ha_tinh: { lat: 18.3428, lng: 105.9057 },
  quang_tri: { lat: 16.7404, lng: 107.185 },
  quang_ngai: { lat: 15.1213, lng: 108.8044 },
  gia_lai: { lat: 13.8079, lng: 108.1097 },
  khanh_hoa: { lat: 12.2585, lng: 109.0526 },
  lam_dong: { lat: 11.9404, lng: 108.4583 },
  dak_lak: { lat: 12.71, lng: 108.2378 },
  dong_nai: { lat: 10.9574, lng: 106.8426 },
  tay_ninh: { lat: 11.3352, lng: 106.1099 },
  vinh_long: { lat: 10.253, lng: 105.9722 },
  dong_thap: { lat: 10.4938, lng: 105.6882 },
  an_giang: { lat: 10.3861, lng: 105.4381 },
  ca_mau: { lat: 9.1769, lng: 105.1524 },
  bac_ninh: { lat: 21.1861, lng: 106.0763 },
  hung_yen: { lat: 20.6464, lng: 106.0511 },
  ninh_binh: { lat: 20.2506, lng: 105.9744 },
  phu_tho: { lat: 21.398, lng: 105.4111 },
  quang_ninh: { lat: 21.0064, lng: 107.2925 },
  thai_nguyen: { lat: 21.5942, lng: 105.8482 },
  tuyen_quang: { lat: 21.8236, lng: 105.2181 },
  lao_cai: { lat: 22.4809, lng: 103.9755 },
};

/**
 * Ước lượng toạ độ cho một tỉnh dựa vào codename.
 */
export function getProvinceCoords(codename) {
  return PROVINCE_COORDS[codename] || null;
}
