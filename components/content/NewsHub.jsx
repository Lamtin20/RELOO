import Link from 'next/link';
import {NEWS_TOPICS,topicForArticle,filterNews} from '@/lib/content/news-topics';
import './NewsHub.css';

function Card({row,featured=false}){
 const topic=topicForArticle(row),date=row.publish_at||row.created_at;
 return <article className={'nh-card'+(featured?' nh-card--featured':'')}>
  <Link href={'/news/'+row.slug} className="nh-card__image" tabIndex={-1} aria-hidden="true">{row.coverUrl?<img src={row.coverUrl} alt="" width="1200" height="630" loading={featured?'eager':'lazy'} decoding="async"/>:<span className="nh-card__placeholder">RELOO</span>}</Link>
  <div className="nh-card__body"><Link className="nh-kicker" href={'/news/chu-de/'+topic.slug}>{topic.name}</Link><h3><Link href={'/news/'+row.slug}>{row.title}</Link></h3><p>{row.excerpt}</p><div className="nh-card__meta">{date&&<time dateTime={date}>{new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(date))}</time>}<span>· {Math.max(1,Math.ceil((row.body||'').split(/\s+/).length/220))} phút đọc</span><Link href={'/news/'+row.slug} aria-label={'Đọc: '+row.title}>Đọc bài</Link></div></div>
 </article>;
}

export function NewsHub({articles,topic=null,q='',page=1}){
 const result=filterNews(articles,{topic,q,page}),base=topic?'/news/chu-de/'+topic.slug:'/news';
 const featured=!topic&&!q&&result.page===1?result.rows[0]:null,rows=featured?result.rows.slice(1):result.rows;
 const pageUrl=p=>base+'?'+new URLSearchParams({...q?{q}:{},page:String(p)});
 return <main className="nh">
  <nav className="nh-crumb" aria-label="Đường dẫn"><Link href="/">Trang chủ</Link><span>/</span>{topic?<><Link href="/news">Tin tức</Link><span>/</span><span>{topic.name}</span></>:<span>Tin tức</span>}</nav>
  <header className="nh-hero"><div className="nh-heading"><h1>{topic?topic.name:'Tin tức & kinh nghiệm'}</h1><p>{topic?topic.description:'Chuyện thuê mua, cách chọn đồ và những thói quen tiêu dùng đáng cân nhắc.'}</p></div><form action={base} role="search" className="nh-search"><label className="nh-sr" htmlFor="news-query">Tìm bài viết</label><input id="news-query" name="q" type="search" defaultValue={q} maxLength={120} placeholder="Tìm bài viết…"/><button type="submit">Tìm kiếm</button></form></header>
  <nav className="nh-topics" aria-label="Chủ đề tin tức"><Link href="/news" aria-current={!topic?'page':undefined}>Tất cả</Link>{NEWS_TOPICS.map(t=><Link key={t.slug} href={'/news/chu-de/'+t.slug} aria-current={topic?.slug===t.slug?'page':undefined}>{t.label}</Link>)}</nav>
  <section className="nh-feed" aria-label="Danh sách bài viết"><div className="nh-section-title"><h2>{q?`Kết quả cho “${q}”`:topic?'Bài viết mới':'Mới nhất'}</h2>{result.total>0&&<span>{result.total} bài viết</span>}</div>
   {featured&&<Card row={featured} featured/>}
   {rows.length>0&&<div className="nh-grid">{rows.map(row=><Card row={row} key={row.id}/>)}</div>}
   {!result.total&&<div className="nh-empty"><div className="nh-empty__copy"><h3>{q?'Không tìm thấy bài viết':topic?'Chưa có bài trong chủ đề này':'Chưa có bài viết mới'}</h3><p>{q?'Bạn thử tìm bằng từ khóa khác hoặc ngắn hơn nhé.':topic?'Bạn có thể quay lại trang tin để xem các chủ đề khác.':'Bạn có thể xem hướng dẫn sử dụng hoặc tìm món đồ mình cần trong lúc chờ cập nhật.'}</p></div><div className="nh-empty__actions">{q?<Link href={base}>Xóa tìm kiếm</Link>:topic?<Link href="/news">Xem các chủ đề khác</Link>:<><Link href="/help">Hướng dẫn sử dụng</Link><Link href="/explore">Xem sản phẩm</Link></>}</div></div>}
   {result.pages>1&&<nav className="nh-pages" aria-label="Phân trang bài viết">{result.page>1&&<Link href={pageUrl(result.page-1)}>Trang trước</Link>}<span>Trang {result.page}/{result.pages}</span>{result.page<result.pages&&<Link href={pageUrl(result.page+1)}>Trang sau</Link>}</nav>}
  </section>
  {result.total>0&&<aside className="nh-bottom"><div><h2>Tìm đồ cho kế hoạch của bạn</h2><p>Xem sản phẩm và trao đổi với chủ đồ trước khi thuê hoặc mua.</p></div><Link href="/explore">Xem sản phẩm</Link></aside>}
 </main>;
}
