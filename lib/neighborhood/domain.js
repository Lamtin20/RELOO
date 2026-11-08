export const LOCALES = ["vi-VN", "en-US"];
export const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const TIME_ZONE = "Asia/Ho_Chi_Minh";
export function normalizeAdministrative(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("INVALID_INPUT");
  const result = {};
  for (const key of [
    "version",
    "effectiveFrom",
    "country",
    "province",
    "district",
    "ward",
  ]) {
    const item = value[key];
    if (item === undefined) continue;
    if (typeof item === "string" || typeof item === "number") {
      result[key] = String(item).trim().slice(0, 160);
      continue;
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      result[key] = Object.fromEntries(
        ["code", "name", "version"]
          .filter((k) => ["string", "number"].includes(typeof item[k]))
          .map((k) => [k, String(item[k]).trim().slice(0, 160)]),
      );
    }
  }
  return result;
}
export function defaultSearchDates(now = Date.now()) {
  const local = now + 7 * 3600000;
  return {
    start: new Date(local + 86400000).toISOString().slice(0, 16),
    end: new Date(local + 2 * 86400000).toISOString().slice(0, 16),
  };
}
export const normalize = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export const TRANSITIONS = {
  DRAFT: { SUBMIT: ["RENTER", "PENDING_OWNER"] },
  PENDING_OWNER: {
    ACCEPT: ["OWNER", "PENDING_PAYMENT"],
    REJECT: ["OWNER", "CANCELLED"],
    CANCEL: ["RENTER", "CANCELLED"],
    EXPIRE: ["SYSTEM", "EXPIRED"],
  },
  PENDING_PAYMENT: {
    PAYMENT_CONFIRMED: ["PROVIDER", "CONFIRMED"],
    CANCEL: ["PARTY", "CANCELLED"],
    EXPIRE: ["SYSTEM", "EXPIRED"],
  },
  CONFIRMED: {
    READY: ["OWNER", "READY_FOR_HANDOVER"],
    CANCEL: ["PARTY", "CANCELLED"],
  },
  READY_FOR_HANDOVER: {
    PICKUP: ["PARTIES", "ACTIVE"],
    CANCEL: ["PARTY", "CANCELLED"],
  },
  ACTIVE: { REQUEST_RETURN: ["RENTER", "RETURN_PENDING"] },
  RETURN_PENDING: { RETURN: ["PARTIES", "COMPLETED"] },
  COMPLETED: {},
  CANCELLED: {},
  EXPIRED: {},
};
export function isoLocal(value) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))
    throw Error("INVALID_TIME");
  const date = new Date(value + ":00+07:00");
  if (
    !Number.isFinite(+date) ||
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(date)
      .replace(" ", "T") !== value
  )
    throw Error("INVALID_TIME");
  return date.toISOString();
}
export function money(value, locale = "vi-VN") {
  return new Intl.NumberFormat(LOCALES.includes(locale) ? locale : "vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
export function dateTime(value, locale = "vi-VN") {
  return new Intl.DateTimeFormat(LOCALES.includes(locale) ? locale : "vi-VN", {
    timeZone: TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function quote(
  { rate, unitMinutes, minMinutes, deposit, feeBps = 0, version },
  start,
  end,
) {
  const duration = (Date.parse(end) - Date.parse(start)) / 60000;
  if (
    !Number.isFinite(duration) ||
    duration < minMinutes ||
    duration > 90 * 1440 ||
    ![rate, deposit, unitMinutes, minMinutes, feeBps, version].every(
      Number.isSafeInteger,
    ) ||
    rate < 1 ||
    deposit < 0 ||
    unitMinutes < 1 ||
    feeBps < 0 ||
    feeBps > 10000
  )
    throw Error("INVALID_QUOTE");
  const units = Math.ceil(duration / unitMinutes),
    rent = units * rate,
    fee = Math.ceil((rent * feeBps) / 10000),
    total = rent + fee + deposit;
  if (!Number.isSafeInteger(total) || total > 1000000000)
    throw Error("INVALID_QUOTE");
  return { units, rent, fee, deposit, total, policyVersion: version };
}
export function overlaps(a, b, buffer = 0) {
  return (
    Date.parse(a.start) < Date.parse(b.end) + buffer * 60000 &&
    Date.parse(b.start) < Date.parse(a.end) + buffer * 60000
  );
}
export function matchRank(item, { buildingId, subzoneId, areaId }) {
  return item.building_id && item.building_id === buildingId
    ? 0
    : item.subzone_id && item.subzone_id === subzoneId
      ? 1
      : item.area_id === areaId
        ? 2
        : 3;
}
export function validateGeometry(geometry) {
  if (geometry == null) return null;
  if (!["Point", "Polygon", "MultiPolygon"].includes(geometry.type))
    throw Error("INVALID_GEOMETRY");
  let count = 0;
  const point = (p) => {
    count++;
    if (
      !Array.isArray(p) ||
      p.length !== 2 ||
      !p.every(Number.isFinite) ||
      p[0] < 102 ||
      p[0] > 110 ||
      p[1] < 8 ||
      p[1] > 24
    )
      throw Error("INVALID_GEOMETRY");
  };
  const ring = (r) => {
    if (!Array.isArray(r) || r.length < 4) throw Error("INVALID_GEOMETRY");
    r.forEach(point);
    if (r[0][0] !== r.at(-1)[0] || r[0][1] !== r.at(-1)[1])
      throw Error("INVALID_GEOMETRY");
  };
  const polygon = (p) => {
    if (!Array.isArray(p) || !p.length) throw Error("INVALID_GEOMETRY");
    p.forEach(ring);
  };
  if (geometry.type === "Point") point(geometry.coordinates);
  else if (geometry.type === "Polygon") polygon(geometry.coordinates);
  else {
    if (!geometry.coordinates?.length) throw Error("INVALID_GEOMETRY");
    geometry.coordinates.forEach(polygon);
  }
  if (count > 20000) throw Error("INVALID_GEOMETRY");
  return geometry;
}
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
export function contains(geometry, point) {
  if (!geometry || geometry.type === "Point") return false;
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    (p) => inRing(point, p[0]) && !p.slice(1).some((r) => inRing(point, r)),
  );
}
export function locationSuggestions(places, { lat, lng, accuracy }) {
  if (
    ![lat, lng, accuracy].every(Number.isFinite) ||
    accuracy < 0 ||
    accuracy > 5000
  )
    return [];
  return places
    .filter((p) => p.geometry)
    .map((p) => {
      const boundary = p.geometry.type !== "Point",
        coords = boundary ? null : p.geometry.coordinates,
        km = coords
          ? 6371 *
            2 *
            Math.asin(
              Math.sqrt(
                Math.sin(((lat - coords[1]) * Math.PI) / 360) ** 2 +
                  Math.cos((lat * Math.PI) / 180) *
                    Math.cos((coords[1] * Math.PI) / 180) *
                    Math.sin(((lng - coords[0]) * Math.PI) / 360) ** 2,
              ),
            )
          : null;
      return {
        ...p,
        estimated: !boundary,
        inside: boundary ? contains(p.geometry, [lng, lat]) : false,
        km,
        accuracy,
        requiresConfirmation: true,
      };
    })
    .filter((p) => p.inside || (p.estimated && p.km <= 5))
    .sort(
      (a, b) =>
        Number(b.inside) - Number(a.inside) || (a.km || 0) - (b.km || 0),
    );
}
