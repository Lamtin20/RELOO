import { requirePermission } from "@/lib/operations/permissions";
import { CRM_MODULES, CRM_STATES } from "@/lib/operations/modules";
import { assertOrigin, errorResponse, HttpError, readJson } from "@/lib/server/http";
export async function GET(request) {
  try {
    const moduleKey = new URL(request.url).searchParams.get("module");
    if (!CRM_MODULES[moduleKey]) throw new HttpError(400, "Phân hệ không hợp lệ.");
    const { db } = await requirePermission(request, `${moduleKey}.read`);
    const { data, error } = await db.from("crm_records").select("*").eq("module", moduleKey).order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("CRM unavailable");
    return Response.json({ ok: true, records: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const input = await readJson(request), config = CRM_MODULES[input.module];
    if (!config || typeof input.title !== "string" || !input.title.trim() || input.title.length > 200 || !CRM_STATES.includes(input.status)) throw new HttpError(400, "Kiểm tra tiêu đề và trạng thái.");
    const { profile, db } = await requirePermission(request, `${input.module}.write`);
    const data = {};
    for (const field of config.fields) {
      const value = input.data?.[field];
      if (value === undefined || value === "") continue;
      if (typeof value !== "string" || value.length > (field === "body" ? 10000 : 2000)) throw new HttpError(400, "Thông tin vượt giới hạn.");
      if (field.endsWith("Url") && (!/^https:\/\//.test(value) || new URL(value).username)) throw new HttpError(400, "Liên kết phải dùng HTTPS.");
      data[field] = value;
    }
    if (["accounting", "tax"].includes(input.module)) {
      for (const field of ["amount", "taxAmount", "taxableAmount"]) if (data[field] && (!Number.isFinite(Number(data[field])) || Number(data[field]) < 0)) throw new HttpError(400, "Số tiền không hợp lệ.");
      if (["PUBLISHED", "APPROVED"].includes(input.status)) throw new HttpError(400, "Chứng từ cần đối soát; trạng thái không xác nhận việc nộp thuế.");
    }
    if (input.status === "SCHEDULED" && (input.module !== "content" || !data.publishAt || !Number.isFinite(Date.parse(data.publishAt)))) throw new HttpError(400, "Lịch đăng chưa hợp lệ.");
    if (input.module === 'bots' && ((!['support','analysis'].includes(data.purpose)) || (data.enabled && !['true','false'].includes(data.enabled)) || (data.model && data.model !== 'qwen2.5:1.5b'))) throw new HttpError(400,'Chọn purpose support/analysis, enabled true/false và mô hình đã cài qwen2.5:1.5b.');
    for (const field of config.fields.filter((field) => field.endsWith('At'))) if (data[field]) { const date = new Date(data[field]); if (!Number.isFinite(date.getTime())) throw new HttpError(400, 'Ngày giờ không hợp lệ.'); data[field] = date.toISOString(); }
    if(input.id&&input.module==='support'){const existing=await db.from('crm_records').select('data').eq('id',input.id).eq('module','support').single();if(existing.error)throw new HttpError(409,'Hồ sơ hỗ trợ đã thay đổi.');if(existing.data.data?.purchaseOrderId)data.purchaseOrderId=existing.data.data.purchaseOrderId;}
    const result = await db.rpc('reloo_crm_save', { p_actor: profile.id, p_id: input.id || null, p_version: input.version || null, p_module: input.module, p_title: input.title.trim(), p_status: input.status, p_data: data });
    if (result.error) throw new HttpError(409, "Bản ghi đã thay đổi hoặc chưa lưu được. Hãy tải lại.");
    return Response.json({ ok: true, record: result.data });
  } catch (error) { return errorResponse(error); }
}
