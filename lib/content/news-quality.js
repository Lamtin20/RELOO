import {parseArticle} from './article-outline.js';
export function auditNews(row){
 const ast=parseArticle(row.body||''),nodes=[];function walk(n){nodes.push(n);for(const c of n.children||[])walk(c);}walk(ast);
 const links=nodes.filter(n=>n.type==='link'),headings=nodes.filter(n=>n.type==='heading'),images=nodes.filter(n=>n.type==='image');
 const text=nodes.filter(n=>n.type==='text').map(n=>n.value).join(' '),words=text.trim().split(/\s+/).filter(Boolean).length;
 const title=row.seo_title||row.title||'',description=row.seo_description||row.excerpt||'';
 const checks=[
 ['title',title.length>=25&&title.length<=65,12,'Rà soát tiêu đề hiển thị tìm kiếm (gợi ý 25–65 ký tự).'],
 ['description',description.length>=80&&description.length<=170,10,'Bổ sung mô tả tìm kiếm rõ nội dung (gợi ý 80–170 ký tự).'],
 ['slug',/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug||'')&&(row.slug||'').length<=100,8,'Chuẩn hóa đường dẫn bài viết.'],
 ['body',words>=150,10,'Bài còn ngắn; kiểm tra xem đã trả lời đủ nhu cầu người đọc chưa.'],
 ['h2',headings.some(n=>n.depth===2),10,'Chia nội dung bằng tiêu đề H2 dễ đọc.'],
 ['h1',!headings.some(n=>n.depth===1),5,'Bỏ H1 trong thân bài vì trang đã có H1 là tiêu đề.'],
 ['heading_order',headings.every((n,i)=>n.depth<=(i?headings[i-1].depth+1:2)),5,'Sắp lại cấp tiêu đề, tránh nhảy từ H2 lên H4.'],
 ['cover',!!row.cover_id,10,'Thêm ảnh bìa WebP.'],
 ['alt',!!row.cover_alt?.trim()&&images.every(n=>!!n.alt?.trim()),8,'Bổ sung mô tả ảnh có ý nghĩa.'],
 ['internal_links',links.some(n=>/^\/(?!\/)/.test(n.url||'')||/^https:\/\/reloo\.vn\//.test(n.url||'')),7,'Thêm liên kết nội bộ phù hợp với nội dung.'],
 ['sources',links.some(n=>/^https:\/\//.test(n.url||'')&&!/^https:\/\/reloo\.vn\//.test(n.url||'')),8,'Bổ sung liên kết nguồn để biên tập viên đối chiếu thông tin.'],
 ['author',!!row.author_name?.trim(),4,'Bổ sung tên tác giả hoặc đơn vị biên tập.'],
 ['excerpt',!!row.excerpt?.trim(),3,'Thêm phần tóm tắt giúp người đọc hiểu nhanh.'],
 ];
 return {score:checks.reduce((s,[,ok,weight])=>s+(ok?weight:0),0),words,checks:checks.map(([code,passed,weight,message])=>({code,passed,weight,message})),issues:checks.filter(([,ok])=>!ok).map(([code,,,message])=>({code,message})),sourceLinks:links.filter(n=>/^https:\/\//.test(n.url||'')&&!/^https:\/\/reloo\.vn\//.test(n.url||'')).length};
}
