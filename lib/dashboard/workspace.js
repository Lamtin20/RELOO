import {uiText} from '../i18n/ui.js';
export const ACCOUNT_GROUPS=[
 {id:'trade',label:'Đơn & giao dịch',items:[['/dashboard/orders','Đơn thuê','orders'],['/dashboard/purchases','Mua & bán','purchases'],['/dashboard/agreements','Thỏa thuận thuê','agreements'],['/dashboard/audit','Kiểm tra tình trạng','audit']]},
 {id:'assets',label:'Đăng tin & tài sản',items:[['/dashboard/assets','Tài sản của tôi','assets'],['/dashboard/assets/new','Đăng sản phẩm',null],['/dashboard/analytics','Hiệu quả sản phẩm',null]]},
 {id:'connect',label:'Trao đổi & nhu cầu',items:[['/dashboard/messages','Hộp thư','messages'],['/?notifications=1','Thông báo','notifications'],['/needs','Nhu cầu thuê / mua','needs'],['/dashboard/activity','Hoạt động của tôi',null]]},
 {id:'finance',label:'Thu nhập & ưu đãi',items:[['/dashboard/cashflow','Thu nhập & thanh toán',null],['/dashboard/promotions','Chương trình ưu đãi',null],['/cashback','Mua sắm hoàn tiền',null],['/dashboard/ads','Quảng cáo',null]]},
 {id:'safety',label:'Hồ sơ & an toàn',items:[['/dashboard/profile','Thông tin cá nhân',null],['/dashboard/profile/residency','Nơi đang sống',null],['/dashboard/kyc/verify','Xác minh căn cước','identity'],['/dashboard/security','Hồ sơ an toàn',null]]},
 {id:'preferences',label:'Cài đặt & trợ giúp',items:[['/dashboard/profile/language','Ngôn ngữ',null],['/account/personalization','Cá nhân hóa',null],['/help','Trợ giúp',null]]},
];
export const ORDER_BUCKETS=[['all','Tất cả'],['pending','Chờ xử lý'],['active','Đang diễn ra'],['return','Chờ trả / kiểm tra'],['overdue','Quá hạn'],['completed','Hoàn tất'],['cancelled','Đã hủy']];
export function transactionBucket(order,tab){
 const status=String(order.status||'').toLowerCase();
 if(tab==='all')return true;
 if(tab==='pending')return status==='pending';
 if(tab==='active')return ['paid','audit_pickup','shipping','in_use'].includes(status);
 if(tab==='return')return status==='audit_return';
 if(tab==='completed')return status==='completed';
 if(tab==='cancelled')return ['cancelled','canceled','rejected','expired'].includes(status);
 if(tab==='overdue')return status==='overdue';
 return false;
}
export function workspaceSearch(query){return String(query||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/đ/g,'d').trim();}
export function groupTools(query=''){const q=workspaceSearch(query);return ACCOUNT_GROUPS.map(g=>({...g,items:g.items.filter(i=>!q||workspaceSearch(g.label+' '+i[1]+' '+uiText('en-US',g.label)+' '+uiText('en-US',i[1])).includes(q))})).filter(g=>g.items.length);}
export function neighborhoodBucket(o,tab,now=Date.now()){
 if(tab==='all')return true;if(tab==='pending')return ['DRAFT','PENDING_OWNER','PENDING_PAYMENT'].includes(o.status);
 if(tab==='active')return ['CONFIRMED','READY_FOR_HANDOVER','ACTIVE'].includes(o.status);
 if(tab==='return')return o.status==='RETURN_PENDING';if(tab==='completed')return o.status==='COMPLETED';if(tab==='cancelled')return ['CANCELLED','EXPIRED'].includes(o.status);
 return tab==='overdue'&&['ACTIVE','RETURN_PENDING'].includes(o.status)&&Date.parse(o.ends_at)<now;
}
