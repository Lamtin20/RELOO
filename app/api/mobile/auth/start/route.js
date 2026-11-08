import { securityDb } from "@/lib/security/service";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import { mobileNext } from "@/lib/mobile/validation";
import {authenticatedIdentity} from '@/lib/auth/identity';
export async function GET(request){try{const {authUser}=await authenticatedIdentity(request),id=new URL(request.url).searchParams.get('flow');const r=await securityDb().from('mobile_auth_flows').select('expected_user_id').eq('id',id).gt('expires_at',new Date().toISOString()).is('consumed_at',null).single();return Response.json({ok:!r.error,allowed:!r.error&&(!r.data.expected_user_id||r.data.expected_user_id===authUser.id)},{headers:{'Cache-Control':'private,no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "native-auth-start", 10);
    const input = await readJson(request);
    if (!/^[a-f0-9]{64}$/.test(input.challenge || ""))
      throw new HttpError(400, "Phiên ứng dụng không hợp lệ.");
    const expected=input.enroll===true?(await authenticatedIdentity(request)).authUser.id:null;
    const result = await securityDb()
      .from("mobile_auth_flows")
      .insert({
        challenge: input.challenge,
        expected_user_id:expected,
        next_path: mobileNext(input.next),
        intent: ["both", "lender", "renter"].includes(input.intent)
          ? input.intent
          : "both",
      })
      .select("id")
      .single();
    if (result.error) throw result.error;
    return Response.json(
      {
        ok: true,
        flow: result.data.id,
        url:
          (process.env.APP_ORIGIN || "https://reloo.vn") +
          "/mobile/auth?flow=" +
          result.data.id,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
