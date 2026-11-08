// Bounded conversational guidance. Only public catalog facts become cards/actions.
export const normalizeNeed=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const categories=[['camera',/may anh|camera/,['Máy ảnh','Camera']],['camping',/cam trai|camping|\bleu\b/,['Lều cắm trại','Đồ dã ngoại']],['audio',/loa|am thanh|speaker/,['Loa','Micro']],['projector',/may chieu|projector/,['Máy chiếu']]];
export function conversationNeed(message,history=[]){
 const turns=[...history.filter(m=>m.role==='USER').map(m=>m.body||m.text||''),message];
 let category=null,query='',budget=null,region=null;
 for(const turn of turns){const s=normalizeNeed(turn);if(/tim mon khac|find another item/.test(s)){category=null;query='';budget=null;region=null;continue;}const found=categories.find(([,pattern])=>pattern.test(s));if(found){category=found[0];query=turn;}else if(/\b(thue|rent|mua|buy)\s+\S+\s+\S+/.test(s)&&!/ngan sach|budget|tien coc|deposit/.test(s)){category=null;query=turn;}
  if(/ho chi minh|tp\.?\s*hcm|sai gon/.test(s))region='ho chi minh';else if(/ha noi|hanoi/.test(s))region='ha noi';else if(/da nang|danang/.test(s))region='da nang';
  const cap=s.match(/(?:duoi|toi da|ngan sach|under|budget)\s*(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|trieu|m|vnd|d)?\b/);
  if(cap){const value=Number(cap[1].replace(',','.'))*({k:1000,nghin:1000,ngan:1000,trieu:1000000,m:1000000}[cap[2]]||1);if(Number.isSafeInteger(value)&&value>0)budget=value;}
 }
 // New category overrides earlier categories; a generic location/price follow-up keeps it.
 return {category,query:query||message,budget,region};
}
export function commerceReply({intent,products,message,history=[],currentListing=false,locale='vi-VN'}){
 const en=locale==='en-US',need=conversationNeed(message,history),s=normalizeNeed(message);
 const suggestions=en?['Rent an item','Buy pre-owned','Order support']:['Thuê đồ','Mua đồ cũ','Hỗ trợ đơn hàng'];
 if(!['rent','sale','discover'].includes(intent))return null;
 if(intent==='discover'&&!need.category&&!products.length)return {answer:en?'What are you looking for today?':'Bạn đang muốn thuê hay mua món gì?',suggestions};
 if(!currentListing&&!need.category&&/^(toi |minh )?(can |muon )?(thue do|thue|rent an item|rent)$/i.test(s.trim()))return {answer:en?'What will you use it for?':'Bạn cần đồ cho dịp nào?',suggestions:en?['Camera','Camping','Speaker','Projector']:['Máy ảnh','Cắm trại','Loa','Máy chiếu'],products:[]};
 if(!products.length)return {answer:en?'I could not find a matching public listing. Would you like to try another item or ask staff?':'Mình chưa tìm thấy tin phù hợp đang hiển thị. Bạn muốn tìm món khác hay nhờ nhân viên hỗ trợ?',suggestions:en?['Find another item','Talk to staff']:['Tìm món khác','Gặp nhân viên'],products:[]};
 if(currentListing){
  const p=products[0],money=new Intl.NumberFormat(locale,{style:'currency',currency:'VND',maximumFractionDigits:0}).format(p.dailyPrice),unit=en?{DAY:'day',WEEK:'week',MONTH:'month',SALE:'item'}:{DAY:'ngày',WEEK:'tuần',MONTH:'tháng',SALE:'món'};
  const answer=/giao|delivery|nhan do/.test(s)?(en?'Delivery options and fees are checked with your dates before you send a request.':'Bạn có thể xem cách giao nhận và phí khi chọn lịch; chưa rõ phí sẽ cần chủ đồ xác nhận.'):/con khong|available/.test(s)?(en?'This listing is public. Availability for your dates still needs checking.':'Tin đang được hiển thị. Còn đồ đúng lịch của bạn cần kiểm tra khi chọn thời gian.'):(en?`${p.title}: ${money} / ${unit[p.unit]||'period'}. ${intent==='sale'?'Review the item and checkout terms.':'When would you like to rent it?'}`:`${p.title}: ${money} / ${unit[p.unit]||'kỳ'}. ${intent==='sale'?'Bạn xem tình trạng và điều kiện mua nhé.':'Bạn muốn thuê vào lúc nào?'}`);
  return {answer,suggestions:en?['Deposit','Delivery','Talk to staff']:['Tiền cọc','Giao nhận','Gặp nhân viên'],actions:[{kind:intent==='sale'?'purchase':'rent',label:en?(intent==='sale'?'Review purchase':'Choose dates & review price'):(intent==='sale'?'Xem thông tin mua':'Chọn lịch · Xem giá'),href:`/${intent==='sale'?'purchase':'rent'}/${encodeURIComponent(p.id)}`}]};
 }
 return {answer:en?'Here are matching listings. Choose one to review details and dates.':'Mình tìm được các lựa chọn này. Bạn chọn món phù hợp để xem lịch và giá nhé.',suggestions:en?['Deposit','Talk to staff']:['Tiền cọc','Gặp nhân viên']};
}
