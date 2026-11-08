import { isIP } from "node:net";
import { requireAccount } from "@/lib/security/authorization";
import { clientIp, errorResponse } from "@/lib/server/http";
import { encryptPrivate, privateHash } from "@/lib/operations/crypto";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    const ip = clientIp(request);
    if (!ip || !isIP(ip)) return Response.json({ ok: true, result: "UNKNOWN" });
    const hash = privateHash("NETWORK", ip);
    const deviceId = request.headers.get('x-reloo-device');
    if (/^[a-f0-9-]{36}$/i.test(deviceId || '')) {
      await db.from('account_access_devices').upsert({ profile_id: profile.id, device_hash: privateHash('DEVICE', deviceId), ip_hash: hash, observed_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() }, { onConflict: 'profile_id,device_hash' });
    }
    const { data, error } = await db.from("network_checks").select("result,expires_at").eq("ip_hash", hash).maybeSingle();
    if (error) throw new Error("Network evidence unavailable");
    if (data && Date.parse(data.expires_at) > Date.now()) return Response.json({ ok: true, result: data.result }, { headers: { "Cache-Control": "no-store" } });
    const prior = await db.from("automation_jobs").select("id").eq("kind", "CHECK_NETWORK").contains("payload", { ipHash: hash }).in("status", ["QUEUED", "RUNNING"]).limit(1);
    if (!prior.data?.length) await db.from("automation_jobs").insert({ kind: "CHECK_NETWORK", payload: { ipHash: hash, ipEncrypted: encryptPrivate(ip) }, created_by: profile.id });
    return Response.json({ ok: true, result: "UNKNOWN" });
  } catch (error) { return errorResponse(error); }
}
