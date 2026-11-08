import { decryptPrivate } from "../operations/crypto.js";
import { googleCalendar, refreshCalendarToken } from "./calendar.js";
export async function processRentalCalendars(
  db,
  { provider = googleCalendar(), refresh = refreshCalendarToken } = {},
) {
  const recovery = await db
    .from("rc_connections")
    .select("id,profile_id")
    .eq("provider", "GOOGLE")
    .eq("status", "ACTIVE")
    .eq("needs_backfill", true)
    .limit(10);
  if (recovery.error) throw Error("CALENDAR_STORAGE_UNAVAILABLE");
  for (const c of recovery.data || []) {
    const r = await db.rpc("reloo_rc_backfill", {
      p_actor: c.profile_id,
      p_connection: c.id,
    });
    if (r.error) throw Error("CALENDAR_BACKFILL_FAILED");
  }
  const pending = await db
    .from("rc_connections")
    .select("*")
    .eq("provider", "GOOGLE")
    .eq("status", "PROVISIONING")
    .lte("next_run", new Date().toISOString())
    .limit(5);
  if (pending.error) throw Error("CALENDAR_STORAGE_UNAVAILABLE");
  for (const c of pending.data || []) {
    if (c.lease_until && Date.parse(c.lease_until) > Date.now()) continue;
    const lease = await db
      .from("rc_connections")
      .update({
        lease_until: new Date(Date.now() + 120000).toISOString(),
        version: c.version + 1,
      })
      .eq("id", c.id)
      .eq("version", c.version)
      .eq("status", "PROVISIONING")
      .select("id");
    if (lease.error || lease.data?.length !== 1) continue;
    try {
      const token = await refresh(
        JSON.parse(decryptPrivate(c.credentials_encrypted)),
      );
      let calendar = null,
        knownDeleted = false;
      if (c.calendar_id) {
        calendar = await provider.getCalendar(token, c.calendar_id);
        if (calendar && calendar.description !== "RELOO:" + c.id)
          throw Error("CALENDAR_REVIEW");
        if (!calendar) {
          knownDeleted = true;
          const cleared = await db
            .from("rc_connections")
            .update({ calendar_id: null, provision_attempted: false })
            .eq("id", c.id)
            .eq("version", c.version + 1)
            .eq("status", "PROVISIONING")
            .select("id");
          if (cleared.error || !cleared.data?.length) continue;
        }
      }
      calendar ||= await provider.findCalendar(token, c.id);
      if (!calendar) {
        if (c.provision_attempted && !knownDeleted)
          throw Error("CALENDAR_REVIEW");
        const attempted = await db
          .from("rc_connections")
          .update({ provision_attempted: true })
          .eq("id", c.id)
          .eq("version", c.version + 1)
          .eq("status", "PROVISIONING")
          .select("id");
        if (attempted.error || !attempted.data?.length) continue;
        try {
          calendar = await provider.createCalendar(token, c.id);
        } catch (e) {
          if (e.status >= 400 && e.status < 500 && e.status !== 409) {
            await db
              .from("rc_connections")
              .update({ provision_attempted: false })
              .eq("id", c.id)
              .eq("version", c.version + 1);
            throw e;
          }
          throw Error("CALENDAR_REVIEW");
        }
      }
      if (!calendar?.id) throw Error("CALENDAR_REVIEW");
      const saved = await db
        .from("rc_connections")
        .update({
          calendar_id: calendar.id,
          calendar_name: "RELOO",
          status: "ACTIVE",
          lease_until: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", c.id)
        .eq("version", c.version + 1)
        .eq("status", "PROVISIONING")
        .select("id");
      if (saved.error) throw Error("CALENDAR_STORAGE_UNAVAILABLE");
      if (saved.data?.length) {
        const result = await db.rpc("reloo_rc_backfill", {
          p_actor: c.profile_id,
          p_connection: c.id,
        });
        if (result.error) throw Error("CALENDAR_BACKFILL_FAILED");
      }
    } catch (e) {
      await db
        .from("rc_connections")
        .update({
          status: ["REAUTH", "CALENDAR_PERMISSION"].includes(e.message)
            ? "REAUTH"
            : e.message === "CALENDAR_REVIEW"
              ? "REVIEW"
              : "FAILED",
          last_error: ["REAUTH", "CALENDAR_REVIEW"].includes(e.message)
            ? e.message
            : "CALENDAR_FAILED",
          lease_until: null,
        })
        .eq("id", c.id)
        .eq("status", "PROVISIONING");
    }
  }
  const claims = await db.rpc("reloo_rc_claim", {
    p_actor: null,
    p_device: null,
  });
  if (claims.error) throw Error("CALENDAR_STORAGE_UNAVAILABLE");
  for (const job of claims.data || []) {
    let remote = job.remoteId || "",
      result = "SYNCED";
    try {
      const current = await db
        .from("rc_connections")
        .select("*")
        .eq("id", job.connection)
        .eq("profile_id", job.profile)
        .eq("status", "ACTIVE")
        .maybeSingle();
      if (current.error || !current.data) throw Error("CALENDAR_REVIEW");
      const pref = await db
        .from("rc_preferences")
        .select("locale,destination")
        .eq("profile_id", job.profile)
        .maybeSingle();
      if (pref.error || !["GOOGLE", "BOTH"].includes(pref.data?.destination))
        throw Error("CALENDAR_REVIEW");
      const token = await refresh(
        JSON.parse(decryptPrivate(current.data.credentials_encrypted)),
      );
      remote = await provider.sync(token, job, pref.data.locale);
    } catch (e) {
      result = ["REAUTH", "CALENDAR_PERMISSION"].includes(e.message)
        ? "REAUTH"
        : e.message === "CALENDAR_REVIEW"
          ? "REVIEW"
          : "FAILED";
    }
    const ack = await db.rpc("reloo_rc_ack", {
      p_actor: job.profile,
      p_id: job.id,
      p_lease: job.lease,
      p_revision: job.revision,
      p_remote: remote,
      p_result: result,
    });
    if (ack.error) throw Error("CALENDAR_RECEIPT_UNAVAILABLE");
  }
  return { processed: claims.data?.length || 0 };
}
