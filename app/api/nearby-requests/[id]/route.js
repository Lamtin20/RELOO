import {requireAccount} from '@/lib/security/authorization';
import {assertOrigin,readJson,errorResponse,HttpError} from '@/lib/server/http';
import {UUID,compatibleAsset} from '@/lib/nearby-requests/policy';
async function accessible(db,profile,id){
 if(!UUID.test(id))throw new HttpError(404,'Không tìm thấy nhu cầu.');
 const r=await db.from('nearby_requests').select('*').eq('id',id).maybeSingle();if(r.error)throw new HttpError(503,'Chưa tải được nhu cầu.');if(!r.data)throw new HttpError(404,'Không tìm thấy nhu cầu.');
 if(r.data.profile_id!==profile.id){const d=await db.from('nearby_request_deliveries').select('profile_id').eq('request_id',id).eq('profile_id',profile.id).maybeSingle();if(d.error)throw new HttpError(503,'Chưa xác minh được quyền xem.');if(!d.data)throw new HttpError(404,'Không tìm thấy nhu cầu.');}
 return r.data;
}
export async function GET(request,{params}){try{
 const {db,profile}=await requireAccount(request,{active:false}),{id}=await params,r=await accessible(db,profile,id),own=r.profile_id===profile.id;
 const offers=own?await db.from('nearby_request_offers').select('asset_id,created_at').eq('request_id',id).order('created_at',{ascending:false}):{data:[]};
 const assets=own?{data:[]}:await db.from('assets').select('id,title,category,listing_data,status,is_locked').eq('owner_id',profile.id).eq('category',r.category).eq('status','available');
 const deliveries=own?await db.from('nearby_request_deliveries').select('status').eq('request_id',id):{data:[]};
 if(deliveries.error)throw new HttpError(503,'Chưa tải được trạng thái gửi email.');
 const deliverySummary={queued:0,sent:0,review:0,skipped:0};for(const d of deliveries.data){if(d.status==='SENT')deliverySummary.sent++;else if(['SENDING','FAILED'].includes(d.status))deliverySummary.review++;else if(d.status==='SKIPPED')deliverySummary.skipped++;else deliverySummary.queued++;}
 if(offers.error||assets.error)throw new HttpError(503,'Chưa tải được phản hồi.');
 return Response.json({ok:true,request:{id:r.id,title:r.title,description:r.description,mode:r.mode,category:r.category,budget_vnd:r.budget_vnd,province_name:r.province_name,images:r.images,status:r.status,expires_at:r.expires_at,needed_on:r.needed_on,recipient_count:own?r.recipient_count:undefined,match_status:own?r.match_status:undefined},own,deliverySummary:own?deliverySummary:undefined,offers:offers.data,assets:assets.data.filter(a=>compatibleAsset(r,a))},{headers:{'Cache-Control':'private,no-store'}});
 }catch(e){return errorResponse(e);}}
export async function POST(request,{params}){try{
 assertOrigin(request);const {db,profile}=await requireAccount(request,{scope:'inquiry_write',identity:true}),{id}=await params,r=await accessible(db,profile,id),input=await readJson(request,2000);
 if(r.profile_id===profile.id||r.status!=='OPEN'||Date.parse(r.expires_at)<=Date.now())throw new HttpError(409,'Nhu cầu đã đóng hoặc không thể phản hồi.');
 const a=await db.from('assets').select('id,title,owner_id,category,listing_data,status,is_locked').eq('id',String(input.asset_id||'')).eq('owner_id',profile.id).maybeSingle();
 if(a.error||!a.data||!compatibleAsset(r,a.data))throw new HttpError(400,'Chọn tin đăng phù hợp đang thuộc sở hữu của bạn.');
 const saved=await db.rpc('reloo_offer_nearby_request',{p_actor:profile.id,p_request:id,p_asset:a.data.id});if(saved.error)throw new HttpError(409,'Chưa gửi được phản hồi. Nhu cầu hoặc tin đăng có thể vừa thay đổi.');
 return Response.json({ok:true});
 }catch(e){return errorResponse(e);}}
