import { requireAccount } from "@/lib/security/authorization";
import {requireSmartKey} from '@/lib/security/smart-key';
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import { buildWallet } from "@/lib/finance/wallet-model";
import { verifyFinancialSource } from "@/lib/finance/verification";
import { verifyPromotionCredit } from "@/lib/promotions/server";
const uuid = (value) =>
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    value || "",
  );
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    const [available, banks] = await Promise.all([
      db.rpc("reloo_payout_available", { p_profile: profile.id }),
      db
        .from("profile_bank_accounts")
        .select("id,bank_name,masked_account,is_default,name_status")
        .eq("profile_id", profile.id)
        .order("is_default", { ascending: false }),
    ]);
    if (available.error || banks.error) throw new Error("PAYOUT_READ_FAILED");
    return Response.json(
      {
        ok: true,
        available: available.data,
        banks: banks.data,
        identityStatus: profile.identityStatus.status,
        automaticTransfers: false,
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "payout-request", 5);
    const account = await requireAccount(request, { scope: "payout" }),{profile,db}=account,
      input = await readJson(request);
    if (
      !uuid(input.bankId) ||
      !uuid(input.requestKey) ||
      !["BANK", "RENTAL", "DEPOSIT", "REFUND", "SHOPEE", "TIKTOK"].includes(
        input.source,
      ) ||
      typeof input.amount !== "string" ||
      !/^\d{1,16}$/.test(input.amount || "") ||
      BigInt(input.amount) <= 0n ||
      BigInt(input.amount) > 9007199254740991n
    )
      throw new HttpError(400, "Chọn nguồn tiền, ngân hàng và số tiền hợp lệ.");
    const snapshot = await db.rpc("reloo_wallet_snapshot", {
      p_profile: profile.id,
    });
    if (snapshot.error) throw new Error("PAYOUT_READ_FAILED");
    buildWallet(snapshot.data, verifyFinancialSource, verifyPromotionCredit);
    const smartReceipt=await requireSmartKey(request,account);
    const result = await db.rpc("reloo_confirm_payout", {
      p_actor: profile.id,p_receipt:smartReceipt.id,
      p_source: input.source,
      p_amount: input.amount,
      p_bank: input.bankId,
      p_key: input.requestKey,
    });
    if (result.error)
      throw new HttpError(
        409,
        "Chưa gửi được yêu cầu. Kiểm tra khoản được phép chi trả, căn cước còn hạn và ngân hàng đã khai báo khớp họ tên.",
      );
    return Response.json({ ok: true, id: result.data }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request) {
  try {
    assertOrigin(request);
    const account = await requireAccount(request, { active: false }),{profile,db}=account,
      input = await readJson(request);
    if (!uuid(input.id)) throw new HttpError(400, "Yêu cầu không hợp lệ.");
    const smartReceipt=await requireSmartKey(request,account);
    const result = await db.rpc("reloo_confirm_payout_cancel", {
      p_actor: profile.id,p_receipt:smartReceipt.id,
      p_id: input.id,
    });
    if (result.error)
      throw new HttpError(409, "Chỉ hủy được yêu cầu của bạn đang chờ duyệt.");
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
