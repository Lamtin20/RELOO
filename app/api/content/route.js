import { securityDb } from "@/lib/security/service";
import { errorResponse } from "@/lib/server/http";
import { publicNews } from "@/lib/content/news";
import { formatMoney } from "@/lib/finance/wallet-display";
export async function GET() {
  try {
    const { data, error } = await securityDb()
      .from("crm_records")
      .select("id,module,title,data,status,updated_at")
      .eq("module", "content")
      .in("status", ["PUBLISHED", "APPROVED"])
      .order("updated_at", { ascending: false })
      .limit(12);
    if (error) throw new Error("Content unavailable");
    const now = Date.now();
    const articles = (await publicNews())
      .slice(0, 6)
      .map((row) => ({
        id: row.id,
        module: "news",
        title: row.title,
        imageUrl: row.coverUrl,
        description: row.excerpt,
        href: "/news/" + row.slug,
      }));
    const promotions = await securityDb().rpc("reloo_public_promotions");
    if (promotions.error) throw Error("PROMOTIONS_UNAVAILABLE");
    const offers = promotions.data.map((p) => ({
      id: p.id,
      module: "promotions",
      title: p.title,
      code: p.code,
      description:
        "Giảm " +
        (p.type === "PERCENT"
          ? Number(p.value) / 100 + "%"
          : formatMoney(p.value)) +
        (p.cap ? " · tối đa " + formatMoney(p.cap) : "") +
        " · đơn từ " +
        formatMoney(p.minimum) +
        ". " +
        p.terms.slice(0, 160),
      href: "/explore",
    }));
    return Response.json({
      ok: true,
      items: [
        ...offers,
        ...articles,
        ...data
          .filter(
            (item) =>
              (!item.data.startsAt || Date.parse(item.data.startsAt) <= now) &&
              (!item.data.endsAt || Date.parse(item.data.endsAt) > now),
          )
          .map((item) => ({
            id: item.id,
            module: item.module,
            title: item.title,
            imageUrl: item.data.imageUrl,
            description: (item.data.terms || item.data.body || "").slice(
              0,
              300,
            ),
            code: item.data.code,
          })),
      ].slice(0, 12),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
