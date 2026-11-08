import {
  careEnabled,
  careAccount,
  careError,
  safeResponse,
  bodyFor,
  rpc,
  isUuid,
  anonymousCareTest,
} from "@/lib/rental-care/server";
export async function GET(request) {
  try {
    if (!careEnabled()) return safeResponse({ enabled: false });
    if (await anonymousCareTest(request))
      return safeResponse({
        enabled: true,
        testMode: true,
        actor: null,
        registeredEmail: null,
        googleConfigured: false,
        preferences: { destination: "NONE", return_action: "KEEP" },
        connections: [],
        events: [],
      });
    const { profile, authUser, db, testMode } = await careAccount(request);
    const [pref, connections, events] = await Promise.all([
      db
        .from("rc_preferences")
        .select("*")
        .eq("profile_id", profile.id)
        .maybeSingle(),
      db
        .from("rc_connections")
        .select(
          "id,provider,device_id,calendar_id,calendar_name,email,status,last_error,last_sync_at,consented_at",
        )
        .eq("profile_id", profile.id)
        .neq("status", "DISCONNECTED")
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("rc_calendar_events")
        .select(
          "id,status,synced_revision,desired_revision,last_error,connection_id",
        )
        .in(
          "connection_id",
          (
            await db
              .from("rc_connections")
              .select("id")
              .eq("profile_id", profile.id)
          ).data?.map((c) => c.id) || [],
        )
        .limit(100),
    ]);
    if (pref.error || connections.error || events.error)
      throw Error("STORAGE_UNAVAILABLE");
    return safeResponse({
      enabled: true,
      actor: profile.id,
      registeredEmail: authUser.email || null,
      emailVerified: !!authUser.email_confirmed_at,
      preferences: pref.data || { destination: "NONE", return_action: "KEEP" },
      connections: connections.data,
      events: events.data,
      testMode: !!testMode,
      googleConfigured:
        !!process.env.RELOO_CALENDAR_CLIENT_ID &&
        !!process.env.RELOO_CALENDAR_CLIENT_SECRET,
    });
  } catch (e) {
    return careError(e);
  }
}
export async function POST(request) {
  try {
    if (!careEnabled()) throw Error("CALENDAR_NOT_CONFIGURED");
    const account = await careAccount(request),
      { profile, authUser, db } = account,
      b = await bodyFor(request, account);
    if (b.action === "onboarding") {
      const r = await db.from("rc_preferences").upsert(
        {
          profile_id: profile.id,
          onboarding_seen_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" },
      );
      if (r.error) throw Error("STORAGE_UNAVAILABLE");
    } else if (b.action === "preferences") {
      if (
        !["KEEP", "DELETE"].includes(b.returnAction) ||
        !["vi-VN", "en-US"].includes(b.locale)
      )
        throw Error("INVALID_INPUT");
      const r = await db.from("rc_preferences").upsert(
        {
          profile_id: profile.id,
          return_action: b.returnAction,
          locale: b.locale,
        },
        { onConflict: "profile_id" },
      );
      if (r.error) throw Error("STORAGE_UNAVAILABLE");
    } else if (b.action === "device") {
      if (
        !isUuid(b.device) ||
        typeof b.calendar !== "string" ||
        !b.calendar ||
        b.calendar.length > 300 ||
        typeof b.name !== "string" ||
        b.name.length > 100 ||
        b.independent !== true
      )
        throw Error("INVALID_INPUT");
      const id = await rpc(db, "reloo_rc_device", {
        p_actor: profile.id,
        p_device: b.device,
        p_calendar: b.calendar,
        p_name: b.name,
        p_confirm: b.confirmSwitch === true,
      });
      return safeResponse({ ok: true, id });
    } else if (b.action === "devicePermission") {
      if (!isUuid(b.device) || b.granted !== false)
        throw Error("INVALID_INPUT");
      await rpc(db, "reloo_rc_permission_lost", {
        p_actor: profile.id,
        p_device: b.device,
      });
    } else if (b.action === "claim") {
      if (!isUuid(b.device)) throw Error("INVALID_INPUT");
      return safeResponse({
        jobs: await rpc(db, "reloo_rc_claim", {
          p_actor: profile.id,
          p_device: b.device,
        }),
      });
    } else if (b.action === "ack") {
      if (
        !isUuid(b.id) ||
        !isUuid(b.lease) ||
        !Number.isInteger(b.revision) ||
        b.revision < 1 ||
        !["SYNCED", "FAILED", "REAUTH", "REVIEW"].includes(b.result) ||
        typeof b.remote !== "string" ||
        b.remote.length > 1024
      )
        throw Error("INVALID_INPUT");
      await rpc(db, "reloo_rc_ack", {
        p_actor: profile.id,
        p_id: b.id,
        p_lease: b.lease,
        p_revision: b.revision,
        p_remote: b.remote,
        p_result: b.result,
      });
    } else if (["activate", "disconnect", "retry"].includes(b.action)) {
      if (!isUuid(b.id)) throw Error("INVALID_INPUT");
      const row = await db
        .from("rc_connections")
        .select("*")
        .eq("id", b.id)
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (row.error || !row.data) throw Error("FORBIDDEN");
      if (b.action === "activate") {
        if (b.dual === true && b.confirmDual !== true)
          throw Error("DESTINATION_CONFIRMATION_REQUIRED");
        const previous = await db
          .from("rc_connections")
          .select("id,provider")
          .eq("profile_id", profile.id)
          .eq("status", "ACTIVE")
          .neq("id", b.id);
        if (previous.error) throw Error("STORAGE_UNAVAILABLE");
        if (
          previous.data?.some(
            (c) => c.provider !== row.data.provider || c.provider === "GOOGLE",
          ) &&
          b.confirmSwitch !== true &&
          b.dual !== true
        )
          throw Error("DESTINATION_CONFIRMATION_REQUIRED");
        await rpc(db, "reloo_rc_activate", {
          p_actor: profile.id,
          p_connection: b.id,
          p_confirm_other: b.confirmOther === true,
          p_current_email: authUser.email || "",
          p_email_verified: !!authUser.email_confirmed_at,
          p_dual: b.dual === true,
          p_locale: ["vi-VN", "en-US"].includes(b.locale) ? b.locale : null,
        });
      } else if (b.action === "disconnect") {
        const r = await db
          .from("rc_connections")
          .update({
            status: "DISCONNECTED",
            credentials_encrypted: null,
            version: row.data.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", b.id)
          .eq("profile_id", profile.id);
        if (r.error) throw Error("STORAGE_UNAVAILABLE");
      } else {
        if (row.data.status === "REAUTH") throw Error("REAUTH");
        const r = await db
          .from("rc_connections")
          .update({
            status: row.data.calendar_id ? "ACTIVE" : "PROVISIONING",
            next_run: new Date().toISOString(),
            lease_until: null,
          })
          .eq("id", b.id)
          .eq("profile_id", profile.id);
        if (r.error) throw Error("STORAGE_UNAVAILABLE");
        const e = await db
          .from("rc_calendar_events")
          .update({
            status: "QUEUED",
            attempts: 0,
            next_run: new Date().toISOString(),
          })
          .eq("connection_id", b.id)
          .in("status", ["FAILED", "REVIEW"]);
        if (e.error) throw Error("STORAGE_UNAVAILABLE");
      }
    } else throw Error("INVALID_INPUT");
    return safeResponse({ ok: true });
  } catch (e) {
    return careError(e);
  }
}
