import { requirePermission } from "@/lib/operations/permissions";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
import { currentLegal, LEGAL_SLUGS } from "@/lib/legal/current";
import { entityReady } from "@/lib/operations/settings";
import {validateLegalContent} from '@/lib/legal/editor';
export async function PUT(request){try{assertOrigin(request);const {profile,db}=await requirePermission(request,'legal.write'),input=await readJson(request,200000);if(!LEGAL_SLUGS.includes(input.slug)||!Number.isInteger(input.version)||input.version<0)throw new HttpError(400,'Tài liệu chưa hợp lệ.');let content;try{content=validateLegalContent(input);}catch(e){throw new HttpError(400,e.message);}const result=await db.rpc('reloo_edit_legal',{p_actor:profile.id,p_slug:input.slug,p_content:content,p_version:input.version});if(result.error)throw new HttpError(409,'Tài liệu đã thay đổi. Tải lại phiên bản mới trước khi lưu.');return Response.json({ok:true,version:result.data});}catch(e){return errorResponse(e);}}
export async function GET(request) {
  try {
    const { db } = await requirePermission(request, "legal.read");
    return Response.json(
      {
        ok: true,
        documents: await Promise.all(
          LEGAL_SLUGS.map((slug) => currentLegal(db, slug)),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requirePermission(request, "legal.write"),
      input = await readJson(request),
      document = LEGAL_SLUGS.includes(input.slug)
        ? await currentLegal(db, input.slug)
        : null;
    input.reviewed=true;
    input.reason='Ban hành bởi nhân sự đã xác thực Smart Key trong phiên CRM. Nội dung được đối chiếu theo mã phiên bản '+input.hash;
    if(Array.isArray(input.documents)){
      if(!input.documents.length||input.documents.length>LEGAL_SLUGS.length||new Set(input.documents.map(d=>d.slug)).size!==input.documents.length)throw new HttpError(400,'Chọn tài liệu cần ban hành.');
      const batch=[];
      for(const item of input.documents){if(!LEGAL_SLUGS.includes(item.slug))throw new HttpError(400,'Tài liệu không hợp lệ.');const current=await currentLegal(db,item.slug);if(current.hash!==item.hash||!entityReady(current.entitySnapshot)||!current.entitySnapshot.commerceRegistrationUrl)throw new HttpError(409,'Một tài liệu đã thay đổi hoặc thiếu khai báo pháp nhân. Tải lại trước khi ban hành.');const {hash,draft,publishedAt,...snapshot}=current;batch.push({hash,document:snapshot});}
      const result=await db.rpc('reloo_publish_legal_batch',{p_actor:profile.id,p_documents:batch});if(result.error)throw new HttpError(409,'Chưa ban hành được nhóm tài liệu. Không có mục nào được áp dụng.');return Response.json({ok:true,count:batch.length});
    }
    if (
      !document ||
      input.hash !== document.hash ||
      input.reviewed !== true ||
      typeof input.reason !== "string" ||
      input.reason.trim().length < 30
    )
      throw new HttpError(
        409,
        "Cần đối chiếu phiên bản hiện tại và ghi nhận căn cứ rà soát.",
      );
    if (
      !entityReady(document.entitySnapshot) ||
      !document.entitySnapshot.commerceRegistrationUrl
    )
      throw new HttpError(
        409,
        "Cần hoàn tất khai báo pháp nhân và hồ sơ đăng ký nền tảng trước khi ban hành.",
      );
    const { hash, draft, publishedAt, ...snapshot } = document,
      result = await db.rpc("reloo_publish_legal_checked", {
        p_actor: profile.id,
        p_hash: hash,
        p_document: snapshot,
        p_reason: input.reason.trim(),
      });
    if (result.error)
      throw new HttpError(
        409,
        "Chưa ban hành được tài liệu; thông tin đã thay đổi hoặc chưa đủ quyền.",
      );
    return Response.json({ ok: true });
  } catch (cause) {
    return errorResponse(cause);
  }
}
