import { requireAccount, publicSession } from "@/lib/security/authorization";
import { lookupLinks, normalizeIdentifier } from "@/lib/security/identifiers";
import { privateHash, decryptPrivate } from "@/lib/operations/crypto";
import { errorResponse } from "@/lib/server/http";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    const { data: checks, error: checkError } = await db
      .from("phone_screening_checks")
      .select("id,result,source_results,checked_at")
      .eq("profile_id", profile.id)
      .order("checked_at", { ascending: false })
      .limit(1);
    const { data: cases, error: caseError } = await db
      .from("risk_cases")
      .select("id,reason,status,created_at,updated_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (checkError || caseError) throw new Error("Storage unavailable");
    const identifiers = await db.from('risk_identifiers').select('id,kind,value_hash,value_encrypted,masked_value,status,checked_at,expires_at').eq('profile_id', profile.id).order('checked_at', { ascending: false, nullsFirst: false });
    if (identifiers.error) throw new Error('Identity evidence unavailable');
    let currentPhone = null, links = null;
    if (profile.phone) {
      const { value } = normalizeIdentifier('PHONE', profile.phone);
      currentPhone = identifiers.data?.find((item) => item.kind === 'PHONE' && item.value_hash === privateHash('PHONE:', value));
      links = lookupLinks('PHONE', value);
    }
    let job = null;
    if (currentPhone) {
      const jobs = await db.from('automation_jobs').select('id,status,created_at').eq('kind', 'SCREEN_IDENTIFIER').contains('payload', { identifierId: currentPhone.id }).order('created_at', { ascending: false }).limit(1);
      if (jobs.error) throw new Error('Screening queue unavailable');
      if (jobs.data?.[0]) job = { ...jobs.data[0], retryAt: new Date(Date.parse(jobs.data[0].created_at) + 15 * 60000).toISOString() };
      if (currentPhone.checked_at) checks.unshift({ id: currentPhone.id, result: currentPhone.status, checked_at: currentPhone.checked_at });
    }
    const session = publicSession(profile);
    return Response.json(
      {
        ok: true,
        activation: session.activationStatus,
        screening: currentPhone?.checked_at
          ? Date.parse(currentPhone.expires_at || '') <= Date.now() ? 'STALE' : currentPhone.status
          : session.screeningStatus,
        validUntil: profile.screening_valid_until,
        verificationMethod: profile.verification_method,
        checks: (checks || []).map(({ id, result, checked_at }) => ({ id, result, checked_at })),
        cases: cases || [],
        warnings: (identifiers.data || []).filter(item => item.status === 'MATCH').map(item => ({ id:item.id,kind:item.kind,value:item.masked_value,checkedAt:item.checked_at,url:lookupLinks(item.kind, decryptPrivate(item.value_encrypted)).chongluadao })),
        job,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
