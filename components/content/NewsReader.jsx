import Link from 'next/link';
import {ArticleBody} from '@/components/listings/ArticleBody';
import {parseArticle,articleOutline} from '@/lib/content/article-outline';
import './NewsReader.css';
import {NewsEngagementTracker} from './NewsEngagementTracker';
import {topicForArticle} from '@/lib/content/news-topics';
export function NewsReader({row,related=[],preview=false}){
 const headings=articleOutline(parseArticle(row.body)).filter(h=>h.depth===2);
 const timestamp=row.publish_at||row.created_at;
 const days=timestamp?new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(timestamp)):'Bản nháp';
 const minutes=Math.max(1,Math.ceil(row.body.split(/\s+/).length/220));
 const owner=row.category==='Dành cho chủ đồ';
 return <article className="news-reader">
  {!preview&&<NewsEngagementTracker articleId={row.id}/>}
  <nav className="news-reader__breadcrumb" aria-label="Đường dẫn"><Link href="/">Trang chủ</Link><span>/</span><Link href="/news">Tin tức & cẩm nang</Link><span>/</span><Link href={'/news/chu-de/'+topicForArticle(row).slug}>{topicForArticle(row).name}</Link></nav>
  {preview&&<p className="news-reader__draft" role="status">Bản xem trước · Chưa công khai</p>}
  <header className="news-reader__header"><span className="news-reader__category">{row.category}</span><h1>{row.title}</h1><p className="news-reader__meta">{row.author_name||'RELOO'} · <time dateTime={row.publish_at||row.created_at}>{days}</time> · {minutes} phút đọc</p><p className="news-reader__intro">{row.excerpt}</p></header>
  {row.coverUrl&&<figure className="news-reader__cover"><img src={row.coverUrl} alt={row.cover_alt} width={1200} height={630} loading="eager" decoding="async"/></figure>}
  <div className="news-reader__layout"><aside className="news-reader__toc"><details open><summary>Trong bài viết này</summary><ol>{headings.map(h=><li key={h.id}><a href={'#'+h.id}>{h.text}</a></li>)}</ol></details><Link className="news-reader__side-cta" href={owner?'/dashboard/assets/new':'/explore?transaction=RENT'}>{owner?'Đăng món đồ của bạn':'Tìm đồ phù hợp'}</Link></aside>
  <div className="news-reader__content"><ArticleBody text={row.body}/><section className="news-reader__cta"><small>BẮT ĐẦU CÙNG RELOO</small><h2>{owner?'Món đồ ít dùng của bạn có thể hữu ích với người khác.':'Tìm món đồ phù hợp cho kế hoạch của bạn.'}</h2><p>{owner?'Chuẩn bị ảnh thật, thông số và điều kiện rõ ràng trước khi tạo tin.':'Xem tin đăng, hỏi lịch trống và thống nhất điều kiện với chủ đồ trước khi thuê.'}</p><Link href={owner?'/dashboard/assets/new':'/explore?transaction=RENT'}>{owner?'Tạo tin cho thuê':'Khám phá đồ cho thuê'}</Link></section><footer className="news-reader__tags">{row.tags.map(tag=><span key={tag}>{tag}</span>)}</footer></div></div>
  {!!related.length&&<section className="news-reader__related"><h2>Đọc tiếp cùng RELOO</h2><div>{related.map(article=><Link href={'/news/'+article.slug} key={article.id}><img src={article.coverUrl} alt={article.cover_alt} width={1200} height={630} loading="lazy"/><small>{article.category}</small><h3>{article.title}</h3><span>Đọc bài viết</span></Link>)}</div></section>}
 </article>;
}
