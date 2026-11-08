export const NEWS_TOPICS=[
 {slug:'kinh-nghiem-thue-mua',name:'Kinh nghiệm thuê–mua',label:'Thuê & mua',symbol:'',description:'Hướng dẫn thuê đồ, kiểm tra tình trạng sản phẩm và chuẩn bị giao nhận. Tìm hiểu trước để chọn món đồ phù hợp nhu cầu.',match:/cẩm nang|kinh nghiệm|hướng dẫn|chủ đồ|thuê và mua|thuê–mua/i},
 {slug:'loi-ich-cua-thue',name:'Lợi ích của thuê đồ',label:'Vì sao nên thuê?',symbol:'↻',description:'Cân nhắc thuê hay mua theo tần suất sử dụng, tổng chi phí và điều kiện thực tế. Không phải nhu cầu nào cũng cần sở hữu.',match:/lợi ích|thuê hay mua|chi phí thuê/i},
 {slug:'san-pham-thiet-bi',name:'Sản phẩm & thiết bị',label:'Sản phẩm',symbol:'▧',description:'Thông tin máy ảnh, điện tử, đồ cắm trại và các nhóm hàng RELOO. Hiểu tính năng và nhu cầu trước khi chọn thuê hoặc mua.',match:/thiết bị|sản phẩm|nhóm hàng|điện tử|máy ảnh|camping/i},
 {slug:'tai-chinh-ca-nhan',name:'Tài chính cá nhân',label:'Chi tiêu thông minh',symbol:'◎',description:'Kiến thức quản lý chi tiêu, lập ngân sách và cân nhắc nhu cầu mua sắm. Xem xét khả năng tài chính trước mỗi lựa chọn.',match:/tài chính cá nhân|chi tiêu|ngân sách/i},
 {slug:'tai-chinh-dau-tu',name:'Tin tài chính & đầu tư',label:'Tài chính & đầu tư',symbol:'⌁',description:'Thông tin tài chính và đầu tư có nguồn dẫn, thời điểm và phạm vi thị trường rõ ràng. Nội dung tham khảo, không phải khuyến nghị đầu tư cá nhân.',match:/đầu tư|tin tài chính|thị trường/i},
 {slug:'song-xanh-tai-su-dung',name:'Sống xanh & tái sử dụng',label:'Sống xanh',symbol:'♧',description:'Câu chuyện tái sử dụng, sửa chữa và tiêu dùng có trách nhiệm. Khám phá cách kéo dài vòng đời đồ dùng từ những lựa chọn thực tế.',match:/môi trường|bền vững|sống xanh|tái sử dụng/i},
];
export function topicForArticle(row){return NEWS_TOPICS.find(t=>t.match.test(row.category||''))||NEWS_TOPICS.find(t=>t.match.test((row.tags||[]).join(' ')))||NEWS_TOPICS[0];}
export const topicBySlug=slug=>NEWS_TOPICS.find(t=>t.slug===slug);
export function filterNews(rows,{topic,q='',page=1,pageSize=12}={}){
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
 const terms=normalize(q).trim().split(/\s+/).filter(Boolean);
 const matches=rows.filter(r=>(!topic||topicForArticle(r).slug===topic.slug)&&terms.every(term=>normalize([r.title,r.excerpt,...(r.tags||[])].join(' ')).includes(term)));
 const pages=Math.max(1,Math.ceil(matches.length/pageSize)),current=Math.min(Math.max(1,Math.floor(Number(page))||1),pages);
 return {rows:matches.slice((current-1)*pageSize,current*pageSize),total:matches.length,pages,page:current};
}
