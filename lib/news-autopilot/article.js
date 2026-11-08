import {sourceHash} from './policy.js';
import {FINANCIAL_TOPICS,topicLabel} from './topics.js';
function slug(value){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);}
const safe=text=>String(text||'').replace(/[\[\]<>*_`#]/g,'').trim();
export function buildAutomaticArticle(g,source){
 const date=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(source.date));
 const observed=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date());
 const financial=FINANCIAL_TOPICS.includes(source.topic);
 const body=[
  `${safe(g.excerpt)}\n\nTheo thông tin do **${safe(source.publisher)}** công bố ngày ${date}, dưới đây là những điểm đáng chú ý từ thông báo gốc.`,
  source.jurisdiction?`**Phạm vi thông tin:** ${safe(source.jurisdiction)}.`:'',
  '## Thông tin chính từ nguồn công bố\n\n'+g.facts.map(f=>'- '+safe(f.statement)).join('\n'),
  '## Bối cảnh và điều cần hiểu\n\n'+safe(g.context),
  '## Cân nhắc theo nhu cầu của bạn\n\n'+safe(g.readerAdvice),
  financial?'### Hiểu đúng phạm vi bản tin\n\nBài viết tóm lược thông tin công bố tại thời điểm nêu trên, không phải khuyến nghị đầu tư cá nhân hay tín hiệu mua/bán. Thông tin lịch sử và dự báo không bảo đảm kết quả tương lai. Không áp dụng lãi suất, đồng tiền hoặc quy định của thị trường nước ngoài cho sản phẩm tại Việt Nam.':source.topic==='ENVIRONMENT'?'### Từ thông tin đến lựa chọn tiêu dùng\n\nĐọc đúng phạm vi và phương pháp trong nguồn gốc. Việc thuê hay mua có phù hợp hay không còn phụ thuộc nhu cầu sử dụng, độ bền, vận chuyển và điều kiện thực tế; bài viết không quy đổi thành lượng phát thải được tiết kiệm khi chưa có dữ liệu.':'### Trước khi quyết định thuê hoặc mua\n\nĐối chiếu đúng model, phiên bản, phụ kiện và điều kiện của từng tin đăng. Thông báo của hãng không đồng nghĩa món đồ đã được đăng trên RELOO hoặc sẵn tại Việt Nam. Nếu tìm thấy tin phù hợp, hãy hỏi trực tiếp chủ đồ về tình trạng, lịch trống và giá cuối cùng.',
  '### Tiếp tục tìm hiểu trên RELOO\n\nBạn có thể [khám phá sản phẩm](/explore) và trao đổi với chủ đồ trước khi gửi yêu cầu. Hãy đọc thông tin tin đăng và thống nhất điều kiện giao dịch với chủ đồ.',
  `## Nguồn và thời điểm kiểm tra\n\n- [${safe(source.title)} — ${safe(source.publisher)}](${source.url})\n- Ngày nguồn công bố: ${date}. RELOO kiểm tra nguồn lúc ${observed} (giờ Việt Nam).\n- Bài tóm lược được AI hỗ trợ và qua bộ kiểm tra tự động; không phải trải nghiệm dùng thử hay đánh giá độc lập. Ảnh là minh họa do RELOO thiết kế, không phải ảnh chụp sự kiện hoặc mẫu sản phẩm chính thức.`,
 ].join('\n\n');
 return {title:safe(g.title),slug:slug(g.title)+'-'+sourceHash(source.url).slice(0,8),excerpt:safe(g.excerpt),body,cover_alt:'Minh họa RELOO cho bản tin: '+safe(g.title),seo_title:safe(g.title).slice(0,72),seo_description:safe(g.excerpt).slice(0,175),category:topicLabel(source.topic),tags:[topicLabel(source.topic),'Nguồn chính thức','AI hỗ trợ']};
}
