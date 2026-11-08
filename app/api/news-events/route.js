import {securityDb} from '@/lib/security/service';
import {privateHash} from '@/lib/operations/crypto';
import {assertOrigin,readJson,errorResponse,HttpError,rateLimit} from '@/lib/server/http';
import {analyticsConsent,eventPayload} from '@/lib/content/news-measurement';
export async function POST(request){try{
 assertOrigin(request);if(!analyticsConsent(request.headers.get('cookie')||''))throw new HttpError(403,'Chưa đồng ý thống kê truy cập.');
 if(request.headers.get('sec-gpc')==='1'||request.headers.get('dnt')==='1')return new Response(null,{status:204});
 rateLimit(request,'news-events',120,60000);let data;try{data=eventPayload(await readJson(request,2000));}catch{throw new HttpError(400,'Sự kiện thống kê không hợp lệ.');}
 const {visitorId,sessionId,...event}=data;
 const result=await securityDb().rpc('reloo_record_news_event',{p_data:event,p_visitor:privateHash('NEWS_VISITOR',visitorId),p_session:privateHash('NEWS_SESSION',sessionId)});if(result.error)throw new HttpError(503,'Chưa ghi nhận được thống kê.');
 return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
 }catch(e){return errorResponse(e);}}
