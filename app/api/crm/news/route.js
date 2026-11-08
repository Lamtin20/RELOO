import { requirePermission } from "@/lib/operations/permissions";
import { validateArticle } from "@/lib/content/news";
import {crmAllowed} from '@/lib/operations/access';
import {canPublishNow} from '@/lib/content/news-management';
import {
  assertOrigin,
  readJson,
  errorResponse,
  HttpError,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { db,staff } = await requirePermission(request, "content.read");
    const { data, error } = await db
      .from("news_articles")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return Response.json(
      { ok: true, articles: data,canWrite:crmAllowed(staff,'content.write') },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requirePermission(request, "content.write"),
      input = await readJson(request, 100000);
    if(input.action==='PUBLISH_NOW'){
      if(!/^[a-f0-9-]{36}$/i.test(input.id||'')||!Number.isInteger(input.version))throw new HttpError(400,'Bài viết không hợp lệ.');
      const existing=await db.from('news_articles').select('*').eq('id',input.id).maybeSingle();
      if(existing.error)throw new HttpError(503,'Không đọc được bài viết.');
      const row=existing.data;
      if(!row)throw new HttpError(404,'Không tìm thấy bài viết.');
      if(!canPublishNow(row)||row.version!==input.version)throw new HttpError(409,'Bài đã thay đổi hoặc đã được đăng. Hãy làm mới danh sách.');
      let data;try{data=validateArticle({...row,status:'PUBLISHED',publish_at:new Date().toISOString()});}catch(e){throw new HttpError(400,e.message);}
      if(!data.cover_id)throw new HttpError(400,'Thêm ảnh bìa trước khi đăng bài.');
      const cover=await db.from('media_assets').select('id,mime').eq('id',data.cover_id).maybeSingle();
      if(cover.error)throw new HttpError(503,'Không kiểm tra được ảnh bìa.');
      if(!cover.data||cover.data.mime!=='image/webp')throw new HttpError(400,'Ảnh bìa cần là ảnh WebP hợp lệ. Hãy tải lại ảnh trong phần chỉnh sửa.');
      const saved=await db.from('news_articles').update({...data,version:row.version+1,updated_at:new Date().toISOString()}).eq('id',row.id).eq('version',row.version).in('status',['DRAFT','SCHEDULED']).select('id').maybeSingle();
      if(saved.error||!saved.data)throw new HttpError(409,'Bài vừa được cập nhật. Hãy làm mới danh sách.');
      await db.from('security_audit').insert({actor_id:profile.id,action:'NEWS_PUBLISHED_NOW',details:{id:row.id,previousStatus:row.status,previousVersion:row.version}});
      return Response.json({ok:true,id:row.id});
    }
    let data;
    try {
      data = validateArticle(input);
    } catch (e) {
      throw new HttpError(400, e.message);
    }
    const result = input.id
      ? await db
          .from("news_articles")
          .update({
            ...data,
            version: input.version + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.id)
          .eq("version", input.version)
          .select("id")
          .single()
      : await db
          .from("news_articles")
          .insert({ ...data, created_by: profile.id })
          .select("id")
          .single();
    if (result.error)
      throw new HttpError(
        409,
        "Đường dẫn bị trùng hoặc bài viết đã thay đổi. Hãy tải lại.",
      );
    await db
      .from("security_audit")
      .insert({
        actor_id: profile.id,
        action: "NEWS_" + data.status,
        details: { id: result.data.id, slug: data.slug },
      });
    return Response.json({ ok: true, id: result.data.id });
  } catch (error) {
    return errorResponse(error);
  }
}
