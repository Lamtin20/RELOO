"use client";
import { useEffect, useState,useRef } from "react";
import { slugify } from "@/lib/content/news-client";
import { localDateTime, fromLocalDateTime } from "@/lib/content/date-time";
import { NewsAutopilot } from './NewsAutopilot';
import {NewsPerformance} from './NewsPerformance';
import {NEWS_STATUS_LABELS,canPublishNow,filterManagedNews} from '@/lib/content/news-management';
import './NewsManager.css';
const empty = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  cover_id: null,
  cover_alt: "",
  seo_title: "",
  seo_description: "",
  author_name: "RELOO",
  category: "Cẩm nang",
  tags: [],
  status: "DRAFT",
  publish_at: "",
};
export function NewsManager() {
  const [view,setView]=useState('articles'),[status,setStatus]=useState('ALL'),[category,setCategory]=useState(''),[query,setQuery]=useState(''),[sort,setSort]=useState('newest'),[canWrite,setCanWrite]=useState(false),[publishTarget,setPublishTarget]=useState(null);
  const publishing=useRef(false);
  const publishDialog=useRef(null);
  useEffect(()=>{const dialog=publishDialog.current;if(publishTarget&&dialog&&!dialog.open)dialog.showModal();return()=>{if(dialog?.open)dialog.close();};},[publishTarget]);
  const [rows, setRows] = useState([]),
    [item, setItem] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const editing=!!item;
  const editorId=item?.id;
  useEffect(()=>{if(editing)document.querySelector('.news-admin .ops-editor')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},[editing,editorId]);
  async function load() {
    const r = await fetch("/api/crm/news").then((r) => r.json());
    if (!r.ok) throw new Error(r.error);
    setRows(r.articles);
    setCanWrite(r.canWrite===true);
  }
  useEffect(() => {
    const timer = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    return () => clearTimeout(timer);
  }, []);
  const field = (key, value) =>
    setItem((current) => ({ ...current, [key]: value }));
  async function cover(file) {
    if (!file) return;
    setBusy(true);
    try {
      const f = new FormData();
      f.set("file", file);
      f.set("purpose", "news");
      const r = await fetch("/api/crm/media", { method: "POST", body: f }).then(
        (r) => r.json(),
      );
      if (!r.ok) throw new Error(r.error);
      field("cover_id", r.asset.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/crm/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }).then((r) => r.json());
      if (!r.ok) throw new Error(r.error);
      setItem(null);
      setNotice("Đã lưu bài viết.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function publishNow(){
    if(!publishTarget||publishing.current)return;
    publishing.current=true;setBusy(true);setError('');
    try{
      const r=await fetch('/api/crm/news',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'PUBLISH_NOW',id:publishTarget.id,version:publishTarget.version})}).then(r=>r.json());
      if(!r.ok)throw Error(r.error);setPublishTarget(null);setNotice('Đã đăng bài công khai.');await load();
    }catch(e){setPublishTarget(null);setError(e.message);}finally{publishing.current=false;setBusy(false);}
  }
  const filtered=filterManagedNews(rows,{status,category,query,sort});
  return (
    <section className="news-admin">
      <header className="na-header"><div><h2>Quản lý tin tức</h2><p>Biên tập, xuất bản và theo dõi các bài viết trên RELOO.</p></div><button className="btn btn-primary" disabled={!canWrite} onClick={()=>{setView('articles');setItem({...empty});setNotice('');}}>Viết bài mới</button></header>
      <nav className="na-tabs" aria-label="Quản lý tin tức"><button type="button" aria-pressed={view==='articles'} onClick={()=>setView('articles')}>Bài viết <span>{rows.length}</span></button><button type="button" aria-pressed={view==='automation'} onClick={()=>setView('automation')}>Tạo tin tự động</button><button type="button" aria-pressed={view==='performance'} onClick={()=>setView('performance')}>Chất lượng & hiệu quả</button></nav>
      {view==='performance'?<NewsPerformance/>:view==='automation'?<NewsAutopilot/>:<>
      <div className="na-stats">{Object.entries(NEWS_STATUS_LABELS).map(([key,label])=><button key={key} type="button" onClick={()=>setStatus(key)} aria-pressed={status===key}><span>{label}</span><strong>{rows.filter(r=>r.status===key).length}</strong></button>)}</div>
      <div className="na-filters"><label>Tìm bài<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tiêu đề, chuyên mục, đường dẫn…"/></label><label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="UNPUBLISHED">Chưa đăng</option>{Object.entries(NEWS_STATUS_LABELS).map(([s,label])=><option key={s} value={s}>{label}</option>)}</select></label><label>Chuyên mục<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Tất cả chuyên mục</option>{[...new Set(rows.map(r=>r.category).filter(Boolean))].map(c=><option key={c}>{c}</option>)}</select></label><label>Sắp xếp<select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Cập nhật mới nhất</option><option value="oldest">Cập nhật cũ nhất</option><option value="title">Tên bài A–Z</option></select></label><button className="btn btn-secondary" onClick={()=>{setQuery('');setStatus('ALL');setCategory('');setSort('newest');}}>Xóa bộ lọc</button></div>
      <div className="ops-toolbar">
        <p>{filtered.length} / {rows.length} bài viết</p>
        <button
          className="btn btn-secondary"
          onClick={() => {
            load().catch(e=>setError(e.message));
          }}
        >
          Làm mới
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Bài viết</th>
              <th>Trạng thái</th>
              <th>Đường dẫn</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="na-article-cell">{row.cover_id&&<img src={'/api/media/'+row.cover_id} alt="" width={64} height={44} loading="lazy"/>}<div>{row.title}<small>{row.category}</small><small>{row.updated_at&&new Date(row.updated_at).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</small></div></div>
                </td>
                <td>
                  <span className={'na-badge na-badge--'+row.status.toLowerCase()}>{NEWS_STATUS_LABELS[row.status]}</span>
                </td>
                <td>
                  {row.status==='PUBLISHED'?<a
                    href={`https://reloo.vn/news/${row.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    /news/{row.slug}
                  </a>:<span className="na-slug">/news/{row.slug}</span>}
                </td>
                <td><div className="na-row-actions">
                  {canPublishNow(row)&&canWrite&&<button className="btn btn-primary" disabled={busy} onClick={()=>setPublishTarget(row)}>Đăng ngay</button>}
                  <a className="btn btn-secondary" href={"/crm/news-preview/"+row.id} target="_blank" rel="noopener noreferrer">Xem trước</a>
                  <button
                    className="btn btn-secondary"
                    disabled={!canWrite||busy}
                    onClick={() => setItem({ ...row })}
                  >
                    Chỉnh sửa
                  </button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="ops-empty">
            {rows.length?'Không có bài phù hợp bộ lọc.':'Chưa có bài viết. Chọn “Viết bài mới” để bắt đầu.'}
          </p>
        )}
      </div>
      {publishTarget&&<dialog ref={publishDialog} className="na-dialog" aria-labelledby="publish-title" onCancel={e=>{if(busy)e.preventDefault();else setPublishTarget(null);}}><h3 id="publish-title">Đăng bài ngay?</h3><p><strong>{publishTarget.title}</strong></p><p>Bản đã lưu gần nhất sẽ hiển thị công khai trên RELOO. Nếu bài đã hẹn giờ, thời gian đăng sẽ được chuyển thành hiện tại.</p><div className="na-actions"><button className="btn btn-secondary" disabled={busy} onClick={()=>setPublishTarget(null)}>Hủy</button><button className="btn btn-primary" disabled={busy} onClick={publishNow}>{busy?'Đang đăng…':'Xác nhận đăng ngay'}</button></div></dialog>}
      {item && (
        <form className="ops-editor" onSubmit={save}>
          <h2>{item.id ? "Chỉnh sửa bài viết" : "Đăng tin tức"}</h2>
          <div className="ops-form-grid">
            <label className="full">
              Tiêu đề
              <input
                className="input"
                required
                maxLength={180}
                value={item.title}
                onChange={(e) =>
                  setItem({
                    ...item,
                    title: e.target.value,
                    slug: item.id ? item.slug : slugify(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Đường dẫn SEO
              <input
                className="input"
                required
                value={item.slug}
                onChange={(e) => field("slug", slugify(e.target.value))}
              />
            </label>
            <label>
              Chuyên mục
              <input
                className="input"
                value={item.category}
                onChange={(e) => field("category", e.target.value)}
              />
            </label>
            <label className="full">
              Mô tả ngắn
              <textarea
                className="input"
                maxLength={350}
                value={item.excerpt}
                onChange={(e) => field("excerpt", e.target.value)}
              />
            </label>
            <label>
              Ảnh bìa (khuyến nghị 1200×630)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => cover(e.target.files[0])}
              />
              {item.cover_id && (
                <img
                  className="content-cover-preview"
                  src={`/api/media/${item.cover_id}`}
                  alt="Ảnh bìa xem trước"
                />
              )}
            </label>
            <label>
              Mô tả ảnh cho người đọc & SEO
              <input
                className="input"
                value={item.cover_alt}
                onChange={(e) => field("cover_alt", e.target.value)}
              />
            </label>
            <label className="full">
              Nội dung Markdown
              <textarea
                className="input article-editor"
                rows={18}
                value={item.body}
                onChange={(e) => field("body", e.target.value)}
                placeholder="## Tiêu đề phần&#10;Nội dung hữu ích cho người đọc...&#10;&#10;[Liên kết trong RELOO](/explore)"
              />
            </label>
            <label>
              Tên tác giả
              <input
                className="input"
                value={item.author_name}
                onChange={(e) => field("author_name", e.target.value)}
              />
            </label>
            <label>
              Thẻ chủ đề (ngăn bởi dấu phẩy)
              <input
                className="input"
                value={item.tags.join(", ")}
                onChange={(e) =>
                  field(
                    "tags",
                    e.target.value.split(",").map((v) => v.trim()),
                  )
                }
              />
            </label>
            <label>
              Tiêu đề tìm kiếm ({item.seo_title.length}/80)
              <input
                className="input"
                maxLength={80}
                value={item.seo_title}
                onChange={(e) => field("seo_title", e.target.value)}
              />
            </label>
            <label>
              Mô tả tìm kiếm ({item.seo_description.length}/180)
              <textarea
                className="input"
                maxLength={180}
                value={item.seo_description}
                onChange={(e) => field("seo_description", e.target.value)}
              />
            </label>
            <label>
              Trạng thái
              <select
                className="input"
                value={item.status}
                onChange={(e) => field("status", e.target.value)}
              >
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Đăng công khai</option>
                <option value="SCHEDULED">Hẹn giờ đăng</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </select>
            </label>
            <label>
              Thời gian đăng
              <input
                className="input"
                type="datetime-local"
                value={localDateTime(item.publish_at)}
                onChange={(e) =>
                  field("publish_at", fromLocalDateTime(e.target.value))
                }
              />
            </label>
          </div>
          <div className="seo-preview">
            <strong>Xem trước trên kết quả tìm kiếm</strong>
            <p>reloo.vn › news › {item.slug}</p>
            <h3>{item.seo_title || item.title}</h3>
            <p>{item.seo_description || item.excerpt}</p>
            <small>
              Ưu tiên nội dung có ích, ảnh rõ và tiêu đề đúng chủ đề. SEO hỗ trợ
              khả năng được tìm thấy; thứ hạng phụ thuộc công cụ tìm kiếm và
              người đọc.
            </small>
          </div>
          <div className="ops-actions">
            <button className="btn btn-primary" disabled={busy}>
              Lưu bài viết
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setItem(null)}
            >
              Đóng
            </button>
          </div>
        </form>
      )}
      </>}
    </section>
  );
}
