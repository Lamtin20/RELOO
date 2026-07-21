const VIETQR_BASE = "https://api.vietqr.io/v2";
const BANKS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

let banksCache = { data: null, expiresAt: 0 };

/** Danh sách ngân hàng (API công khai, không tốn phí tra cứu) */
export async function fetchVietQrBanks({ signal } = {}) {
  if (banksCache.data && Date.now() < banksCache.expiresAt) {
    return banksCache.data;
  }

  const res = await fetch(`${VIETQR_BASE}/banks`, {
    signal,
    next: { revalidate: 43200 },
  });

  if (!res.ok) {
    if (banksCache.data) return banksCache.data;
    throw new Error("Không tải được danh sách ngân hàng.");
  }

  const json = await res.json();
  const banks = json?.data ?? json?.banks ?? [];
  banksCache = { data: banks, expiresAt: Date.now() + BANKS_CACHE_TTL_MS };
  return banks;
}
