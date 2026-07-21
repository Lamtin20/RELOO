const STORAGE_KEY = "reloo-rent-draft-v1";

/**
 * Lưu nháp đơn thuê (địa chỉ Goship, biểu phí) trước khi sang checkout
 */
export function saveRentDraft(listingId, draft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ listingId, savedAt: Date.now(), ...draft }),
    );
  } catch {
    /* ignore quota */
  }
}

export function loadRentDraft(listingId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.listingId !== listingId) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearRentDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function emptyGoshipAddress() {
  return {
    name: "",
    phone: "",
    street: "",
    city: null,
    district: null,
    ward: null,
  };
}

/** Goship address → hiển thị một dòng */
export function formatGoshipAddress(addr) {
  if (!addr) return "";
  const parts = [];
  if (addr.street?.trim()) parts.push(addr.street.trim());
  if (addr.ward?.name) parts.push(addr.ward.name);
  if (addr.district?.name) parts.push(addr.district.name);
  if (addr.city?.name) parts.push(addr.city.name);
  return parts.join(", ");
}

export function validateGoshipAddress(addr, { requireContact = true } = {}) {
  const errors = {};
  if (requireContact) {
    if (!addr?.name?.trim()) errors.name = "Vui lòng nhập họ tên";
    if (!addr?.phone?.trim()) errors.phone = "Vui lòng nhập số điện thoại";
  }
  if (!addr?.city?.id) errors.city = "Vui lòng chọn tỉnh/thành";
  if (!addr?.district?.id) errors.district = "Vui lòng chọn quận/huyện";
  if (!addr?.ward?.id) errors.ward = "Vui lòng chọn phường/xã";
  if (!addr?.street?.trim()) errors.street = "Vui lòng nhập số nhà, tên đường";
  return errors;
}
