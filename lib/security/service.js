import { createHmac, randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "../supabase/admin.js";
import { aggregateScreening, normalizePhone } from "./rules.js";
import { HttpError, clientIp } from "../server/http.js";

export function securityDb() {
  const db = createSupabaseAdminClient();
  if (!db)
    throw new HttpError(
      503,
      "Hệ thống tài khoản chưa được cấu hình.",
      "AUTH_NOT_CONFIGURED",
    );
  return db;
}

export function ipHash(request) {
  const ip = clientIp(request);
  if (!ip) return null;
  const key =
    process.env.SECURITY_IP_HASH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createHmac("sha256", key).update(`reloo-ip:${ip}`).digest("hex");
}

export async function screenPhone(rawPhone, db = securityDb()) {
  const phone = normalizePhone(rawPhone);
  if (!phone)
    throw new HttpError(
      400,
      "Số điện thoại Việt Nam không hợp lệ.",
      "INVALID_PHONE",
    );
  const { data, error } = await db
    .from("phone_risk_signals")
    .select("id,source,evidence_url,evidence_note,expires_at,created_at")
    .eq("phone", phone)
    .eq("enabled", true);
  const results = [
    {
      source: "reloo_reviewed_reports",
      status: error ? "UNAVAILABLE" : "UNKNOWN",
      reason: error
        ? "Kho bằng chứng chưa truy cập được. Chưa đủ dữ liệu để kết luận."
        : "Kho phản ánh nội bộ không bao quát tất cả nguồn cảnh báo.",
      checkedAt: new Date().toISOString(),
    },
    {
      source: "checkscam",
      status: "UNAVAILABLE",
      reason:
        "Chưa có hợp đồng và thông tin API được cấp phép cho nguồn CheckScam.",
      sourceUrl: "https://checkscam.vn/",
    },
    {
      source: "chongluadao",
      status: "UNKNOWN",
      reason:
        "Chưa xác minh được API tra cứu số điện thoại; dữ liệu website độc hại không đủ để kết luận về số điện thoại.",
      sourceUrl: "https://chongluadao.vn/",
    },
  ];
  for (const signal of data || [])
    results.push({
      source: "reviewed_evidence",
      origin: signal.source,
      status: "MATCH",
      expiresAt: signal.expires_at,
      checkedAt: new Date().toISOString(),
      evidence: [
        { id: signal.id, url: signal.evidence_url, note: signal.evidence_note },
      ],
      complete: false,
    });
  return {
    ...aggregateScreening(results),
    phone,
    checkedAt: new Date().toISOString(),
  };
}

export async function storeScreening(profileId, screening, request) {
  const { data, error } = await securityDb().rpc("reloo_record_screening", {
    p_profile_id: profileId,
    p_status: screening.status,
    p_results: screening.results,
    p_ip_hash: ipHash(request),
  });
  if (error)
    throw new HttpError(
      503,
      "Chưa lưu được hồ sơ xác minh. Tài khoản chưa được kích hoạt.",
      "SCREENING_WRITE_FAILED",
    );
  return data;
}

export async function writeAudit({ actorId, subjectId, action, details = {} }) {
  const { error } = await securityDb().from("security_audit").insert({
    id: randomUUID(),
    actor_id: actorId,
    subject_id: subjectId,
    action,
    details,
  });
  if (error)
    throw new HttpError(
      503,
      "Chưa lưu được nhật ký kiểm toán.",
      "AUDIT_UNAVAILABLE",
    );
}
