import {requireAccount} from '@/lib/security/authorization';
import {assertOrigin,readJson,errorResponse,HttpError,rateLimit} from '@/lib/server/http';
import {prepareListingImages} from '@/lib/images/listing-media';
import {addressCatalog} from '@/lib/profile/address-server';
import {CATEGORIES} from '@/lib/constants';
import {UUID,validPoint} from '@/lib/nearby-requests/policy';
import {integrationConfig} from '@/lib/operations/integrations';
const fail=message=>{throw new HttpError(400,message);};
export async function GET(request){try{
 const {db,profile}=await requireAccount(request,{active:false});
 const [requests,location]=await Promise.all([db.from('nearby_requests').select('id,title,mode,status,match_status,recipient_count,created_at,expires_at,province_name').eq('profile_id',profile.id).order('created_at',{ascending:false}).limit(30),db.from('nearby_member_locations').select('province_code,province_name,email_enabled,updated_at').eq('profile_id',profile.id).maybeSingle()]);
 if(requests.error||location.error)throw new HttpError(503,'Chưa tải được nhu cầu quanh bạn.');
 let emailReady=false;try{const c=await integrationConfig(db,'GMAIL');emailReady=!!c.sender&&['GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN'].every(k=>!!c[k]);}catch{}
 return Response.json({ok:true,requests:requests.data,subscription:location.data,emailReady},{headers:{'Cache-Control':'private,no-store'}});
 }catch(e){return errorResponse(e);}}
export async function POST(request){let prepared,committed=false;try{
 assertOrigin(request);rateLimit(request,'nearby-write',10,60000);
 const input=await readJson(request,4000000),{db,profile}=await requireAccount(request,{scope:'inquiry_write',identity:input.action==='CREATE'&&input.mode==='RENT',active:input.action!=='UNSUBSCRIBE'&&input.action!=='CLOSE'});
 if(input.action==='UNSUBSCRIBE'){
  const r=await db.from('nearby_member_locations').update({email_enabled:false,updated_at:new Date().toISOString()}).eq('profile_id',profile.id);if(r.error)throw new HttpError(503,'Chưa tắt được email.');return Response.json({ok:true});
 }
 if(input.action==='CLOSE'){
  if(!UUID.test(input.id||''))fail('Nhu cầu không hợp lệ.');
  const r=await db.from('nearby_requests').update({status:'CLOSED'}).eq('id',input.id).eq('profile_id',profile.id).select('id').maybeSingle();if(r.error)throw new HttpError(503,'Chưa đóng được nhu cầu.');if(!r.data)throw new HttpError(404,'Không tìm thấy nhu cầu.');return Response.json({ok:true});
 }
 if(!['CREATE','SUBSCRIBE'].includes(input.action))fail('Thao tác không hợp lệ.');
 if(!validPoint(input.coords))fail('Cần định vị chính xác để tìm trong bán kính 10 km.');
 const provinces=await addressCatalog.provinces(),province=provinces.find(p=>p.code===input.province_code);
 if(!province)fail('Vui lòng xác nhận tỉnh/thành phố hiện tại.');
 if(input.action==='SUBSCRIBE'){
  if(input.consent!==true)fail('Cần đồng ý nhận email nhu cầu gần đây.');
  const r=await db.from('nearby_member_locations').upsert({profile_id:profile.id,province_code:province.code,province_name:province.name,latitude:input.coords.lat,longitude:input.coords.lng,email_enabled:true,updated_at:new Date().toISOString()});if(r.error)throw new HttpError(503,'Chưa lưu được lựa chọn nhận email.');return Response.json({ok:true});
 }
 if(!UUID.test(input.id||'')||typeof input.title!=='string'||input.title.trim().length<3||input.title.length>160||typeof input.description!=='string'||input.description.trim().length<10||input.description.length>2000||!CATEGORIES.some(c=>c.id===input.category)||!['RENT','BUY'].includes(input.mode))fail('Kiểm tra tên món đồ, mô tả, danh mục và nhu cầu thuê/mua.');
 if(input.budget_vnd!==null&&(!Number.isSafeInteger(input.budget_vnd)||input.budget_vnd<0||input.budget_vnd>1000000000))fail('Ngân sách không hợp lệ.');
 if(input.needed_on&&(!/^\d{4}-\d{2}-\d{2}$/.test(input.needed_on)||!Number.isFinite(Date.parse(input.needed_on))||input.needed_on<new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date())))fail('Ngày cần sử dụng không hợp lệ.');
 if(!Array.isArray(input.images)||input.images.length>1||input.images.some(s=>typeof s!=='string'||s.length>3500000||!/^data:image\/(jpeg|png|webp);base64,/.test(s)))fail('Chỉ đính kèm tối đa một ảnh JPEG, PNG hoặc WebP.');
 const prior=await db.from('nearby_requests').select('id').eq('id',input.id).eq('profile_id',profile.id).maybeSingle();if(prior.error)throw new HttpError(503,'Chưa kiểm tra được nhu cầu.');if(prior.data)return Response.json({ok:true,id:prior.data.id});
 prepared=await prepareListingImages(input.images,{db,ownerId:profile.id,purpose:'nearby-request'});
 const r=await db.rpc('reloo_create_nearby_request',{p_actor:profile.id,p_id:input.id,p_data:{title:input.title.trim(),description:input.description.trim(),category:input.category,mode:input.mode,budget_vnd:input.budget_vnd,province_code:province.code,province_name:province.name,latitude:input.coords.lat,longitude:input.coords.lng,images:prepared.urls,needed_on:input.needed_on||null}});
 if(r.error)throw new HttpError(r.error.message?.includes('NEARBY_DAILY_LIMIT')?429:503,r.error.message?.includes('NEARBY_DAILY_LIMIT')?'Bạn có thể gửi tối đa 3 nhu cầu trong 24 giờ.':'Chưa lưu được nhu cầu. Vui lòng thử lại.');
 committed=true;return Response.json({ok:true,id:r.data},{status:201});
 }catch(e){if(prepared&&!committed)await prepared.rollback();return errorResponse(e);}}
