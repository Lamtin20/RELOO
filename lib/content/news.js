import { securityDb } from "../security/service.js";
import { mediaUrl } from "./media.js";
export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}
export function isPublicArticle(row, now = Date.now()) {
  return (
    ["PUBLISHED", "SCHEDULED"].includes(row.status) &&
    (!row.publish_at || Date.parse(row.publish_at) <= now)
  );
}
export async function publicNews() {
  const { data, error } = await securityDb()
    .from("news_articles")
    .select("*")
    .in("status", ["PUBLISHED", "SCHEDULED"])
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
    .order("publish_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) return [];
  return data
    .filter((row) => isPublicArticle(row))
    .map((row) => ({ ...row, coverUrl: mediaUrl(row.cover_id) }));
}
export async function newsBySlug(slug) {
  if(typeof slug!=='string'||slug.length>120)return null;
  const {data,error}=await securityDb().from('news_articles').select('*')
    .eq(/^[a-f0-9-]{36}$/i.test(slug)?'id':'slug',slug)
    .in('status',['PUBLISHED','SCHEDULED'])
    .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`).maybeSingle();
  return !error&&data&&isPublicArticle(data)?{...data,coverUrl:mediaUrl(data.cover_id)}:null;
}
export function validateArticle(input) {
  if (
    !input ||
    typeof input.title !== "string" ||
    input.title.trim().length < 5 ||
    input.title.length > 180
  )
    throw new Error("Tiêu đề cần 5–180 ký tự.");
  const slug = slugify(input.slug || input.title);
  if (!slug) throw new Error("Đường dẫn bài viết không hợp lệ.");
  if (!["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"].includes(input.status))
    throw new Error("Trạng thái bài viết không hợp lệ.");
  const result = { title: input.title.trim(), slug, status: input.status };
  for (const [key, max] of [
    ["excerpt", 350],
    ["body", 60000],
    ["cover_alt", 250],
    ["seo_title", 80],
    ["seo_description", 180],
    ["author_name", 100],
    ["category", 100],
  ]) {
    if (
      typeof (input[key] ?? "") !== "string" ||
      (input[key] || "").length > max
    )
      throw new Error(`Trường ${key} vượt giới hạn.`);
    result[key] = (input[key] || "").trim();
  }
  if (
    input.status !== "DRAFT" &&
    (!result.body || !result.excerpt || !result.cover_alt)
  )
    throw new Error("Bài đăng cần nội dung, mô tả ngắn và mô tả ảnh.");
  result.cover_id = input.cover_id || null;
  if (result.cover_id && !/^[a-f0-9-]{36}$/i.test(result.cover_id))
    throw new Error("Ảnh bìa không hợp lệ.");
  result.tags = Array.isArray(input.tags)
    ? input.tags
        .map((v) => String(v).trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];
  result.publish_at = input.publish_at
    ? new Date(input.publish_at).toISOString()
    : null;
  if (input.status === "SCHEDULED" && !result.publish_at)
    throw new Error("Chọn thời gian đăng bài.");
  return result;
}
