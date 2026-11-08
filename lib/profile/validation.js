import {validatePrivateLocation} from '../maps/precise-location.js';
export function normalizedHolderName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function holderNamesMatch(declared, identity) {
  const a = normalizedHolderName(declared),
    b = normalizedHolderName(identity);
  return a.length >= 3 && a === b;
}
export async function validateAddress(input, catalog) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("ADDRESS_INVALID");
  const province = (await catalog.provinces()).find(
    (p) => String(p.code) === String(input.province?.code),
  );
  if (!province) throw new Error("PROVINCE_REQUIRED");
  const ward = (await catalog.wards(province.code)).find(
    (w) => String(w.code) === String(input.ward?.code),
  );
  if (!ward) throw new Error("WARD_REQUIRED");
  const result = {
    province: { code: province.code, name: province.name },
    ward: { code: ward.code, name: ward.name },
  };
  for (const key of ["house", "street", "hamlet", "note"]) {
    if (
      typeof input[key] !== "string" ||
      input[key].length > (key === "note" ? 300 : 120)
    )
      throw new Error("ADDRESS_INVALID");
    result[key] = input[key].trim();
  }
  if (!result.house || !result.street)
    throw new Error("ADDRESS_DETAIL_REQUIRED");
  if (!["HOME", "OFFICE"].includes(input.type))
    throw new Error("ADDRESS_INVALID");
  result.type = input.type;
  if(input.preciseLocation!==undefined&&input.preciseLocation!==null)result.preciseLocation=validatePrivateLocation(input.preciseLocation);
  return result;
}
export function addressText(address) {
  return [
    address.house,
    address.street,
    address.hamlet,
    address.ward?.name,
    address.province?.name,
  ]
    .filter(Boolean)
    .join(", ");
}
