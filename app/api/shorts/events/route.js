import { securityDb } from '@/lib/security/service';
import { readShortTicket } from '@/lib/shorts/tickets';
import { assertOrigin,readJson,HttpError,errorResponse,rateLimit } from '@/lib/server/http';
export async function POST(request){try{
 assertOrigin(request);rateLimit(request,'short-events',240);const input=await readJson(request,5000),ticket=readShortTicket(input.ticket,'metrics');
 if(!ticket||!Array.isArray(input.events)||!input.events.length||input.events.length>8)throw new HttpError(400,'Lượt tương tác không hợp lệ.');
 const db=securityDb();
 for(const event of input.events){
  if(!['IMPRESSION','VIEW','PRODUCT_IMPRESSION','OPEN','CLICK'].includes(event.kind))throw new HttpError(400,'Loại tương tác không hợp lệ.');
  if(event.kind==='VIEW'&&(!Number.isFinite(event.playingMs)||event.playingMs<2000||Date.now()-ticket.issued<2000))throw new HttpError(400,'Lượt xem chưa đủ thời gian.');
  if(event.kind==='CLICK'&&(!ticket.products.includes(event.productId)||!/^[-a-f0-9]{36}$/i.test(event.productId)))throw new HttpError(400,'Sản phẩm không thuộc video.');
 }
 for(const event of input.events){const r=await db.rpc('reloo_count_short_event',{p_video:ticket.videoId,p_nonce:ticket.nonce,p_kind:event.kind,p_product:event.kind==='CLICK'?event.productId:null});if(r.error)throw new HttpError(409,'Lượt tương tác cần được ghi nhận theo thứ tự.');}
 return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
 }catch(e){return errorResponse(e);}}
