import { requireAccount } from "@/lib/security/authorization";
import {
  PRICE_KINDS,
  PRICE_SOURCES,
  productKey,
  sourceUrl,
} from "@/lib/pricing/sources";
import { validateValuation } from "@/lib/pricing/rules";
import { normalizeCatalogProduct } from "@/lib/affiliate/catalog";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  rateLimit,
  readJson,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { db } = await requireAccount(request, { admin: true });
    const [sources, targets, runs] = await Promise.all([
      db.from("price_sources").select("*"),
      db
        .from("price_targets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60),
      db
        .from("price_collection_runs")
        .select("*")
        .order("observed_at", { ascending: false })
        .limit(60),
    ]);
    if ([sources, targets, runs].some((result) => result.error))
      throw new HttpError(
        503,
        "Kho dữ liệu thị trường chưa sẵn sàng. Kiểm tra kết nối và migration.",
      );
    return Response.json(
      {
        ok: true,
        sources: sources.data,
        targets: targets.data,
        runs: runs.data,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "market-data-admin", 10);
    const { profile, db } = await requireAccount(request, { admin: true });
    const { action, ...input } = await readJson(request, 1000000);
    let data;
    if (action === "source") {
      if (
        !PRICE_SOURCES.some((source) => source.id === input.id) ||
        typeof input.enabled !== "boolean" ||
        typeof input.accessBasis !== "string" ||
        input.accessBasis.length < 10 ||
        input.accessBasis.length > 1000
      )
        throw new HttpError(
          400,
          "Ghi rõ căn cứ truy cập nguồn trước khi thay đổi.",
        );
      data = {
        id: input.id,
        enabled: input.enabled,
        access_basis: input.accessBasis,
      };
    } else if (action === "target") {
      const product = validateValuation({
        ...input,
        purchasePrice: 0,
        ageMonths: 0,
        functional: true,
      });
      let url;
      try {
        url = sourceUrl(input.url, input.sourceId);
      } catch (cause) {
        throw new HttpError(400, cause.message);
      }
      if (
        !PRICE_KINDS.includes(input.priceKind) ||
        typeof input.permissionNote !== "string" ||
        input.permissionNote.length < 10 ||
        input.permissionNote.length > 1000 ||
        !Number.isInteger(input.intervalMinutes) ||
        input.intervalMinutes < 60 ||
        input.intervalMinutes > 10080
      )
        throw new HttpError(
          400,
          "Chọn loại giá, nhịp thu thập và ghi chú đối chiếu đúng sản phẩm.",
        );
      data = {
        source_id: input.sourceId,
        url,
        brand: product.brand,
        model: product.model,
        variant: product.variant,
        model_key: productKey(product),
        category: product.category,
        price_kind: input.priceKind,
        condition: product.condition,
        permission_note: input.permissionNote,
        interval_minutes: input.intervalMinutes,
      };
    } else if (action === "catalog") {
      if (
        input.licenseConfirmed !== true ||
        !Array.isArray(input.products) ||
        !input.products.length ||
        input.products.length > 300
      )
        throw new HttpError(
          400,
          "Chỉ nhập feed đối tác được cấp quyền, tối đa 300 sản phẩm mỗi lượt.",
        );
      data = input.products.map((item) => normalizeCatalogProduct(item));
    } else throw new HttpError(400, "Thao tác không hợp lệ.");
    const result = await db.rpc("reloo_admin_market_write", {
      p_actor_id: profile.id,
      p_action: action,
      p_data: data,
    });
    if (result.error)
      throw new HttpError(
        503,
        "Chưa lưu được thay đổi và audit. Vui lòng thử lại.",
      );
    return Response.json(
      { ok: true, result: result.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
