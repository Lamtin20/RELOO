import { requirePermission } from "@/lib/operations/permissions";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
import { buildWallet } from "@/lib/finance/wallet-model";
import { decryptPrivate } from "@/lib/operations/crypto";
import { verifyFinancialSource } from "@/lib/finance/verification";
import { verifyPromotionCredit } from "@/lib/promotions/server";
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "accounting.read");
    const [requests, funding, subsidies] = await Promise.all([
      db
        .from("wallet_withdrawal_records")
        .select(
          "id,profile_id,source_code,amount,status,reference,masked_account,bank_name,reason,created_at,profiles!wallet_withdrawal_records_profile_id_fkey(name)",
        )
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("customer_cash_entries")
        .select(
          "id,profile_id,source_id,amount,direction,reference,profiles(name)",
        )
        .eq("direction", "IN")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("promotion_subsidy_credits")
        .select(
          "id,profile_id,amount,promotion_funding!inner(source_id),profiles(name)",
        )
        .limit(2000),
    ]);
    if (requests.error || funding.error || subsidies.error)
      throw new Error("PAYOUT_READ_FAILED");
    return Response.json(
      {
        ok: true,
        requests: requests.data.map((r) => ({
          ...r,
          amount: String(r.amount),
        })),
        funding: [
          ...funding.data.map((r) => ({ ...r, amount: String(r.amount) })),
          ...subsidies.data.map((s) => ({
            id: s.id,
            profile_id: s.profile_id,
            source_id: s.promotion_funding.source_id,
            amount: String(s.amount),
            direction: "IN",
            reference: "RELOO bù khuyến mãi",
            profiles: s.profiles,
          })),
        ],
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
    const { profile, db } = await requirePermission(
        request,
        "accounting.write",
      ),
      input = await readJson(request);
    if (
      typeof input.reason !== "string" ||
      input.reason.trim().length < 20 ||
      input.reason.length > 2000
    )
      throw new HttpError(400, "Nhập căn cứ đối soát tối thiểu 20 ký tự.");
    if (input.action === "DESTINATION") {
      const record = await db
        .from("wallet_withdrawal_records")
        .select(
          "profile_id,bank_name,bank_snapshot_encrypted,holder_snapshot_encrypted",
        )
        .eq("id", input.id)
        .single();
      if (record.error || !record.data.bank_snapshot_encrypted)
        throw new HttpError(404, "Không có tài khoản nhận.");
      const audit = await db.from("security_audit").insert({
        actor_id: profile.id,
        subject_id: record.data.profile_id,
        action: "PAYOUT_DESTINATION_VIEWED",
        details: { withdrawalId: input.id, reason: input.reason.trim() },
      });
      if (audit.error) throw audit.error;
      return Response.json(
        {
          ok: true,
          destination: {
            bank: record.data.bank_name,
            account: decryptPrivate(record.data.bank_snapshot_encrypted),
            holder: record.data.holder_snapshot_encrypted
              ? decryptPrivate(record.data.holder_snapshot_encrypted)
              : "",
          },
        },
        { headers: { "Cache-Control": "private,no-store" } },
      );
    }
    if (input.action === "RELEASE") {
      if (
        !["BANK", "RENTAL", "DEPOSIT", "REFUND", "SHOPEE", "TIKTOK"].includes(
          input.source,
        ) ||
        !/^\d{1,16}$/.test(input.amount || "") ||
        BigInt(input.amount) <= 0n
      )
        throw new HttpError(400, "Nguồn và số tiền không hợp lệ.");
      const source = await db
        .from("finance_sources")
        .select("*")
        .eq("id", input.fundingId)
        .single();
      if (source.error || !verifyFinancialSource(source.data))
        throw new HttpError(409, "Nguồn ngân hàng chưa có bằng chứng hợp lệ.");
      const snapshot = await db.rpc("reloo_wallet_snapshot", {p_profile: input.profileId});
      if (snapshot.error) throw new HttpError(409, "Chưa đối chiếu được khoản tiền của khách nhận.");
      buildWallet(snapshot.data, verifyFinancialSource, verifyPromotionCredit);
      const result = await db.rpc("reloo_release_payout", {
        p_actor: profile.id,
        p_profile: input.profileId,
        p_source: input.source,
        p_amount: input.amount,
        p_funding: input.fundingId,
        p_reason: input.reason.trim(),
      });
      if (result.error)
        throw new HttpError(
          409,
          "Khoản chưa được phép chi trả: cần nguồn tiền đã đối soát, đúng khách hàng và chưa phân bổ hết.",
        );
      return Response.json({ ok: true, id: result.data });
    }
    if (["APPROVE", "PROCESS", "CONFIRM_PAID"].includes(input.action)) {
      const current = await db
        .from("wallet_withdrawal_records")
        .select("profile_id")
        .eq("id", input.id)
        .single();
      if (current.error) throw new HttpError(404, "Yêu cầu không tồn tại.");
      const snapshot = await db.rpc("reloo_wallet_snapshot", {
        p_profile: current.data.profile_id,
      });
      if (snapshot.error) throw snapshot.error;
      buildWallet(snapshot.data, verifyFinancialSource, verifyPromotionCredit);
    }
    if (input.action === "CONFIRM_PAID") {
      if (input.beneficiaryChecked !== true)
        throw new HttpError(
          400,
          "Xác nhận đã đối chiếu chứng từ và ngân hàng nhận.",
        );
      const proof = await db
        .from("finance_sources")
        .select("*")
        .eq("id", input.evidenceId)
        .single();
      if (proof.error || !verifyFinancialSource(proof.data))
        throw new HttpError(409, "Giao dịch chi tiền chưa được xác minh.");
    }
    const result = await db.rpc("reloo_review_payout", {
      p_actor: profile.id,
      p_id: input.id,
      p_action: input.action,
      p_reason: input.reason.trim(),
      p_evidence: input.evidenceId || null,
    });
    if (result.error)
      throw new HttpError(
        409,
        "Chuyển trạng thái không hợp lệ hoặc bằng chứng chưa khớp khách hàng/số tiền.",
      );
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
