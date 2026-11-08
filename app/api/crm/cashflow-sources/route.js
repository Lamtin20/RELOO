import { requirePermission } from "@/lib/operations/permissions";
import {
  assertOrigin,
  readJson,
  errorResponse,
  HttpError,
} from "@/lib/server/http";
import { verifyFinancialSource } from "@/lib/finance/verification";
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "accounting.read");
    const rows = await db
      .from("customer_cash_entries")
      .select(
        "id,profile_id,direction,amount,reference,occurred_at,profiles(name)",
      )
      .order("occurred_at", { ascending: false })
      .limit(200);
    if (rows.error) throw rows.error;
    const categories = rows.data.length
      ? await db
          .from("wallet_category_events")
          .select("entry_id,source_code,reason,created_at,created_by")
          .in(
            "entry_id",
            rows.data.map((r) => r.id),
          )
          .order("event_sequence", { ascending: false })
      : { data: [] };
    if (categories.error) throw categories.error;
    return Response.json(
      {
        ok: true,
        entries: rows.data.map((row) => ({
          ...row,
          amount: String(row.amount),
          sourceCode:
            categories.data.find((c) => c.entry_id === row.id)?.source_code ||
            "BANK",
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
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
      !/^[a-f0-9-]{36}$/i.test(input.entryId || "") ||
      !["BANK", "RENTAL", "DEPOSIT", "REFUND"].includes(input.source) ||
      typeof input.reason !== "string" ||
      input.reason.trim().length < 20 ||
      input.reason.length > 2000
    )
      throw new HttpError(
        400,
        "Chọn khoản đã đối soát, nguồn tiền và lý do phân loại tối thiểu 20 ký tự.",
      );
    const row = await db
      .from("customer_cash_entries")
      .select("finance_sources(*)")
      .eq("id", input.entryId)
      .single();
    if (row.error || !verifyFinancialSource(row.data.finance_sources))
      throw new HttpError(
        409,
        "Khoản tiền chưa có bằng chứng đối soát hợp lệ.",
      );
    const result = await db.rpc("reloo_classify_wallet_entry", {
      p_actor: profile.id,
      p_entry: input.entryId,
      p_source: input.source,
      p_reason: input.reason.trim(),
    });
    if (result.error)
      throw new HttpError(
        409,
        "Chưa phân loại được. Tiền ký quỹ cần chương trình được phép hoạt động.",
      );
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
