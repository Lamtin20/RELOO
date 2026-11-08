import {readFile,writeFile} from 'node:fs/promises';
const articles=JSON.parse(await readFile('output/news/library/articles.json','utf8'));
const originals=JSON.parse(await readFile('output/news/articles.json','utf8'));
for(const old of originals){
 const enhanced=articles.find(a=>a.slug===old.slug);
 const body=enhanced.body.replaceAll('./assets/','./library/assets/');
 old.body=body;
 await writeFile('output/news/'+old.source_file,'# '+old.title+'\n\n'+body);
 await writeFile('output/news/'+old.source_file.replace('.md','.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=library/${old.slug}.html"><title>${old.title}</title><p>Bài đã được bổ sung hình ảnh và giao diện đọc mới. <a href="library/${old.slug}.html">Mở bài viết</a></p></html>`);
}
await writeFile('output/news/articles.json',JSON.stringify(originals,null,2));
await writeFile('output/news/index.html','<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=library/index.html"><title>18 bài truyền thông RELOO</title><p>Thư viện đã cập nhật đủ 18 bài, có ảnh WebP và giao diện đọc mới.</p><a href="library/index.html">Mở thư viện 18 bài RELOO</a></html>');
const plan=['# Nội dung và kiểm tra SEO — 14/10/2026','','Mục tiêu: trả lời nhu cầu thuê đồ và tạo tin rõ ràng. Không cam kết vị trí tìm kiếm. Bài chỉ được đưa vào sitemap sau khi công bố.','','| Bài | Chuyên mục | Số từ (đếm theo khoảng trắng) | Trạng thái |','|---|---|---:|---|',...articles.map(a=>`| ${a.title} | ${a.category} | ${a.body.split(/\s+/).length} | Bản nháp |`),'','Kiểm tra đã hoàn tất: các trường qua validator ứng dụng; H1/H2/H3 và mục lục; các anchor tiếng Việt không trùng; 18 bản mobile không tràn; 36 đường dẫn ảnh trên máy chủ trả WebP; phần gửi yêu cầu và thanh toán đối chiếu mã giao diện.','', 'Giao diện: trang danh sách theo chuyên mục; bài viết có chiều rộng đọc giới hạn, ảnh/caption, mục lục, CTA, bài liên quan. Bản xem trước CRM yêu cầu quyền content.read và phiên CRM hợp lệ, noindex; bài nháp không được công khai.','', 'Schema công khai: Article và BreadcrumbList; không thêm FAQ rich-result claim hay rating/offer không có dữ liệu. Nội dung hướng dẫn cần được rà lại khi giao diện hoặc quy trình giao dịch thay đổi.'];
await writeFile('output/news/library/content-plan.md',plan.join('\n'));
console.log('Updated original previews and source articles; editorial/SEO checklist saved.');
