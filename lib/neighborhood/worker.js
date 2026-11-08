import { EVENTS, text } from "./content.js";
import { fetchPartnerFeed } from "./providers.js";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
export async function deliverNeighborhood(db, { now = new Date() } = {}) {
  const maintenance = await db.rpc("reloo_neighborhood_maintenance");
  if (maintenance.error) throw Error("NEIGHBORHOOD_MAINTENANCE_UNAVAILABLE");
  const due = await db
    .from("nk_outbox")
    .select("id,event,aggregate_id,recipient_id,attempts")
    .eq("status", "QUEUED")
    .lte("available_at", now.toISOString())
    .order("priority")
    .order("created_at")
    .limit(30);
  if (due.error) throw Error("NEIGHBORHOOD_OUTBOX_UNAVAILABLE");
  for (const e of due.data || []) {
    try {
      const meta = EVENTS[e.event];
      if (!meta) throw Error("EVENT_UNKNOWN");
      const pref = await db
        .from("nk_preferences")
        .select("locale")
        .eq("profile_id", e.recipient_id)
        .maybeSingle();
      if (pref.error) throw Error("PREFERENCES_UNAVAILABLE");
      const locale = pref.data?.locale || "vi-VN";
      const target = meta.deepLink.replace(
        "{aggregateId}",
        encodeURIComponent(e.aggregate_id),
      );
      const r = await db.rpc("reloo_neighborhood_deliver", {
        p_id: e.id,
        p_title: text(locale, meta.title),
        p_body: text(locale, meta.body),
        p_link: target,
        p_now: now.toISOString(),
      });
      if (r.error) throw Error("DELIVERY_TRANSACTION_FAILED");
    } catch (err) {
      const attempts = e.attempts + 1;
      await db
        .from("nk_outbox")
        .update({
          attempts,
          status: attempts >= 5 ? "DEAD" : "QUEUED",
          available_at: new Date(
            +now + Math.min(3600, 30 * 2 ** attempts) * 1000,
          ).toISOString(),
          last_error: /^[A-Z_]+$/.test(err.message)
            ? err.message
            : "DELIVERY_UNAVAILABLE",
        })
        .eq("id", e.id)
        .eq("status", "QUEUED");
    }
  }
  return { processed: due.data?.length || 0 };
}
export async function purgeNeighborhoodEvidence(db) {
  const r = await db.rpc("reloo_neighborhood_claim_purge");
  if (r.error) throw Error("RETENTION_UNAVAILABLE");
  for (const e of r.data || []) {
    if (!/^[a-f0-9-]{36}\.enc$/i.test(e.filename))
      throw Error("EVIDENCE_PATH_INVALID");
    await unlink(
      join(
        process.env.RELOO_EVIDENCE_DIR || "data/private-evidence",
        "neighborhood",
        e.filename,
      ),
    ).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    const finished = await db.rpc("reloo_neighborhood_finish_purge", {
      p_id: e.id,
    });
    if (finished.error) throw Error("RETENTION_FINALIZE_UNAVAILABLE");
  }
}
export async function syncNeighborhoodSources(db) {
  const due = await db
    .from("nk_sources")
    .select("*")
    .eq("enabled", true)
    .eq("provider", "PARTNER_JSON")
    .lte("next_run", new Date().toISOString())
    .limit(2);
  if (due.error) throw Error("NEIGHBORHOOD_SOURCE_UNAVAILABLE");
  for (const source of due.data || []) {
    // An atomic lease prevents concurrent workers from fetching a paid/limited source twice.
    const lease = await db
      .from("nk_sources")
      .update({
        next_run: new Date(Date.now() + 15 * 60000).toISOString(),
        last_attempt: new Date().toISOString(),
      })
      .eq("id", source.id)
      .eq("next_run", source.next_run)
      .select("id");
    if (lease.error || !lease.data?.length) continue;
    const run = await db
      .from("nk_sync_runs")
      .insert({ source_id: source.id })
      .select("id")
      .single();
    if (run.error) continue;
    try {
      const rows = await fetchPartnerFeed(source);
      const staged = await db.rpc("reloo_neighborhood_stage", {
        p_source: source.id,
        p_rows: rows,
      });
      if (staged.error) throw Error("SOURCE_STAGE_FAILED");
      await db
        .from("nk_sources")
        .update({
          last_success: new Date().toISOString(),
          last_error: null,
          failures: 0,
          next_run: new Date(
            Date.now() + source.sync_minutes * 60000,
          ).toISOString(),
        })
        .eq("id", source.id);
      await db
        .from("nk_sync_runs")
        .update({
          status: "REVIEW",
          imported: staged.data,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.data.id);
    } catch (e) {
      const failures = source.failures + 1,
        code = /^[A-Z_]+$/.test(e.message) ? e.message : "SOURCE_UNAVAILABLE";
      await db
        .from("nk_sources")
        .update({
          failures,
          last_error: code,
          next_run: new Date(
            Date.now() +
              Math.max(
                source.sync_minutes,
                Math.min(1440, 15 * 2 ** Math.min(6, failures)),
              ) *
                60000,
          ).toISOString(),
        })
        .eq("id", source.id);
      await db
        .from("nk_sync_runs")
        .update({
          status: "FAILED",
          result_code: code,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.data.id);
    }
  }
}
