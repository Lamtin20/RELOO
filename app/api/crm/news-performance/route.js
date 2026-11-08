import {randomUUID} from 'node:crypto';
import {requirePermission} from '@/lib/operations/permissions';
import {crmAllowed} from '@/lib/operations/access';
import {assertOrigin,errorResponse,HttpError,readJson} from '@/lib/server/http';
import {checkNewsQuality} from '@/lib/content/news-quality-worker';
export async function GET(request){try{
 const {db,staff}=await requirePermission(request,'reports.read'),url=new URL(request.url),days=Number(url.searchParams.get('days')||30),page=Number(url.searchParams.get('page')||1);
 if(![7,30,90].includes(days)||!Number.isInteger(page)||page<1||page>10000)throw new HttpError(400,'Khoảng thời gian hoặc trang không hợp lệ.');
 const [metrics,articles,campaigns,site]=await Promise.all([db.rpc('reloo_news_metrics',{p_days:days}),db.from('news_articles').select('id,title,slug,status,version,category,updated_at',{count:'exact'}).order('updated_at',{ascending:false}).order('id').range((page-1)*25,page*25-1),db.from('news_campaigns').select('id,name,source,article_id,created_at').order('created_at',{ascending:false}).limit(100),crmAllowed(staff,'traffic.read')?db.rpc('reloo_site_metrics',{p_days:days}):Promise.resolve({data:null})]);
 if(metrics.error||articles.error||campaigns.error||site.error)throw new HttpError(503,'Chưa tải được báo cáo truyền thông.');
 const ids=articles.data.map(a=>a.id),[quality,reviews]=ids.length?await Promise.all([db.from('news_quality_audits').select('*').in('article_id',ids),db.from('news_editorial_reviews').select('article_id,article_version,status,note,sources_checked,reviewed_at').in('article_id',ids)]):[{data:[]},{data:[]}];
 if(quality.error||reviews.error)throw new HttpError(503,'Chưa tải được đánh giá chất lượng.');
 return Response.json({ok:true,days,page,total:articles.count,canWrite:crmAllowed(staff,'content.write'),metrics:metrics.data,site:site.data,articles:articles.data.map(a=>({...a,audit:quality.data.find(q=>q.article_id===a.id)||null,review:reviews.data.find(q=>q.article_id===a.id)||null})),campaigns:campaigns.data,searchConsole:{connected:false}},{headers:{'Cache-Control':'private,no-store'}});
 }catch(e){return errorResponse(e);}}
export async function POST(request){try{
 assertOrigin(request);const {db,profile}=await requirePermission(request,'content.write'),input=await readJson(request,5000);
 if(!/^[a-f0-9-]{36}$/i.test(input.articleId||''))throw new HttpError(400,'Bài viết không hợp lệ.');
 if(input.action==='AUDIT'){await checkNewsQuality(db,input.articleId);return Response.json({ok:true});}
 if(input.action==='CAMPAIGN'){
  if(typeof input.name!=='string'||input.name.trim().length<3||input.name.length>100||/@|\d{6,}/.test(input.name)||!['email','facebook','zalo','tiktok','google'].includes(input.source))throw new HttpError(400,'Tên chiến dịch cần 3–100 ký tự, không chứa email/số điện thoại; chọn kênh chia sẻ hợp lệ.');
  const a=await db.from('news_articles').select('slug,status,publish_at').eq('id',input.articleId).single();if(a.error||!['PUBLISHED','SCHEDULED'].includes(a.data?.status)||a.data.publish_at&&Date.parse(a.data.publish_at)>Date.now())throw new HttpError(400,'Chọn bài đã công khai để tạo link chiến dịch.');
  const id=randomUUID(),r=await db.from('news_campaigns').insert({id,name:input.name.trim(),source:input.source,article_id:input.articleId,created_by:profile.id});if(r.error)throw new HttpError(503,'Chưa tạo được chiến dịch.');
  await db.from('security_audit').insert({actor_id:profile.id,action:'NEWS_CAMPAIGN_CREATED',details:{id,articleId:input.articleId}});
  return Response.json({ok:true,url:'https://reloo.vn/news/'+a.data.slug+'?reloo_campaign='+id+'&utm_source='+input.source});
 }
 if(input.action!=='REVIEW'||!['APPROVED','CHANGES_REQUIRED'].includes(input.status)||typeof input.note!=='string'||input.note.trim().length<10||input.note.length>2000||!Number.isInteger(input.version)||input.status==='APPROVED'&&input.sourcesChecked!==true)throw new HttpError(400,'Nhập ghi chú duyệt và xác nhận đã đối chiếu nguồn khi duyệt đạt.');
 const r=await db.rpc('reloo_review_news_quality',{p_actor:profile.id,p_article:input.articleId,p_version:input.version,p_status:input.status,p_note:input.note.trim(),p_sources:input.sourcesChecked===true});
 if(r.error)throw new HttpError(409,'Bài đã thay đổi hoặc chưa lưu được đánh giá. Hãy làm mới.');return Response.json({ok:true});
 }catch(e){return errorResponse(e);}}
