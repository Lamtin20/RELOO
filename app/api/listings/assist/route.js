import {assertOrigin,rateLimit,readJson,errorResponse,HttpError,clientIp} from '@/lib/server/http';
import {createHash,randomUUID} from 'node:crypto';
import {encodeWebp} from '@/lib/images/webp';
import {identifyProduct,researchProduct} from '@/lib/listing-ai/server';
import {PHOTO_ASSIST_NOTICE} from '@/lib/listing-ai/policy';
import {localVisionReady} from '@/lib/ai/local-model';
import {productSearchConfiguration} from '@/lib/listing-ai/search';
import {runListingAssist} from '@/lib/listing-ai/usage';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const enabled=()=>process.env.RELOO_LISTING_PHOTO_AI==='1';
export async function GET(){const configured=enabled(),ready=configured&&await localVisionReady(),search=productSearchConfiguration();return Response.json({ok:true,enabled:ready,configured,noticeVersion:PHOTO_ASSIST_NOTICE,imageStaysLocal:true,primarySearch:search.primary,searchReady:search.primary==='agent-reach'?search.fallbackReady:search.googleReady,fallbackReady:search.fallbackEnabled&&search.fallbackReady},{headers:{'Cache-Control':'no-store'}})}
export async function POST(request){try{
 assertOrigin(request);rateLimit(request,'listing-photo-ai',6);if(!enabled())throw new HttpError(503,'AI chưa sẵn sàng. Bạn vẫn có thể tự điền.','AI_UNAVAILABLE');
 const input=await readJson(request,440000);if(input.noticeVersion!==PHOTO_ASSIST_NOTICE||!['identify','enrich'].includes(input.action))throw new HttpError(400,'Yêu cầu không hợp lệ.','ASSIST_INVALID');
 if(input.requestId!==undefined&&(typeof input.requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(input.requestId)))throw new HttpError(400,'Yêu cầu không hợp lệ.','ASSIST_INVALID');
 const fingerprint=createHash('sha256').update(JSON.stringify([input.action,input.image,input.identity,input.locale])).digest('hex');
 let result;
 try{
 result=await runListingAssist({requestId:input.requestId||randomUUID(),fingerprint,scope:createHash('sha256').update(clientIp(request)||'shared').digest('hex')},async()=>{
  if(input.action==='identify'){
   if(typeof input.image!=='string'||!/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(input.image)||input.image.length>400000)throw new HttpError(400,'Chọn ảnh sản phẩm hợp lệ.','IMAGE_INVALID');
   const {data}=await encodeWebp(Buffer.from(input.image.split(',')[1],'base64'),{maxEdge:640,maxBytes:180000});return identifyProduct(data,{signal:request.signal});
  }return researchProduct(input.identity,{locale:input.locale==='en-US'?'en-US':'vi-VN',signal:request.signal});
 });
 }catch(e){if(e instanceof HttpError)throw e;const code=['AI_BUSY','AI_DAILY_LIMIT','IDEMPOTENCY_CONFLICT','IDENTITY_INVALID','IDENTITY_CONFLICT','RESEARCH_UNAVAILABLE'].includes(e.message)?e.message:'AI_UNAVAILABLE';throw new HttpError(['IDENTITY_INVALID','IDENTITY_CONFLICT','IDEMPOTENCY_CONFLICT'].includes(code)?400:code==='AI_DAILY_LIMIT'?429:503,'Chưa có gợi ý chắc chắn. Bạn có thể thử lại hoặc tự điền.',code);}
 return Response.json({ok:true,...result},{headers:{'Cache-Control':'private,no-store'}});
 }catch(e){return errorResponse(e)}}
