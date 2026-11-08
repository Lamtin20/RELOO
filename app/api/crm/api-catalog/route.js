import { requirePermission } from "@/lib/operations/permissions";
import { errorResponse } from "@/lib/server/http";
import catalog from "@/lib/catalog/public-apis.json";
export async function GET(request) {
  try {
    await requirePermission(request, "settings.read");
    const params = new URL(request.url).searchParams,
      q = (params.get("q") || "").slice(0, 100).toLowerCase(),
      category = params.get("category"),
      https = params.get("https") === "true",
      noAuth = params.get("noAuth") === "true",
      offset = Math.max(0, Math.min(10000, Number(params.get("offset")) || 0));
    const filtered = catalog.entries.filter(
      (item) =>
        (!category || item.category === category) &&
        (!https || item.https) &&
        (!noAuth || item.auth === "None") &&
        `${item.name} ${item.description}`.toLowerCase().includes(q),
    );
    return Response.json(
      {
        ok: true,
        entries: filtered.slice(offset, offset + 50),
        total: filtered.length,
        categories: [...new Set(catalog.entries.map((x) => x.category))].sort(),
        source: catalog.source,
        commit: catalog.commit,
        generatedAt: catalog.generatedAt,
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
