import { createHash } from "node:crypto";
import { requireAccount } from "@/lib/security/authorization";
import {
  fetchProviderOrders,
  normalizeConversion,
} from "@/lib/affiliate/provider";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  rateLimit,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "affiliate-sync", 3);
    const { db } = await requireAccount(request, { admin: true });
    const { since, until, page = 1 } = await readJson(request);
    const from = Date.parse(since),
      to = Date.parse(until);
    if (
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      from >= to ||
      to - from > 31 * 86400000 ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 1000
    )
      throw new HttpError(400, "Chọn khoảng đối soát tối đa 31 ngày.");
    const report = await fetchProviderOrders(
      new Date(from).toISOString(),
      new Date(to).toISOString(),
      page,
    );
    if (!Array.isArray(report.data))
      throw new HttpError(502, "Chưa đọc được báo cáo đối tác.");
    let synced = 0,
      skipped = 0;
    for (const row of report.data) {
      const conversion = normalizeConversion(row);
      if (!conversion) {
        skipped++;
        continue;
      }
      const id = createHash("sha256")
        .update(`${conversion.merchant}:${conversion.orderId}`)
        .digest("hex");
      const { data, error } = await db.rpc("reloo_sync_cashback", {
        p_id: id,
        p_click_id: conversion.clickId,
        p_merchant: conversion.merchant,
        p_order_id: conversion.orderId,
        p_status: conversion.status,
        p_commission: conversion.commission,
        p_updated_at: conversion.updatedAt,
      });
      if (error)
        throw new HttpError(
          503,
          "Đối soát chưa hoàn tất. Có thể chạy lại mà không cộng tiền trùng.",
        );
      if (data) synced++;
      else skipped++;
    }
    return Response.json({
      ok: true,
      synced,
      skipped,
      page,
      total: report.total,
      hasMore: page * 100 < Number(report.total || 0),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
