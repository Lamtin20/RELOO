import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {topics} from './news-topics.mjs';
import {parseArticle,articleOutline} from '../../lib/content/article-outline.js';
await mkdir('output/news/library/assets',{recursive:true});
await copyFile('components/content/NewsReader.css','output/news/library/reader.css');
const styles=await readFile('output/news/fonts.css','utf8');
await writeFile('output/news/library/fonts.css',styles.replaceAll('assets/fonts/','../assets/fonts/'));
const original=JSON.parse(await readFile('output/news/articles.json','utf8'));
const receipts=JSON.parse(await readFile('output/news/crm-receipt.json','utf8'));
const common='RELOO kết nối người thuê và chủ đồ qua tin đăng, yêu cầu và chat. Gửi yêu cầu chưa phải xác nhận đã thuê thành công. Lịch, giá cuối cùng, tiền cọc và giao nhận cần được hai bên thống nhất; RELOO hiện không giữ tiền thuê hoặc tiền cọc.';
const pack=[];
for(const [i,t]of topics.entries()){
 const description=t.intro.length<=170?t.intro:`${t.title.replace(/\?$/,'')}. Checklist, câu hỏi cần xác nhận và cách tìm tin phù hợp trên RELOO.`;
 const excerpt=t.intro;
 let body=t.intro+'\n\n';
 for(const [index,[heading,text]]of t.sections.entries()){
  body+=`## ${index+1}. ${heading}\n\n${text}\n\n`;
  if(index===1)body+=`![Checklist cần xác nhận: ${t.checklist.join('; ')}.](./assets/${t.slug}-inline.webp)\n\n`;
 }
 body+=`## Checklist trước khi quyết định\n\n${t.checklist.map(s=>'- '+s).join('\n')}\n\n`;
 body+=`## Tìm và trao đổi trên RELOO\n\n${common}\n\n`;
 body+=t.category==='Dành cho chủ đồ'?'Bạn có thể vào [Đăng sản phẩm](/dashboard/assets/new), chọn hình thức cho thuê, thêm ảnh thực tế và điền đầy đủ thông số, phụ kiện. Đọc [hướng dẫn bắt đầu cho thuê](/news/bat-dau-cho-thue-do-it-dung-tren-reloo) trước khi gửi tin.\n\n':t.category==='Mua bán rõ ràng'?'Vào [Khám phá đồ đang bán](/explore?transaction=SALE), mở tin phù hợp và gửi yêu cầu mua để trao đổi với người bán. Kiểm tra nội dung trước khi chốt giao dịch.\n\n':`Vào [Khám phá sản phẩm](/explore?group=${t.group}&transaction=RENT), xem ảnh, thông số, phụ kiện và khu vực của tin phù hợp. Bấm **Nhắn chủ đồ** để hỏi trước hoặc **Chọn ngày thuê** để gửi lịch dự kiến. Nếu chưa quen thao tác, xem [hướng dẫn thuê đồ từng bước](/news/huong-dan-thue-do-tren-reloo).\n\n`;
 body+='## Câu hỏi thường gặp\n\n'+t.faq.map(([q,a])=>`### ${q}\n\n${a}\n\n`).join('');
 body+='## Đọc tiếp theo nhu cầu của bạn\n\n'+t.related.map(slug=>{const target=topics.find(x=>x.slug===slug)||original.find(x=>x.slug===slug);return `- [${target?.title||slug}](/news/${slug})`;}).join('\n');
 body+='\n\n## Bắt đầu từ nhu cầu thực tế\n\n'+(t.category==='Dành cho chủ đồ'?'Chuẩn bị một tin đăng thật rõ trước khi tìm người thuê. **[Tạo tin cho thuê trên RELOO](/dashboard/assets/new)**.':t.category==='Mua bán rõ ràng'?'Chọn món phù hợp và xác nhận tình trạng với người bán. **[Xem các tin đăng bán trên RELOO](/explore?transaction=SALE)**.':'Chọn một vài tin phù hợp, hỏi những điểm chưa rõ và thống nhất điều kiện trước khi nhận đồ. **[Tìm đồ cho thuê trên RELOO](/explore?transaction=RENT)**.');
 const record={title:t.title,slug:t.slug,excerpt,body,cover_alt:`Minh họa RELOOP và nhóm đồ liên quan: ${t.title}`,seo_title:t.title.length>72?t.title.split(':')[0]+' | RELOO':t.title+' | RELOO',seo_description:description.slice(0,178),author_name:'RELOO',category:t.category,tags:[t.category,'RELOO',t.title.split(':')[0].slice(0,45)],status:'DRAFT',publish_at:null,cover_file:`assets/${t.slug}-cover.webp`,inline_file:`assets/${t.slug}-inline.webp`,source_file:t.slug+'.md'};
 if(record.excerpt.length>350||record.seo_title.length>80)throw Error('FIELD_LIMIT '+t.slug);
 pack.push(record);await writeFile('output/news/library/'+t.slug+'.md','# '+t.title+'\n\n'+body);
}
for(const [i,old]of original.entries()){
 const receipt=receipts.articles.find(a=>a.slug===old.slug);
 const image=`![${i===0?'Quy trình thuê đồ: tìm món, gửi yêu cầu, thống nhất điều kiện và nhận trả.':i===1?'Những yếu tố cần cân nhắc trước khi chọn thuê hay mua một món đồ.':'Những thông tin cần chuẩn bị khi tạo tin cho thuê đồ ít dùng.'}](./assets/${old.slug}-inline.webp)`;
 const tree=parseArticle(old.body),headings=articleOutline(tree).filter(h=>h.depth===2);
 const split=old.body.indexOf('## '+headings[2]?.text);
 let body=split>0?old.body.slice(0,split)+image+'\n\n'+old.body.slice(split):old.body+'\n\n'+image;
 if(i===1)body+='\n\n## Câu hỏi thường gặp\n\n### Thuê đồ có chắc tiết kiệm hơn mua không?\n\nKhông thể khẳng định cho mọi trường hợp. So sánh tổng tiền thuê, giao nhận, phụ kiện và tần suất dùng thực tế trước khi chọn.\n\n### Có thể hỏi chủ đồ khi chưa chọn được ngày không?\n\nCó thể dùng nút Nhắn chủ đồ để hỏi tình trạng và nhu cầu trước. Khi có lịch dự kiến, bạn tiếp tục Chọn ngày thuê để gửi yêu cầu.\n\n**[Xem đồ cho thuê phù hợp nhu cầu](/explore?transaction=RENT)**.';
 if(i===2)body+='\n\n## Câu hỏi thường gặp\n\n### Đăng tin xong có chắc có người thuê không?\n\nKhông. Nhu cầu, món đồ, tình trạng, khu vực và điều kiện thực tế ảnh hưởng tới việc người xem lựa chọn.\n\n### Ảnh phụ kiện có cần đúng bộ bàn giao không?\n\nCó. Những món nằm trong ảnh nên được mô tả rõ để người thuê không hiểu nhầm phụ kiện đi kèm.\n\n**[Chuẩn bị tin cho thuê của bạn](/dashboard/assets/new)**.';
 pack.push({...old,id:receipt.id,cover_id:receipt.cover_id,cover_file:'../'+old.cover_file,inline_file:`assets/${old.slug}-inline.webp`,body,enhanced:true});
 await writeFile('output/news/library/'+old.slug+'.md','# '+old.title+'\n\n'+body);
}
await writeFile('output/news/library/articles.json',JSON.stringify(pack,null,2));
const e=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function markup(node,ids){const children=(node.children||[]).map(n=>markup(n,ids)).join('');switch(node.type){case 'root':return children;case 'text':return e(node.value);case 'paragraph':if(node.children?.length===1&&node.children[0].type==='image'){const n=node.children[0];return `<figure><img src="${e(n.url)}" alt="${e(n.alt)}"><figcaption>${e(n.alt)}</figcaption></figure>`;}return `<p>${children}</p>`;case 'heading':return `<h${Math.max(2,node.depth)} id="${ids.get(node)}">${children}</h${Math.max(2,node.depth)}>`;case 'strong':return `<strong>${children}</strong>`;case 'emphasis':return `<em>${children}</em>`;case 'link':return `<a href="${e(node.url)}">${children}</a>`;case 'list':return node.ordered?`<ol>${children}</ol>`:`<ul>${children}</ul>`;case 'listItem':return `<li>${children}</li>`;case 'image':return `<img src="${e(node.url)}" alt="${e(node.alt)}">`;case 'blockquote':return `<blockquote>${children}</blockquote>`;default:return children;}}
for(const record of pack){
 const tree=parseArticle(record.body),outline=articleOutline(tree),ids=new Map(outline.map(h=>[h.node,h.id]));
 const title=e(record.title);
 await writeFile(`output/news/library/${record.slug}.html`,`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${e(record.seo_description)}"><link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="reader.css"><style>body{margin:0;background:#edf3ef;font-family:'Be Vietnam Pro',Arial,sans-serif}a{color:inherit;text-decoration:none}</style><article class="news-reader"><nav class="news-reader__breadcrumb"><a href="index.html">← 18 bài RELOO</a></nav><p class="news-reader__draft">Bản xem trước · Chưa công khai</p><header class="news-reader__header"><span class="news-reader__category">${e(record.category)}</span><h1>${title}</h1><p class="news-reader__meta">RELOO · 14/10/2026 · ${Math.ceil(record.body.split(/\s+/).length/220)} phút đọc</p><p class="news-reader__intro">${e(record.excerpt)}</p></header><figure class="news-reader__cover"><img src="${record.cover_file}" alt="${e(record.cover_alt)}" width="1200" height="630"></figure><div class="news-reader__layout"><aside class="news-reader__toc"><details open><summary>Trong bài viết này</summary><ol>${outline.filter(h=>h.depth===2).map(h=>`<li><a href="#${h.id}">${e(h.text)}</a></li>`).join('')}</ol></details></aside><div class="news-reader__content"><div class="article-body">${markup(tree,ids)}</div><section class="news-reader__cta"><small>BẮT ĐẦU CÙNG RELOO</small><h2>Tìm món đồ phù hợp với kế hoạch của bạn</h2><p>Xem thông tin, trao đổi với chủ đồ và thống nhất điều kiện trước khi thuê.</p><a href="https://reloo.vn/explore?transaction=RENT">Khám phá đồ cho thuê ↗</a></section></div></div></article></html>`);
}
await writeFile('output/news/library/index.html',`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>18 bài truyền thông RELOO</title><link rel="stylesheet" href="fonts.css"><style>body{font-family:'Be Vietnam Pro',Arial,sans-serif;background:#edf3ef;color:#173b2d;margin:0;padding:28px}main{max-width:1200px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}article{background:white;border-radius:18px;padding:18px}img{width:100%;height:auto;border-radius:12px}h2{font-size:19px;line-height:1.5}p{font-size:14px;line-height:1.8}a{color:#087f5b}small{color:#536d60}</style><main><h1>Thư viện 18 bài RELOO</h1><p>15 bài mới và 3 bài bổ sung hình ảnh · Bản nháp · Có mục lục, H1/H2/H3, ảnh WebP và CTA.</p><div class="grid">${pack.map(a=>`<article><img src="${a.cover_file}" alt="${e(a.cover_alt)}"><small>${e(a.category)} · ${a.enhanced?'Đã bổ sung':'Bài mới'}</small><h2><a href="${a.slug}.html">${e(a.title)}</a></h2><p>${e(a.excerpt)}</p></article>`).join('')}</div></main></html>`);
console.log('Prepared',pack.length,'articles; new word counts:',pack.filter(a=>!a.enhanced).map(a=>a.body.split(/\s+/).length));
