import {RENTAL_RETURN_POLICY} from '../rental-return-policy.js';
export const CONTACT_NOTICE='advisor-contact-v1';
const intents=['rent','stays','jobs','sale','late','deposit','handoff','discover'];
export function rankAdvisorProducts(products,message){
 const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
 const stop=new Set(['toi','minh','muon','thue','mua','can','tim','cho','mot','san','pham','gia','bao','nhieu','co','khong','xin','the','nay','la','va','do']);
 const words=[...new Set(normalize(redactAdvisorText(message)).split(/[^a-z]+/).filter(w=>w.length>1&&!stop.has(w)))];
 if(!words.length)return products;
 const scored=products.map(p=>({p,score:words.filter(w=>normalize(p.title+' '+p.category).includes(w)).length})).sort((a,b)=>b.score-a.score);
 return scored.some(x=>x.score>0)?scored.filter(x=>x.score>0).map(x=>x.p):[];
}
export function advisorContext(path=''){
 if(typeof path!=='string'||path.length>250||path.includes('?')||path.includes('#'))return {path:'/',listingId:null};
 const match=path.match(/^\/(?:product|rent)\/([a-zA-Z0-9_-]{1,150})$/);
 return {path:match?path:/^\/(?:dat-phong|viec-lam(?:\/dich-vu)?|explore|pricing)(?:\/)?$/.test(path)?path:'/',listingId:match?.[1]||null};
}
export function redactAdvisorText(text){return String(text).replace(/(?:password|mật khẩu|token|otp)\s*[:=]\s*\S+/gi,'[secret]').replace(/Bearer\s+[a-z0-9._-]+/gi,'[secret]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/(?:\+?\d[\s.-]?){6,}/g,'[number]').slice(0,2000)}
export function advisorIntent(message,history=[],context={}){
 const s=String(message).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
 if(/tim mon khac|find another item/.test(s))return 'discover';
 if(/ho tro don|order support/.test(s))return 'handoff';
 if(/nhan vien|nguoi that|human|staff|khieu nai|tranh chap|hoan tien|huy don|refund|cancel|dispute/.test(s))return 'handoff';
 if(/tra tre|tra cham|late|qua han/.test(s))return 'late';
 if(/tien coc|dat coc|deposit/.test(s))return 'deposit';
 if(/phong|khach san|hotel|stay/.test(s))return 'stays';
 if(/viec lam|ung tuyen|job|(?:can|tim|thue)\s+nguoi|(?:nguoi|tho|dich vu)\s+(?:lap rap|chuyen do|chup anh)|assembly service|moving service|photographer/.test(s))return 'jobs';
 if(/mua|ban lai|do cu|buy|sale/.test(s))return 'sale';
 if(/may anh|camera|cam trai|camping|\bleu\b|\bloa\b|may chieu|projector/.test(s))return 'rent';
 if(context.path?.startsWith('/viec-lam')&&!/\b(thue|rent)\b/.test(s))return 'jobs';
 if(/thue|gia|rent|price/.test(s))return 'rent';
 if(context.listingId)return 'rent';
 if(context.path?.startsWith('/dat-phong'))return 'stays';
 if(context.path==='/viec-lam')return 'jobs';
 if(history.length)return advisorIntent(history.filter(m=>m.role==='USER').at(-1)?.body||'',[],context);
 return context.path?.startsWith('/dat-phong')?'stays':context.path==='/viec-lam'?'jobs':'discover';
}
export function safeAiSelection(value,products){
 if(!value||!intents.includes(value.intent)||!Array.isArray(value.productIds)||value.productIds.length>3)return null;
 if(value.productIds.some(id=>!products.some(p=>p.id===id)))return null;
 return {intent:value.intent,productIds:[...new Set(value.productIds)]};
}
export function contactInput(input){
 if(input?.consent!==true||input.noticeVersion!==CONTACT_NOTICE)throw Error('CONTACT_CONSENT_REQUIRED');
 const name=String(input.name||'').trim(),email=String(input.email||'').trim(),phone=String(input.phone||'').replace(/[\s.-]/g,'');
 if(name.length>80||email.length>200||(!email&&!phone)||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone&&!/^(?:0\d{9}|\+84\d{9})$/.test(phone))throw Error('CONTACT_INVALID');
 return {name,email,phone};
}
export function composeAdvisor({intent,products=[],locale='vi-VN',currentListing=false}){
 const en=locale==='en-US',money=n=>new Intl.NumberFormat(locale,{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
 const copy={
 discover:en?'What do you need: rent an item, find a stay, buy pre-owned or get order support?':'Bạn muốn thuê đồ, tìm phòng, mua đồ cũ hay cần hỗ trợ giao dịch?',
 rent:en?'Choose rental dates to check the server quote. Deposit, delivery and owner confirmation are shown before sending a request.':'Bạn chọn ngày giờ để kiểm tra báo giá. Tiền cọc, giao nhận và xác nhận của chủ đồ cần được xem trước khi gửi yêu cầu.',
 stays:en?'Stays currently show demo data; real bookings are unavailable. Default check-in is 14:00 and checkout is 12:00, Vietnam time.':'Đặt phòng hiện là bản trải nghiệm, chưa nhận đặt phòng thật. Giờ mặc định: nhận 14:00, trả 12:00 theo giờ Việt Nam.',
 jobs:en?'Flexible Jobs is not accepting real applications yet. You can review the service page.':'Việc làm linh hoạt chưa nhận ứng tuyển thật. Bạn có thể xem thông tin trên trang dịch vụ.',
 sale:en?'Check the listed sale price and condition, then review pickup and payment terms with the seller. No purchase is created by this chat.':'Bạn xem giá bán và tình trạng, rồi kiểm tra giao nhận, thanh toán với người bán. Chat này không tự tạo đơn mua.',
 late:en?'Under 1 hour late: free. From 1 through 6 hours: agreed average daily rent ÷ 24 × actual late hours. Over 6 hours: one day. Applies only where the accepted agreement contains this rule; no automatic debit.':'Trễ dưới 1 giờ: miễn phí. Từ 1 đến hết 6 giờ: giá thuê trung bình ngày đã thỏa thuận ÷ 24 × số giờ trễ thực tế. Trên 6 giờ: 1 ngày. Chỉ áp dụng nếu thỏa thuận đã chấp nhận có quy tắc này; không tự trừ tiền.',
 deposit:en?'Deposit depends on the listing and accepted agreement. A missing amount needs owner confirmation; it is not automatically zero.':'Tiền cọc theo tin đăng và thỏa thuận được chấp nhận. Nếu chưa có mức cọc, cần chủ đồ xác nhận; không tự hiểu là miễn cọc.',
 handoff:en?'You can request staff assistance. Leave an optional contact with consent so RELOO can reply. This chat cannot resolve disputes or authorize refunds.':'Bạn có thể yêu cầu nhân viên hỗ trợ và chủ động để lại liên hệ để RELOO phản hồi. Chat không tự xử lý tranh chấp hay phê duyệt hoàn tiền.'};
 const selected=products.slice(0,6).map(p=>({id:p.id,title:p.title,href:'/product/'+encodeURIComponent(p.id),price:p.dailyPrice,unit:p.unit||'DAY',images:p.images||[],location:p.location||''}));
 let answer=copy[intent]||copy.discover;
 if(intent==='rent'&&selected[0])answer=(currentListing?(en?'Current listing: ':'Tin đang xem: '):(en?'Illustrative option: ':'Lựa chọn tham khảo: '))+selected[0].title+' · '+money(selected[0].price)+' / '+(en?{DAY:'day',WEEK:'week',MONTH:'month'}:{DAY:'ngày',WEEK:'tuần',MONTH:'tháng'})[selected[0].unit]+'. '+answer;
 if(intent==='deposit'&&Number.isSafeInteger(products[0]?.rentalDetails?.depositAmount))answer=(en?'Listed deposit: ':'Mức cọc đăng trên tin: ')+money(products[0].rentalDetails.depositAmount)+'. '+answer;
 return {answer,products:['rent','sale','discover'].includes(intent)?selected:[],sources:[{title:en?'Rental information':'Thông tin thuê',url:'/cms/rental-guide'}],suggestions:en?['Rental price','Deposit','Late return','Talk to staff']:['Giá thuê','Tiền cọc','Trả trễ','Gặp nhân viên'],policyVersion:RENTAL_RETURN_POLICY.version};
}
