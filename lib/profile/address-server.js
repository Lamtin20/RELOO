import {snapshotAddressCatalog} from './address-snapshot.js';
const cache = new Map();
async function catalog(path) {
  if(process.env.RELOO_ADDRESS_CATALOG_FILE)return snapshotAddressCatalog(process.env.RELOO_ADDRESS_CATALOG_FILE,path);
  const entry = cache.get(path);
  if (entry && entry.expires > Date.now()) return entry.data;
  const response = await fetch(`https://provinces.open-api.vn/api/v2/${path}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("ADDRESS_CATALOG_UNAVAILABLE");
  const data = await response.json();
  if (
    !Array.isArray(data) ||
    data.length > 4000 ||
    data.some((x) => !Number.isInteger(x.code) || typeof x.name !== "string")
  )
    throw new Error("ADDRESS_CATALOG_INVALID");
  cache.set(path, { data, expires: Date.now() + 86400000 });
  return data;
}
export const addressCatalog = {
  provinces: () => catalog("p/"),
  wards: (code) => catalog(`w/?province=${Number(code)}`),
};
