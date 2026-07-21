/**
 * Ghép địa chỉ đầy đủ cho tin cho thuê
 */
export function formatListingAddress({ province, ward, addressDetail } = {}) {
  const parts = [];
  if (addressDetail?.trim()) parts.push(addressDetail.trim());
  if (ward?.name) parts.push(ward.name);
  if (province?.name) parts.push(province.name);
  return parts.join(", ");
}

export function emptyListingAddress() {
  return { province: null, ward: null, addressDetail: "", coords: null };
}

export function listingAddressToForm(listing) {
  const d = listing?.locationDetails;
  if (d) {
    return {
      province: d.province ?? null,
      ward: d.ward ?? null,
      addressDetail: d.addressDetail ?? "",
      coords: d.coords ?? null,
    };
  }
  return emptyListingAddress();
}

export function validateListingAddress(form) {
  const errors = {};
  if (!form?.province) errors.province = "Vui lòng chọn tỉnh/thành phố";
  if (!form?.ward) errors.ward = "Vui lòng chọn phường/xã";
  if (!form?.addressDetail?.trim()) {
    errors.addressDetail = "Vui lòng nhập chi tiết địa chỉ (số nhà, tên đường, tòa nhà…)";
  }
  return errors;
}

export function buildListingLocationPayload(form) {
  const addressDetail = form.addressDetail.trim();
  return {
    location: formatListingAddress({ ...form, addressDetail }),
    locationDetails: {
      province: form.province,
      ward: form.ward,
      addressDetail,
      coords: form.coords ?? null,
    },
  };
}

export function listingMapUrl(listing) {
  const coords = listing?.locationDetails?.coords;
  if (!coords?.lat || !coords?.lng) return null;
  return `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
}

/**
 * Lọc listing theo tỉnh/thành (text match trên trường location)
 */
export function listingMatchesProvince(listing, provinceName) {
  if (!provinceName) return true;

  const structuredName = listing?.locationDetails?.province?.name;
  if (structuredName) {
    const raw = provinceName.toLowerCase();
    const structured = structuredName.toLowerCase();
    if (structured.includes(raw.replace(/^tỉnh\s+/i, "").replace(/^thành phố\s+/i, ""))) {
      return true;
    }
    if (raw.includes(structured.replace(/^tỉnh\s+/i, "").replace(/^thành phố\s+/i, ""))) {
      return true;
    }
  }

  const loc = (listing?.location || "").toLowerCase();
  const raw = provinceName.toLowerCase();

  const aliases = {
    "thành phố hồ chí minh": ["hcm", "tp.hcm", "tp. hcm", "hồ chí minh", "ho chi minh", "sài gòn", "thủ đức", "bình dương"],
    "tỉnh đồng nai": ["đồng nai", "dong nai", "biên hòa"],
    "thành phố hà nội": ["hà nội", "ha noi"],
    "thành phố đà nẵng": ["đà nẵng", "da nang"],
  };

  for (const [key, terms] of Object.entries(aliases)) {
    if (raw.includes(key.replace("thành phố ", "").replace("tỉnh ", "")) || raw === key) {
      if (terms.some((t) => loc.includes(t))) return true;
    }
  }

  const simplified = raw
    .replace(/^tỉnh\s+/i, "")
    .replace(/^thành phố\s+/i, "")
    .trim();

  return loc.includes(simplified) || loc.includes(raw);
}

/** null hoặc mảng rỗng = tất cả phường/xã trong tỉnh */
export function listingMatchesWards(listing, wards) {
  if (!wards?.length) return true;

  const structuredWard = listing?.locationDetails?.ward;
  if (structuredWard?.code) {
    return wards.some((w) => w.code === structuredWard.code);
  }
  if (structuredWard?.name) {
    const name = structuredWard.name.toLowerCase();
    return wards.some((w) => w.name?.toLowerCase() === name);
  }

  const loc = (listing?.location || "").toLowerCase();
  return wards.some((w) => loc.includes((w.name || "").toLowerCase()));
}

export function formatProvinceFilterLabel(province, wards) {
  if (!province?.name) return "";
  if (!wards?.length) return province.name;
  if (wards.length === 1) return `${wards[0].name}, ${province.name}`;
  return `${province.name} · ${wards.length} phường/xã`;
}

export function buildLocationAddress(guestLocation, fallback = "") {
  if (!guestLocation?.province) return fallback;
  if (guestLocation.ward?.name) {
    return `${guestLocation.ward.name}, ${guestLocation.province.name}`;
  }
  return guestLocation.province.name;
}
