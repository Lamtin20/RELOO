import { requirePermission } from "@/lib/operations/permissions";
import { errorResponse } from "@/lib/server/http";
import { decryptPrivate } from "@/lib/operations/crypto";
import { lookupLinks } from "@/lib/security/identifiers";
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "risk.read");
    const { data, error } = await db.from("risk_cases").select("*,profiles!risk_cases_profile_id_fkey(name,phone,activation_status),risk_evidence(*),risk_appeals(*)").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error("Risk storage unavailable");
    const profileIds = [...new Set(data.map((item) => item.profile_id))];
    let identifiers = [];
    if (profileIds.length) {
      const result = await db.from('risk_identifiers').select('id,profile_id,kind,bank_code,masked_value,status,source_results,checked_at,expires_at,value_encrypted').in('profile_id', profileIds);
      if (result.error) throw new Error('Screening evidence unavailable');
      identifiers = result.data.map(({ value_encrypted, ...item }) => ({ ...item, links: lookupLinks(item.kind, decryptPrivate(value_encrypted)) }));
    }
    return Response.json({ ok: true, cases: data.map((item) => ({ ...item, identifiers: identifiers.filter((identifier) => identifier.profile_id === item.profile_id) })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
