import { requirePermission } from "@/lib/operations/permissions";
import { publicBusiness } from "@/lib/operations/settings";
import { integrationConfig } from "@/lib/operations/integrations";
import { sepayBanks, bankRule } from "@/lib/finance/sepay-v2";
import {
  assertOrigin,
  readJson,
  errorResponse,
  HttpError,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "settings.read");
    const { data, error } = await db
      .from("brand_settings")
      .select("*")
      .eq("id", true)
      .single();
    if (error) throw error;
    return Response.json(
      { ok: true, settings: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requirePermission(request, "settings.write"),
      input = await readJson(request);
    const fields = {};
    if (Object.hasOwn(input, "rental_payments_enabled")) {
      if (typeof input.rental_payments_enabled !== "boolean")
        throw new HttpError(400, "Công tắc thanh toán không hợp lệ.");
      if (input.rental_payments_enabled) {
        const business = await publicBusiness(db),
          config = await integrationConfig(db, "SEPAY");
        if (!business.entityReady || config.custodyModel !== "COLLECTION")
          throw new HttpError(
            409,
            "Cần khai báo pháp nhân, điều kiện thu hộ và ngân hàng SePay trước khi bật.",
          );
        const bank = (await sepayBanks(config)).find(
          (b) => b.id === config.bankAccountId,
        );
        if (!bank || !bankRule(bank) || String(bank.active) !== "1")
          throw new HttpError(409, "Ngân hàng SePay chưa đủ điều kiện VA.");
      }
      fields.rental_payments_enabled = input.rental_payments_enabled;
    }
    if (Object.hasOwn(input, "site_title")) {
      if (
        typeof input.site_title !== "string" ||
        !input.site_title.trim() ||
        input.site_title.length > 150
      )
        throw new HttpError(400, "Tiêu đề tab cần từ 1 đến 150 ký tự.");
      fields.site_title = input.site_title.trim();
    }
    if (Object.hasOwn(input, "shipping_enabled")) {
      if (typeof input.shipping_enabled !== "boolean")
        throw new HttpError(400, "Công tắc giao hàng không hợp lệ.");
      fields.shipping_enabled = input.shipping_enabled;
    }
    if (!Number.isInteger(input.version) || input.version < 1)
      throw new HttpError(400, "Phiên bản cấu hình không hợp lệ.");
    for (const key of ["favicon_id", "app_icon_id", "crm_logo_id"])
      if (Object.hasOwn(input, key)) {
        if (input[key] !== null && !/^[a-f0-9-]{36}$/i.test(input[key] || ""))
          throw new HttpError(400, "Ảnh thương hiệu không hợp lệ.");
        fields[key] = input[key];
      }
    if (!Object.keys(fields).length)
      throw new HttpError(400, "Chưa có cấu hình cần lưu.");
    const result = await db
      .from("brand_settings")
      .update({
        ...fields,
        version: input.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true)
      .eq("version", input.version)
      .select("version")
      .single();
    if (result.error)
      throw new HttpError(409, "Cấu hình đã thay đổi. Hãy tải lại.");
    await db.from("security_audit").insert({
      actor_id: profile.id,
      action: "BRAND_UPDATED",
      details: { fields: Object.keys(fields) },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
