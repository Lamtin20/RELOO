import {
  getGoshipAccessToken,
  getGoshipApiBaseUrl,
  isGoshipConfigured,
} from "./env";

export class GoshipError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "GoshipError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Gọi Goship API với Bearer token
 */
export async function goshipRequest(path, options = {}) {
  if (!isGoshipConfigured()) {
    throw new GoshipError("Chưa cấu hình GOSHIP_ACCESS_TOKEN", { status: 503 });
  }

  const base = getGoshipApiBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${getGoshipAccessToken()}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  let body = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!res.ok || body?.status === "error") {
    throw new GoshipError(
      body?.data?.error || body?.message || `Goship API lỗi (${res.status})`,
      { status: res.status, body },
    );
  }

  return body;
}

export async function fetchGoshipCities() {
  const res = await goshipRequest("/cities");
  return res?.data ?? [];
}

export async function fetchGoshipDistrictsByCity(cityCode) {
  const res = await goshipRequest(`/cities/${encodeURIComponent(cityCode)}/districts`);
  return res?.data ?? [];
}

export async function fetchGoshipWardsByDistrict(districtCode) {
  const res = await goshipRequest(`/districts/${encodeURIComponent(districtCode)}/wards`);
  return res?.data ?? [];
}

/**
 * Tra cứu biểu phí vận chuyển
 * @see https://doc.goship.io/getting-started/introduction
 */
export async function fetchGoshipRates({ addressFrom, addressTo, parcel }) {
  const res = await goshipRequest("/rates", {
    method: "POST",
    body: JSON.stringify({
      shipment: {
        address_from: {
          city: String(addressFrom.city),
          district: String(addressFrom.district),
          ward: String(addressFrom.ward),
        },
        address_to: {
          city: String(addressTo.city),
          district: String(addressTo.district),
          ward: String(addressTo.ward),
        },
        parcel: {
          cod: String(parcel.cod ?? 0),
          amount: String(parcel.amount ?? parcel.amout ?? 0),
          weight: String(parcel.weight ?? 500),
          width: String(parcel.width ?? 20),
          height: String(parcel.height ?? 15),
          length: String(parcel.length ?? 25),
        },
      },
    }),
  });
  return res?.data ?? [];
}
