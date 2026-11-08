import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import { encryptPrivate, privateHash } from "@/lib/operations/crypto";
import { fetchVietQrBanks } from "@/lib/bank/vietqr-server";
import { normalizedHolderName } from "@/lib/profile/validation";
import { queueIdentifier } from "@/lib/security/identifiers";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    const accounts = await db
      .from("profile_bank_accounts")
      .select(
        "id,bank_code,bank_bin,bank_name,logo,masked_account,name_status,is_default,created_at",
      )
      .eq("profile_id", profile.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (accounts.error) throw new Error("BANK_STORAGE_UNAVAILABLE");
    return Response.json(
      { ok: true, accounts: accounts.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "bank-write", 5);
    const { profile, db } = await requireAccount(request, { active: false });
    const input = await readJson(request),
      number = String(input.number || "").replace(/\s/g, ""),
      holder = normalizedHolderName(input.holder);
    if (
      !/^\d{6,19}$/.test(number) ||
      holder.length < 3 ||
      holder.length > 100 ||
      typeof input.branch !== "string" ||
      input.branch.length > 120 ||
      input.consent !== true ||
      typeof input.isDefault !== "boolean"
    )
      throw new HttpError(
        400,
        "Kiểm tra số tài khoản, tên chủ tài khoản và đồng ý đối chiếu.",
      );
    const banks = await fetchVietQrBanks({
      signal: AbortSignal.timeout(10000),
    });
    const bank = banks.find((b) => String(b.bin) === String(input.bin));
    if (!bank || !/^\d{6}$/.test(String(bank.bin)))
      throw new HttpError(400, "Hãy chọn ngân hàng từ danh sách.");
    const { data: id, error } = await db.rpc("reloo_save_bank", {
      p_profile: profile.id,
      p_data: {
        bank_code: bank.code,
        bank_bin: String(bank.bin),
        bank_name: bank.shortName || bank.name,
        logo: bank.logo,
        account_encrypted: encryptPrivate(number),
        account_hash: privateHash("BANK_ACCOUNT", `${bank.bin}:${number}`),
        masked_account: `•••• ${number.slice(-4)}`,
        holder_encrypted: encryptPrivate(holder),
        holder_name_hash: privateHash("HOLDER_NAME", holder),
        branch_encrypted: encryptPrivate(input.branch.trim()),
        is_default: input.isDefault,
      },
    });
    if (error)
      throw new HttpError(
        409,
        error.message.includes("HOLDER_ID_MISMATCH")
          ? "Tên chủ tài khoản phải khớp tên trên căn cước đã xác minh."
          : "Chưa lưu được ngân hàng. Hãy kiểm tra trạng thái hồ sơ.",
      );
    await queueIdentifier(db, profile.id, "BANK", number, bank.code);
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function PATCH(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request, { active: false }),
      input = await readJson(request);
    if (
      !/^[a-f0-9-]{36}$/i.test(input.id || "") ||
      !["DEFAULT", "REMOVE"].includes(input.action)
    )
      throw new HttpError(400, "Thao tác ngân hàng không hợp lệ.");
    const result = await db.rpc("reloo_manage_bank", {
      p_profile: profile.id,
      p_id: input.id,
      p_action: input.action,
    });
    if (result.error)
      throw new HttpError(
        403,
        "Chưa thay đổi được ngân hàng. Hãy kiểm tra trạng thái hồ sơ.",
      );
    return Response.json({ ok: true });
  } catch (cause) {
    return errorResponse(cause);
  }
}
