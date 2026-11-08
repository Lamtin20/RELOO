import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/operations/permissions";
import { integrationConfig } from "@/lib/operations/integrations";
import { encryptPrivate, privateHash } from "@/lib/operations/crypto";
import {
  sepayBanks,
  sepayVaList,
  sepayVaDetails,
  sepayV2,
  orderPayload,
  bankRule,
  validBankId,
} from "@/lib/finance/sepay-v2";
import {
  assertOrigin,
  readJson,
  errorResponse,
  HttpError,
} from "@/lib/server/http";
import { publicBusiness } from "@/lib/operations/settings";
import { accountIdentity } from "@/lib/kyc/expiry";
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "accounting.read"),
      config = await integrationConfig(db, "SEPAY"),
      bankId = new URL(request.url).searchParams.get("bank");
    const banks = await sepayBanks(config);
    const bank = banks.find((row) => row.id === bankId);
    let result = null;
    if (bank && bankRule(bank))
      result = await sepayVaList(bank.id, config, {
        page: Number(new URL(request.url).searchParams.get("page")) || 1,
      });
    return Response.json(
      {
        ok: true,
        banks: banks.map((row) => ({
          id: row.id,
          bank: row.bank_short_name,
          accountType: row.account_type,
          active: String(row.active) === "1",
          maskedAccount: "•••• " + row.account_number.slice(-4),
          vaSupported: !!bankRule(row),
          requirements: bankRule(row),
        })),
        accounts: result?.data || [],
        pagination: result?.meta?.pagination,
        configured: true,
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    if(e instanceof HttpError)return errorResponse(e);
    return errorResponse(
      new HttpError(
        503,
        e.message === "SEPAY_NOT_CONFIGURED"
          ? "Chưa có khóa SePay."
          : "Chưa đọc được SePay. Kiểm tra quyền API và kết nối.",
        e.message,
      ),
    );
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requirePermission(
        request,
        "accounting.write",
      ),
      input = await readJson(request),
      config = await integrationConfig(db, "SEPAY");
    const banks = await sepayBanks(config),
      bank = banks.find((row) => row.id === input.bankId);
    if (!bank || !bankRule(bank))
      throw new HttpError(
        400,
        "Chọn tài khoản ngân hàng hỗ trợ VA được liên kết trong SePay.",
      );
    if (input.action === "CONFIGURE") {
      await requirePermission(request, "settings.write");
      const current = await db
        .from("integration_settings")
        .select("version,config,secrets_encrypted")
        .eq("provider", "SEPAY")
        .maybeSingle();
      const result = await db.rpc("reloo_save_integration", {
        p_actor: profile.id,
        p_provider: "SEPAY",
        p_version: current.data?.version || 0,
        p_config: {
          ...current.data?.config,
          bankAccountId: bank.id,
          companyAccountNumber: bank.account_number,
          bankName: bank.bank_short_name,
          tid: input.tid || "",
          vaPrefix: input.vaPrefix || "",
          custodyModel: input.custodyModel || "COLLECTION",
        },
        p_secrets: current.data?.secrets_encrypted || null,
      });
      if (result.error)
        throw new HttpError(409, "Chưa lưu được tài khoản thu tiền.");
      return Response.json({ ok: true });
    }
    const customer = await db
      .from("profiles")
      .select("id,activation_status,kyc_level")
      .eq("id", input.profileId)
      .single();
    if (customer.error) throw new HttpError(404, "Khách hàng không tồn tại.");
    if (input.action === "LINK") {
      const identity = await accountIdentity(db, input.profileId);
      if (
        customer.data.activation_status !== "ACTIVE" ||
        !identity.identity ||
        identity.status === "EXPIRED"
      )
        throw new HttpError(
          409,
          "Khách hàng cần được xác minh và còn hạn căn cước trước khi gắn VA.",
        );
      const va = await sepayVaDetails(bank.id, input.vaId, config);
      if (va.bank_account_id !== bank.id || String(va.active) !== "1")
        throw new HttpError(
          409,
          "VA không hoạt động hoặc không thuộc tài khoản đã chọn.",
        );
      const r = await db.from("customer_va_links").insert({
        profile_id: input.profileId,
        bank_account_id: bank.id,
        provider_va_id: va.id,
        va_encrypted: encryptPrivate(va.va),
        va_hash: privateHash("VA", va.va),
        masked_va: "•••• " + va.va.slice(-6),
        bank_name: bank.bank_short_name,
        holder_encrypted: encryptPrivate(va.sub_holder_name || ""),
        created_by: profile.id,
      });
      if (r.error)
        throw new HttpError(409, "VA đã liên kết hoặc chưa lưu được.");
    } else if (input.action === "CREATE") {
      if (!(await publicBusiness(db)).entityReady)
        throw new HttpError(
          409,
          "Khai báo pháp nhân thu tiền trong CRM trước khi cấp VA.",
        );
      const identity = await accountIdentity(db, input.profileId);
      if (
        customer.data.activation_status !== "ACTIVE" ||
        !identity.identity ||
        identity.status === "EXPIRED"
      )
        throw new HttpError(
          409,
          "Khách cần được duyệt căn cước còn hiệu lực và đủ điều kiện giao dịch.",
        );
      let payload;
      try {
        payload = orderPayload(
          {
            ...input,
            tid: input.tid || config.tid,
            vaPrefix: input.vaPrefix || config.vaPrefix,
          },
          bank,
        );
      } catch (e) {
        throw new HttpError(400, e.message);
      }
      if (payload.tid) {
        const terminals = (
          await sepayV2(
            `/bank-accounts/${validBankId(bank.id)}/terminals`,
            config,
          )
        ).data;
        if (
          !Array.isArray(terminals) ||
          !terminals.some((t) => String(t.tid || t.terminal_id) === payload.tid)
        )
          throw new HttpError(
            409,
            "Terminal ID chưa thuộc tài khoản Vietcombank đã chọn.",
          );
      }
      const id = randomUUID();
      const claim = await db.from("sepay_order_requests").insert({
        id,
        profile_id: input.profileId,
        bank_account_id: bank.id,
        order_code: payload.order_code,
        expected_amount: payload.amount,
        payload_encrypted: encryptPrivate(JSON.stringify(payload)),
        created_by: profile.id,
      });
      if (claim.error)
        throw new HttpError(
          409,
          "Mã thu tiền đang/đã được tạo. Đối chiếu SePay trước khi thử lại.",
        );
      try {
        const order = (
          await sepayV2(`/bank-accounts/${bank.id}/orders`, config, payload)
        ).data;
        if (!order.id || typeof order.va_number !== "string")
          throw new Error("SEPAY_ORDER_RESPONSE_INVALID");
        const r = await db.from("customer_va_links").insert({
          profile_id: input.profileId,
          bank_account_id: bank.id,
          provider_order_id: order.id,
          va_encrypted: encryptPrivate(order.va_number),
          va_hash: privateHash("VA", order.va_number),
          masked_va: "•••• " + order.va_number.slice(-6),
          bank_name: bank.bank_short_name,
          holder_encrypted: encryptPrivate(
            order.va_holder_name || order.account_holder_name || "",
          ),
          expires_at: order.expired_at
            ? new Date(
                order.expired_at.replace(" ", "T") + "+07:00",
              ).toISOString()
            : null,
          created_by: profile.id,
        });
        if (r.error) throw new Error("VA_MAPPING_REVIEW_REQUIRED");
        await db
          .from("sepay_order_requests")
          .update({ status: "CREATED", provider_order_id: order.id })
          .eq("id", id);
      } catch (e) {
        await db
          .from("sepay_order_requests")
          .update({ status: "REVIEW" })
          .eq("id", id);
        throw new HttpError(
          409,
          "Chưa hoàn tất cấp VA. Kiểm tra đơn tại SePay trước khi tạo lại.",
          e.providerCode || e.message,
        );
      }
    } else throw new HttpError(400, "Thao tác VA không hợp lệ.");
    await db.from("security_audit").insert({
      actor_id: profile.id,
      subject_id: input.profileId,
      action: "SEPAY_VA_" + input.action,
      details: { bankId: bank.id, vaId: input.vaId || null },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
