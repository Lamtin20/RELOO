import {assertIdentity,requireProfileIdentity} from '@/lib/security/identity';
import {linkRentalMeasurement} from '@/lib/analytics/order-link';
import {withinRentalWindow} from '@/lib/rental-window';
import {RENTAL_RETURN_POLICY,rentalReturnCopy,rentalLateReturnFee} from '@/lib/rental-return-policy';
import { randomUUID } from "node:crypto";
import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import { currentLegal } from "@/lib/legal/current";
import { publicBusiness } from "@/lib/operations/settings";
import { vnd } from "@/lib/finance/money";
import { rentalRecord, rentalHistory } from "@/lib/assurance/rental";
import {requireSmartKey} from '@/lib/security/smart-key';
const ACTIONS = [
  "ACCEPTED",
  "HANDOVER_CONFIRMED",
  "RETURN_CONFIRMED",
  "CANCELLED",
  "DISPUTED",
];
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false }),
      threadId = new URL(request.url).searchParams.get("thread");
    const queries = ["lender_id", "renter_id"].map((column) => {
      let query = db
        .from("rental_agreements")
        .select("*")
        .eq(column, profile.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (threadId) query = query.eq("thread_id", threadId);
      return query;
    });
    const results = await Promise.all(queries);
    if (results.some((result) => result.error))
      throw new Error("RENTAL_STORAGE_UNAVAILABLE");
    const agreements = [
      ...new Map(
        results.flatMap((result) => result.data).map((item) => [item.id, item]),
      ).values(),
    ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const histories = await Promise.all(
      agreements.map(async (item) => {
        const { agreement, ...history } = await rentalHistory(db, item);
        return {
          ...agreement,
          rent_amount: String(agreement.rent_amount),
          ...history,
        };
      }),
    );
    const terms = await currentLegal(db, "rental-guide");
    return Response.json(
      { ok: true, agreements: histories, termsReady: terms && !terms.draft },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "rental-write", 10);
    const account = await requireAccount(request, {
        scope: "inquiry_write",
      }),
      {profile,db}=account,
      input = await readJson(request);
    if (!/^[a-f0-9-]{36}$/i.test(input.requestId || ""))
      throw new HttpError(400, "Thiếu mã thao tác.");
    if(['PROPOSED','ACCEPTED','HANDOVER_CONFIRMED'].includes(input.action))assertIdentity(profile.identityStatus);
    if (input.action === "PROPOSED") {
      if(input.returnPolicyVersion!==RENTAL_RETURN_POLICY.version)throw new HttpError(409,'Vui lòng xem lại quy tắc trả đồ trước khi đề xuất.','RETURN_POLICY_CHANGED');
      const starts = Date.parse(input.startsAt),
        ends = Date.parse(input.endsAt);
      if (
        typeof input.threadId !== "string" ||
        input.threadId.length > 200 ||
        !Number.isFinite(starts) ||
        !Number.isFinite(ends) ||
        !withinRentalWindow(starts,ends) ||
        typeof input.terms !== "string" ||
        input.terms.trim().length < 20 ||
        input.terms.length > 2000 ||
        input.agreed !== true
      )
        throw new HttpError(
          400,
          "Cần xác nhận thời gian, giá và điều kiện giao nhận.",
        );
      let amount;
      try {
        amount = String(vnd(input.rentAmount, { positive: true }));
      } catch {
        throw new HttpError(400, "Giá thuê cần là số nguyên VND hợp lệ.");
      }
      const [legal, business] = await Promise.all([
        currentLegal(db, "rental-guide"),
        publicBusiness(db),
      ]);
      if (!legal || legal.draft)
        throw new HttpError(
          409,
          "Thỏa thuận mẫu chưa được đơn vị vận hành ban hành. Hai bên vẫn có thể trao đổi qua tin nhắn.",
          "LEGAL_NOT_READY",
        );
      const thread=await db.from('chat_threads').select('lender_id,buyer_id').eq('id',input.threadId).maybeSingle();
      if(thread.error||!thread.data||![thread.data.lender_id,thread.data.buyer_id].includes(profile.id))throw new HttpError(404,'Không tìm thấy cuộc trao đổi của bạn.');
      await requireProfileIdentity(db,thread.data.lender_id===profile.id?thread.data.buyer_id:thread.data.lender_id,{other:true});
      const id = randomUUID(),
        data = {
          threadId: input.threadId,
          startsAt: new Date(starts).toISOString(),
          endsAt: new Date(ends).toISOString(),
          rentAmount: amount,
          terms: input.terms.trim()+'\n\n'+rentalReturnCopy['vi-VN'],
          returnPolicy:{...RENTAL_RETURN_POLICY},
          rentalDays:Math.ceil((ends-starts)/86400000),
          legalHash: legal.hash,
          policyVersion: business.version,
          requestId: input.requestId,
        };
      const record = rentalRecord(
          { id, sequence: 0, head_hash: "0".repeat(64) },
          profile.id,
          "PROPOSED",
          data,
        ),
        result = await db.rpc("reloo_propose_rental", {
          p_actor: profile.id,
          p_id: id,
          p_data: data,
          p_record: record,
        });
      if (result.error)
        throw new HttpError(
          409,
          "Chưa tạo được thỏa thuận. Kiểm tra cuộc trao đổi, trạng thái hai bên và phiên bản điều kiện.",
        );
      await linkRentalMeasurement(request,db,profile.id,"AGREEMENT",result.data);
      return Response.json({ ok: true, id: result.data }, { status: 201 });
    }
    if (
      !ACTIONS.includes(input.action) ||
      !/^[a-f0-9-]{36}$/i.test(input.id || "")
    )
      throw new HttpError(400, "Thao tác thỏa thuận không hợp lệ.");
    const smartReceipt=await requireSmartKey(request,account);
    const { data: item, error } = await db
      .from("rental_agreements")
      .select("*")
      .eq("id", input.id)
      .single();
    if (error || ![item.lender_id, item.renter_id].includes(profile.id))
      throw new HttpError(404, "Không tìm thấy thỏa thuận của bạn.");
    if(['ACCEPTED','HANDOVER_CONFIRMED'].includes(input.action))await requireProfileIdentity(db,item.lender_id===profile.id?item.renter_id:item.lender_id,{other:true});
    const history = await rentalHistory(db, item);
    if (!history.integrity.ok)
      throw new HttpError(
        409,
        "Lịch sử đang cần đối chiếu toàn vẹn. Hãy gửi yêu cầu hỗ trợ.",
        "HISTORY_INTEGRITY_FAILED",
      );
    const returnedAt=input.action==='RETURN_CONFIRMED'?(history.events.find(event=>event.event==='RETURN_CONFIRMED')?.created_at||new Date().toISOString()):null;
    const returnAssessment=returnedAt&&history.returnPolicy?rentalLateReturnFee({dueAt:item.ends_at,returnedAt,rent:Number(item.rent_amount),rentalDays:Math.ceil((Date.parse(item.ends_at)-Date.parse(item.starts_at))/86400000),policy:history.returnPolicy}):null;
    const record = rentalRecord(history.agreement, profile.id, input.action, {
        agreementId: item.id,
        requestId: input.requestId,
        ...(returnAssessment?{returnedAt,returnAssessment}:{}),
      }),
      result = await db.rpc("reloo_confirm_rental", {
        p_receipt:smartReceipt.id,
        p_actor: profile.id,
        p_id: item.id,
        p_action: input.action,
        p_request: input.requestId,
        p_record: record,
      });
    if (result.error)
      throw new HttpError(
        409,
        "Thỏa thuận đã thay đổi hoặc chưa đủ điều kiện thực hiện bước này. Hãy tải lại.",
      );
    return Response.json({ ok: true, status: result.data });
  } catch (cause) {
    return errorResponse(cause);
  }
}
