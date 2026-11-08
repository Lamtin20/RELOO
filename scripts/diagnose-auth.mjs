import { resolve } from "node:path";
import { lookup } from "node:dns/promises";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(resolve(".env.local"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
const adminKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
function projectRef(key) {
  try {
    const ref = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString(),
    ).ref;
    return /^[a-z0-9]{10,40}$/.test(ref) ? ref : null;
  } catch {
    return null;
  }
}
const host = url ? new URL(url).hostname : null;
const publicRef = projectRef(publicKey || ""),
  adminRef = projectRef(adminKey || "");
console.log(
  JSON.stringify({
    configuredHost: host,
    publicProjectRef: publicRef,
    adminProjectRef: adminRef,
    keysAgree: publicRef && adminRef ? publicRef === adminRef : null,
  }),
);
const candidates = new Set(url ? [url] : []);
if (publicRef && publicRef === adminRef)
  candidates.add(`https://${publicRef}.supabase.co`);
for (const base of candidates) {
  const hostname = new URL(base).hostname;
  try {
    await lookup(hostname);
  } catch (error) {
    console.log(
      JSON.stringify({ host: hostname, dns: false, errorCode: error.code }),
    );
    continue;
  }
  try {
    const response = await fetch(new URL("/auth/v1/settings", base), {
      headers: { apikey: publicKey },
      signal: AbortSignal.timeout(12000),
    });
    const settings = await response.json();
    console.log(
      JSON.stringify({
        host: hostname,
        authStatus: response.status,
        google: settings.external?.google === true,
        email: settings.external?.email,
        signupDisabled: settings.disable_signup,
      }),
    );
    const client = createClient(base, adminKey || publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (resource, options) =>
          fetch(resource, { ...options, signal: AbortSignal.timeout(12000) }),
      },
    });
    for (const table of [
      "profiles",
      "phone_risk_signals",
      "phone_screening_checks",
      "risk_cases",
      "security_audit",
    ]) {
      const { error, count } = await client
        .from(table)
        .select("id", { count: "exact" })
        .limit(0);
      console.log(
        JSON.stringify({
          host: hostname,
          table,
          ok: !error && Number.isInteger(count),
          errorCode: error?.code || null,
        }),
      );
    }
  } catch (error) {
    console.log(
      JSON.stringify({
        host: hostname,
        available: false,
        errorCode: error.cause?.code || error.code || error.name,
      }),
    );
  }
}
