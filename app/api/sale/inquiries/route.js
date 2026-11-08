import {randomUUID} from 'node:crypto';
import {requireAccount} from '@/lib/security/authorization';
import {assertOrigin,errorResponse,HttpError,readJson} from '@/lib/server/http';
import {canBuy} from '@/lib/commerce';
export async function POST(request){try{
 assertOrigin(request);
 const {profile,db}=await requireAccount(request,{scope:'inquiry_write'}),input=await readJson(request);
 if(typeof input.listingId!=='string'||input.listingId.length>100)throw new HttpError(400,'Sản phẩm chưa hợp lệ.');
 const {data:asset,error}=await db.from('assets').select('id,title,status,is_locked,listing_data').eq('id',input.listingId).maybeSingle();
 if(error||!asset||asset.status!=='available'||asset.is_locked||!canBuy(asset.listing_data))throw new HttpError(409,'Sản phẩm hiện chưa mở bán.');
 const price=asset.listing_data.salePrice;
 const result=await db.rpc('reloo_create_inquiry',{p_profile_id:profile.id,p_listing_id:asset.id,p_message:{id:randomUUID(),type:'text',text:`Tôi muốn mua ${asset.title} với giá niêm yết ${new Intl.NumberFormat('vi-VN').format(price)} đ. Vui lòng xác nhận tình trạng và cách giao nhận.`,transactionMode:'SALE',salePrice:price}});
 if(result.error)throw new HttpError(403,'Chưa gửi được yêu cầu mua. Hai bên cần đủ điều kiện giao dịch.');
 return Response.json({ok:true,...result.data});
 }catch(e){return errorResponse(e);}}
