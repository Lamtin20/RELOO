import { requirePermission } from "@/lib/operations/permissions";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import { publicBusiness, validateEntity } from "@/lib/operations/settings";
import {
  integrationConfig,
  integrationReadiness,
  SECRET_KEYS,
} from "@/lib/operations/integrations";
import { encryptPrivate } from "@/lib/operations/crypto";
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "settings.read"),
      business = await publicBusiness(db),
      integrations = [];
    for (const provider of Object.keys(SECRET_KEYS)) {
      const config = await integrationConfig(db, provider),
        row = await db
          .from("integration_settings")
          .select("config,version,updated_at")
          .eq("provider", provider)
          .maybeSingle();
      if (row.error) throw new Error("SETTINGS_UNAVAILABLE");
      integrations.push({
        provider,
        config: row.data?.config || {},
        version: row.data?.version || 0,
        updatedAt: row.data?.updated_at || null,
        ...integrationReadiness(provider, config),
        secretFields: SECRET_KEYS[provider].map((key) => ({
          key,
          present: !!config[key],
        })),
      });
    }
    const draft=await db.from('business_settings').select('entity_draft').eq('id',true).single();if(draft.error)throw new Error('SETTINGS_UNAVAILABLE');
    return Response.json(
      { ok: true, business:{...business,entityDraft:draft.data.entity_draft}, integrations },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "settings-write", 10);
    const { profile, db } = await requirePermission(request, "settings.write"),
      input = await readJson(request, 20000);
    if (!Number.isInteger(input.version) || input.version < 0)
      throw new HttpError(400, "Thiếu phiên bản cấu hình.");
    if (input.kind === "entity") {
      const entity = validateEntity(input.entity),
        result = await db.rpc("reloo_save_business_entity", {
          p_actor: profile.id,
          p_version: input.version,
          p_entity: entity,
          p_confirmed:input.confirmOfficial===true,
        });
      if (result.error)
        throw new HttpError(
          409,
          "Cấu hình đã thay đổi. Hãy tải lại trước khi lưu.",
        );
      return Response.json({ ok: true });
    }
    if (input.kind === "deposit") {
      const deposit = input.deposit;
      if (
        typeof deposit?.enabled !== "boolean" ||
        !["OPTIONAL", "REQUIRED"].includes(deposit.mode) ||
        typeof deposit.programLabel !== "string" ||
        deposit.programLabel.length > 120
      )
        throw new HttpError(400, "Chương trình ký quỹ chưa hợp lệ.");
      if (deposit.enabled)
        throw new HttpError(
          409,
          "Ký quỹ cần hoàn tất cấu hình ngân hàng giữ ký quỹ, điều khoản và kết nối đối soát trước khi bật.",
          "ESCROW_NOT_READY",
        );
      const result = await db.rpc("reloo_save_business", {
        p_actor: profile.id,
        p_version: input.version,
        p_entity: null,
        p_deposit: {
          enabled: false,
          mode: deposit.mode,
          programLabel: deposit.programLabel.trim(),
        },
      });
      if (result.error)
        throw new HttpError(409, "Cấu hình đã thay đổi. Hãy tải lại.");
      return Response.json({ ok: true });
    }
    const provider = input.provider;
    if (
      input.kind !== "integration" ||
      !Object.hasOwn(SECRET_KEYS, provider) ||
      !input.secrets ||
      typeof input.secrets !== "object" ||
      Array.isArray(input.secrets)
    )
      throw new HttpError(400, "Chọn dịch vụ cần cấu hình.");
    const current = await integrationConfig(db, provider),
      secrets = {};
    for (const key of SECRET_KEYS[provider]) {
      const value = input.secrets[key];
      if (
        value !== undefined &&
        (typeof value !== "string" || value.length > 6000)
      )
        throw new HttpError(400, "Khóa dịch vụ vượt giới hạn.");
      secrets[key] = value?.trim() || current[key] || "";
    }
    if (
      Object.keys(input.secrets).some(
        (key) => !SECRET_KEYS[provider].includes(key),
      )
    )
      throw new HttpError(400, "Trường khóa không hợp lệ.");
    const config = input.config || {};
    const allowed = {
      VNPT: ["sdkIosUrl", "sdkAndroidUrl"],
      SEPAY: ["companyAccountNumber", "bankAccountId","invoiceAccountId","vaPrefix","tid","bankName","custodyModel"],
      EVM: ["chainId", "contractAddress", "confirmations","maxFeeWei"],
      TWENTY: [],
      GMAIL: ['sender'],
    }[provider];
    if (
      typeof config !== "object" ||
      Array.isArray(config) ||
      Object.keys(config).some((key) => !allowed.includes(key)) ||
      JSON.stringify(config).length > 2000
    )
      throw new HttpError(400, "Thông tin kết nối không hợp lệ.");
    if (
      provider === "EVM" &&
      config.chainId !== undefined &&
      (!Number.isSafeInteger(config.chainId) || config.chainId <= 0)
    )
      throw new HttpError(400, "Chain ID không hợp lệ.");
    if (
      provider === "EVM" &&
      config.contractAddress &&
      !/^0x[a-f0-9]{40}$/i.test(config.contractAddress)
    )
      throw new HttpError(400, "Địa chỉ hợp đồng không hợp lệ.");
    if (provider === "VNPT")
      for (const key of allowed)
        if (config[key] && !/^https:\/\//.test(config[key]))
          throw new HttpError(400, "Liên kết SDK cần HTTPS.");
    if(provider==='SEPAY'){
      for(const key of ['bankAccountId','invoiceAccountId'])if(config[key]&&!/^[a-f0-9-]{36}$/i.test(config[key]))throw new HttpError(400,'ID tài khoản nhà cung cấp cần là UUID.');
      if(config.companyAccountNumber&&!/^\d{6,30}$/.test(config.companyAccountNumber))throw new HttpError(400,'Số tài khoản thu tiền không hợp lệ.');
    }
    if(provider==='EVM'&&config.maxFeeWei&&(!/^\d{1,20}$/.test(config.maxFeeWei)||BigInt(config.maxFeeWei)<=0n))throw new HttpError(400,'Cần hạn mức phí giao dịch EVM tính bằng wei.');
    if(provider==='GMAIL'&&(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(config.sender||'')))throw new HttpError(400,'Kiểm tra địa chỉ Gmail gửi thông báo.');
    const result = await db.rpc("reloo_save_integration", {
      p_actor: profile.id,
      p_provider: provider,
      p_version: input.version,
      p_config: config,
      p_secrets: encryptPrivate(JSON.stringify(secrets)),
    });
    if (result.error)
      throw new HttpError(
        409,
        "Cấu hình đã thay đổi hoặc chưa lưu được. Hãy tải lại.",
      );
    return Response.json({ ok: true });
  } catch (cause) {
    return errorResponse(cause);
  }
}
