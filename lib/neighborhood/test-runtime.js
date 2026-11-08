// Isolated development harness. Never grants a production account or uses production data.
import { createHmac, timingSafeEqual } from "node:crypto";
import { resolve, sep } from "node:path";
import { readFile } from "node:fs/promises";
export function neighborhoodTestEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.RELOO_NEIGHBORHOOD_TEST_MODE === "1" &&
    process.env.RELOO_NEIGHBORHOOD_TEST_SECRET?.length >= 32
  );
}
export function localTestRequest(request) {
  return (
    neighborhoodTestEnabled() &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
  );
}
export const TEST_ACTORS = [
  "nk-test-renter",
  "nk-test-owner",
  "nk-test-admin",
  "nk-test-renter2",
  "nk-test-visitor",
];
const signature = (actor) =>
  createHmac("sha256", process.env.RELOO_NEIGHBORHOOD_TEST_SECRET)
    .update(actor)
    .digest("base64url");
export function testCookie(actor) {
  if (!neighborhoodTestEnabled() || !TEST_ACTORS.includes(actor))
    throw Error("FORBIDDEN");
  return actor + "." + signature(actor);
}
export async function testDatabase() {
  if (!neighborhoodTestEnabled()) throw Error("FORBIDDEN");
  const path = resolve(process.env.RELOO_NEIGHBORHOOD_TEST_DB || "");
  const root = resolve("output/neighborhood-test");
  if (!path.startsWith(root + sep)) throw Error("TEST_DATABASE_PATH_INVALID");
  if (!globalThis.__relooNeighborhoodDb) {
    globalThis.__relooNeighborhoodDb = (async () => {
      const { PGlite } = await import("@electric-sql/pglite");
      return new PGlite(path);
    })();
  }
  return globalThis.__relooNeighborhoodDb;
}
export async function testAccount(request) {
  if (!localTestRequest(request)) return null;
  const value = (request.headers.get("cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("reloo-nk-test="))
    ?.slice(14);
  const [actor, sig] = String(value || "").split(".");
  if (
    !TEST_ACTORS.includes(actor) ||
    !sig ||
    Buffer.byteLength(sig) !== Buffer.byteLength(signature(actor)) ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(signature(actor)))
  )
    return null;
  const db = await testDatabase();
  return {
    profile: { id: actor, name: actor },
    staff: { role: actor === "nk-test-admin" ? "admin" : "renter" },
    db: testDbFacade(db),
    testMode: true,
  };
}
export function testDbFacade(db) {
  return {
    async rpc(name, args = {}) {
      const orders = {
        reloo_home_preference:['p_actor','p_key','p_data'],
        reloo_neighborhood_quote_context:['p_actor','p_asset'],
        reloo_neighborhood_read: ["p_actor", "p_section", "p_filter"],
        reloo_neighborhood_action: ["p_actor", "p_key", "p_action", "p_data"],
        reloo_neighborhood_payment: [
          "p_provider",
          "p_event",
          "p_order",
          "p_status",
          "p_amount",
          "p_sequence",
          "p_fingerprint",
        ],
        reloo_neighborhood_maintenance: [],
        reloo_neighborhood_deliver: [
          "p_id",
          "p_title",
          "p_body",
          "p_link",
          "p_now",
        ],
        reloo_neighborhood_replay: [
          "p_actor",
          "p_key",
          "p_action",
          "p_fingerprint",
        ],
        reloo_neighborhood_evidence: [
          "p_actor",
          "p_id",
          "p_order",
          "p_filename",
          "p_action",
        ],
        reloo_neighborhood_admin_evidence: ["p_actor", "p_id"],
      };
      if (!orders[name]) return { error: { message: "RPC_NOT_ALLOWED" } };
      try {
        const keys = orders[name];
        const params = keys.map((k) =>
          typeof args[k] === "object" && args[k] !== null
            ? JSON.stringify(args[k])
            : args[k],
        );
        const r = await db.query(
          `select ${name}(${keys.map((_, i) => "$" + (i + 1)).join(",")}) result`,
          params,
        );
        return { data: r.rows[0].result, error: null };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    },
    from(table) {
      const readTables={verified_identities:['profile_id','expires_at','submission_id'],nk_listings:['asset_id','owner_id'],nk_orders:['id','owner_id','renter_id','starts_at','ends_at']};
      if(readTables[table]){
        let fields=[];const filters=[];
        const q={
          select(value){fields=value.split(',');if(fields.some(k=>!readTables[table].includes(k)))throw Error('TEST_COLUMN_NOT_SUPPORTED');return q;},
          eq(key,value){if(!readTables[table].includes(key))throw Error('TEST_COLUMN_NOT_SUPPORTED');filters.push([key,value]);return q;},
          async maybeSingle(){
            if(!filters.length||!fields.length)throw Error('TEST_FILTER_REQUIRED');
            try{const r=await db.query('select '+fields.join(',')+' from '+table+' where '+filters.map(([k],i)=>k+'=$'+(i+1)).join(' and ')+' limit 1',filters.map(([,v])=>v));return {data:r.rows[0]||null,error:null};}
            catch(error){return {data:null,error};}
          },
        };return q;
      }

      // Restricted facade for the existing WebP importer; no arbitrary table/SQL input.
      if (table !== "media_assets") throw Error("TEST_TABLE_NOT_SUPPORTED");
      let mode = "select",
        data = null,
        filter = {};
      const q = {
        insert(row) {
          mode = "insert";
          data = row;
          return q;
        },
        delete() {
          mode = "delete";
          return q;
        },
        select() {
          return q;
        },
        eq(k, v) {
          if (!["id", "created_by"].includes(k))
            throw Error("TEST_COLUMN_NOT_SUPPORTED");
          filter[k] = v;
          return q;
        },
        single: async () => {
          const r = await q;
          return { ...r, data: r.data?.[0] };
        },
        then(resolveResult, reject) {
          return (async () => {
            try {
              let r;
              if (mode === "insert") {
                const keys = Object.keys(data);
                if (
                  keys.some(
                    (k) =>
                      ![
                        "id",
                        "filename",
                        "mime",
                        "width",
                        "height",
                        "bytes",
                        "purpose",
                        "created_by",
                      ].includes(k),
                  )
                )
                  throw Error("TEST_COLUMN_NOT_SUPPORTED");
                r = await db.query(
                  `insert into media_assets(${keys.join(",")}) values(${keys.map((_, i) => "$" + (i + 1)).join(",")}) returning *`,
                  keys.map((k) => data[k]),
                );
              } else {
                const keys = Object.keys(filter);
                r = await db.query(
                  `${mode === "delete" ? "delete from" : "select * from"} media_assets${keys.length ? " where " + keys.map((k, i) => k + "=$" + (i + 1)).join(" and ") : ""}${mode === "delete" ? " returning *" : ""}`,
                  keys.map((k) => filter[k]),
                );
              }
              return { data: r.rows, error: null };
            } catch (e) {
              return { data: null, error: { message: e.message } };
            }
          })().then(resolveResult, reject);
        },
      };
      return q;
    },
  };
}
