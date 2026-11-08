import {requireAccount} from '@/lib/security/authorization';
import {errorResponse,HttpError,rateLimit} from '@/lib/server/http';
import {RENTAL_STATES,LOCAL_STATES,normalizeLocalOrder,mergeRentalPage} from '@/lib/dashboard/unified-orders';
export async function GET(request){try{
 const {db,profile}=await requireAccount(request,{active:false});rateLimit(request,'dashboard-orders:'+profile.id,40,60000);
 const p=new URL(request.url).searchParams,tab=p.get('tab')||'all',page=Number(p.get('page')||1);
 if(tab!=='all'&&!RENTAL_STATES[tab]||!Number.isInteger(page)||page<1||page>100)throw new HttpError(400,'Bộ lọc đơn hàng không hợp lệ.');
 if(!/^[a-zA-Z0-9_-]{1,150}$/.test(profile.id))throw new HttpError(403,'Tài khoản không hợp lệ.');
 let standard=db.from('transactions').select('id,asset_id,renter_id,lender_id,status,start_date,end_date,grand_total,created_at,assets(title,images)').or('renter_id.eq.'+profile.id+',lender_id.eq.'+profile.id).order('created_at',{ascending:false}).order('id');
 let scheduled=db.from('nk_orders').select('id,asset_id,renter_id,owner_id,status,starts_at,ends_at,snapshot,created_at,nk_listings(assets(images))').or('renter_id.eq.'+profile.id+',owner_id.eq.'+profile.id).order('created_at',{ascending:false}).order('id');
 if(RENTAL_STATES[tab])standard=standard.in('status',RENTAL_STATES[tab]);
 if(LOCAL_STATES[tab])scheduled=scheduled.in('status',LOCAL_STATES[tab]);
 if(tab==='overdue')scheduled=scheduled.lt('ends_at',new Date().toISOString());
 const [a,b]=await Promise.all([standard.range(0,page*30),scheduled.range(0,page*30)]);
 if(a.error||b.error)throw new HttpError(503,'Chưa tải được đầy đủ danh sách đơn hàng.');
 const standardOrders=a.data.map(o=>({id:o.id,source:'standard',listingId:o.asset_id,renterId:o.renter_id,lenderId:o.lender_id,status:o.status,startDate:o.start_date,endDate:o.end_date,grandTotal:o.grand_total,createdAt:o.created_at,listing:{title:o.assets?.title||o.asset_id,images:o.assets?.images||[]}}));
 return Response.json({ok:true,page,...mergeRentalPage(standardOrders,b.data.map(normalizeLocalOrder),page)},{headers:{'Cache-Control':'private,no-store'}});
}catch(e){return errorResponse(e);}}
