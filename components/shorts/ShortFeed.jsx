"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from 'react-dom';
import {
  ShoppingBag,
  Volume2,
  VolumeX,
  Share2,
  Flag,
  Plus,
  Video,
  ChevronRight,
  X,
  ArrowLeft,
} from "lucide";
import { MorphIcon } from "@/components/ui/MorphIcon";
import { shareShort } from "@/lib/mobile/client";
import { formatMoney } from "@/lib/finance/wallet-display";
import { ShortPlayer } from './ShortPlayer';
import { playbackWindow } from '@/lib/shorts/playback-policy';
import { createShortMeter } from '@/lib/shorts/metrics-client';
function ShortCard({
  item,
  active,
  muted,
  onMuted,
  onProducts,
  onReport,
  onMessage,
  warm,qualified,onEvent,policy,onMuteFallback,
}) {
  const record=useCallback((kind,product,ms)=>onEvent(item,kind,product,ms),[item,onEvent]);
  useEffect(() => {
    if(!active||!qualified)return;
    let timer;
    const count=()=>{clearTimeout(timer);if(!document.hidden)timer=setTimeout(()=>record('IMPRESSION'),1000);};count();document.addEventListener('visibilitychange',count);
    return ()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',count);};
  },[active,qualified,record]);
  return (
    <article className="short-feed-card" data-video-id={item.id}>
      <ShortPlayer item={item} active={active} warm={warm} muted={muted} qualified={qualified} onMuteFallback={onMuteFallback} maxBytes={policy.maxBytes} bufferSeconds={policy.activeSeconds} onView={ms=>record('VIEW',null,ms)}/>
      <div className="short-side-actions">
        <button
          aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
          onClick={onMuted}
        >
          <MorphIcon icon={muted ? VolumeX : Volume2} size={23} />
        </button>
        <button
          aria-label="Chia sẻ video"
          onClick={async () => {
            try {
              const r = await shareShort(
                location.origin + "/shorts?id=" + item.id,
              );
              if (r?.copied) onMessage("Đã sao chép liên kết video.");
            } catch (e) {
              if (e.name !== "AbortError")
                onMessage("Chưa chia sẻ được video.");
            }
          }}
        >
          <MorphIcon icon={Share2} size={23} />
        </button>
        <button aria-label="Báo cáo video" onClick={() => onReport(item)}>
          <MorphIcon icon={Flag} size={22} />
        </button>
      </div>
      <div className="short-caption">
        <strong>@{item.creator}</strong>
        <p>{item.caption}</p>
        {item.products.length ? (
          <button
            className="short-product-anchor"
            onClick={() => {record('OPEN');onProducts(item);}}
          >
            <MorphIcon icon={ShoppingBag} size={19} />
            <span>
              {item.products[0].title}
              <small>{item.products.length} sản phẩm trong video</small>
            </span>
            <MorphIcon icon={ChevronRight} size={18} />
          </button>
        ) : null}
      </div>
    </article>
  );
}
export function ShortFeed({ initialId }) {
  const [items, setItems] = useState([]),
    [next, setNext] = useState(null),
    [active, setActive] = useState(""),
    [muted, setMuted] = useState(true),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState(null),
    [report, setReport] = useState(null),
    [reason, setReason] = useState(""),
    [block, setBlock] = useState(false),
    [reportBusy, setReportBusy] = useState(false);
  const currentIndex=useRef(0);
  const feed = useRef(null),
    inflight = useRef(false),meters=useRef(new Map()),scrollFrame=useRef(0);
  const [height,setHeight]=useState(640),[settled,setSettled]=useState(true),[connection,setConnection]=useState({});
  const activeIndex=Math.max(0,items.findIndex(i=>i.id===active)),policy=playbackWindow(activeIndex,items.length,connection);
  useEffect(()=>{currentIndex.current=activeIndex;},[activeIndex]);
  const from=Math.max(0,activeIndex-3),to=Math.min(items.length-1,activeIndex+3);
  function meter(item){if(!meters.current.has(item.id))meters.current.set(item.id,createShortMeter(item));return meters.current.get(item.id);}
  const recordEvent=useCallback((item,kind,product,ms)=>{if(!meters.current.has(item.id))meters.current.set(item.id,createShortMeter(item));meters.current.get(item.id)(kind,product,ms);},[]);
  const forceMute=useCallback(()=>setMuted(true),[]);
  useEffect(()=>{const c=navigator.connection;if(!c)return;const sync=()=>setConnection({saveData:c.saveData,effectiveType:c.effectiveType});sync();c.addEventListener('change',sync);return()=>c.removeEventListener('change',sync);},[]);
  useEffect(()=>{const node=feed.current;if(!node)return;let last=node.clientHeight;const sync=()=>{const height=node.clientHeight;if(last!==height){node.scrollTop=currentIndex.current*height;last=height;}setHeight(height);};sync();const obs=new ResizeObserver(sync);obs.observe(node);return()=>obs.disconnect();},[]);
  const load = useCallback(
    async (offset = 0) => {
      if (inflight.current) return;
      inflight.current = true;
      setLoading(true);
      try {
        const params = new URLSearchParams({ offset: String(offset) });
        if (initialId) params.set("id", initialId);
        const response = await fetch("/api/shorts?" + params),
          data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setItems((previous) =>offset?[...new Map([...previous,...data.videos].map(v=>[v.id,v])).values()]:data.videos);
        if(!offset){setActive(data.videos[0]?.id||'');feed.current?.scrollTo({top:0});}
        setNext(data.nextOffset);
        setError("");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        inflight.current = false;
      }
    },
    [initialId],
  );
  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(()=>{if(next===null||initialId||activeIndex<items.length-5)return;const t=setTimeout(()=>load(next),0);return()=>clearTimeout(t);},[activeIndex,items.length,next,initialId,load]);
  useEffect(()=>{const current=items[activeIndex];if(!current?.expiresAt)return;const delay=Math.max(0,current.expiresAt-Date.now()-60000);const timer=setTimeout(async()=>{try{const r=await fetch('/api/shorts/session?id='+current.id),d=await r.json();if(!r.ok)return;setItems(old=>old.map(v=>v.id===current.id?{...d.video,metricTicket:v.metricTicket}:v));}catch{}},delay);return()=>clearTimeout(timer);},[activeIndex,items]);
  function scroll(){if(scrollFrame.current)return;scrollFrame.current=requestAnimationFrame(()=>{scrollFrame.current=0;const node=feed.current,index=Math.max(0,Math.min(items.length-1,Math.round(node.scrollTop/node.clientHeight)));if(items[index])setActive(items[index].id);setSettled(Math.abs(node.scrollTop/node.clientHeight-index)<0.25);});}
  useEffect(()=>()=>cancelAnimationFrame(scrollFrame.current),[]);
  useEffect(() => {
    if (!selected && !report) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (e) => {
      if (e.key === "Escape") {
        setSelected(null);
        setReport(null);
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", close);
    };
  }, [selected, report]);
  async function sendReport(e) {
    e.preventDefault();
    setReportBusy(true);
    try {
      const r = await fetch("/api/shorts/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: report.id, reason, block }),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (block)
        setItems(items.filter((v) => v.creatorId !== report.creatorId));
      setReport(null);
      setReason("");
      setBlock(false);
      setMessage("Đã gửi báo cáo tới RELOO để kiểm tra.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setReportBusy(false);
    }
  }
  return (
    <section className="shorts-page">
      <header className="shorts-heading">
        <Link href="/" className="short-home" aria-label="Về trang chủ"><MorphIcon icon={ArrowLeft} size={23}/></Link>
        <div>
          <span className="short-kicker">KHÁM PHÁ QUA VIDEO</span>
          <h1>RELOO Shorts</h1>
          <p>Xem cách dùng. Chạm vào món đồ. Kết nối với chủ đồ.</p>
        </div>
      </header>
      {message && (
        <p className="short-message" role="status">
          {message}
          <button aria-label="Đóng thông báo" onClick={() => setMessage("")}>
            <MorphIcon icon={X} size={15} />
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="ops-error">
          {error}
        </p>
      )}
      <div className="shorts-layout">
        <div className="short-feed" ref={feed} onScroll={scroll}>
          {items.length>0&&<div aria-hidden="true" style={{height:from*height}}/>}
          {items.slice(from,to+1).map((item,i) => (
            <ShortCard
              key={item.id}
              item={item}
              active={active === item.id&&!selected&&!report}
              qualified={settled}
              warm={true}
              onEvent={recordEvent} policy={policy}
              onMuteFallback={forceMute}
              muted={muted}
              onMuted={() => setMuted(!muted)}
              onProducts={setSelected}
              onReport={setReport}
              onMessage={setMessage}
            />
          ))}
          {items.length>0&&<div aria-hidden="true" style={{height:Math.max(0,items.length-to-1)*height}}/>}
          {!items.length && !loading && (
            <div className="short-empty">
              <span>
                <MorphIcon icon={Video} size={44} />
              </span>
              <h2>Những món đồ, qua một góc nhìn mới</h2>
              <p>
                Video đã được duyệt sẽ xuất hiện ở đây. Hãy là người đầu tiên
                giới thiệu món đồ của bạn.
              </p>
              <Link className="btn btn-primary" href="/dashboard/shorts/new">
                <MorphIcon icon={Plus} size={18} /> Tạo video đầu tiên
              </Link>
            </div>
          )}
          {loading && !items.length && (
            <p role="status" className="short-loading">
              Đang tải video...
            </p>
          )}
          {next !== null && !initialId && (
            <button
              className="short-load-more"
              onClick={() => load(next)}
              disabled={loading}
            >
              Xem thêm video
            </button>
          )}
        </div>
        <aside className="shorts-guide">
          <MorphIcon icon={ShoppingBag} size={32} />
          <h2>Món đồ nằm ngay trong video</h2>
          <p>
            Chạm vào thẻ sản phẩm để xem giá thuê, thông tin món đồ và trao đổi
            với chủ đồ.
          </p>
          <ol>
            <li>Xem video giới thiệu món đồ.</li>
            <li>Mở danh sách sản phẩm được gắn.</li>
            <li>Xem thông tin và gửi yêu cầu thuê.</li>
          </ol>
          <Link href="/dashboard/shorts">
            Quản lý video của tôi <MorphIcon icon={ChevronRight} size={16} />
          </Link>
        </aside>
      </div>
      {selected && createPortal(
        <div
          className="short-drawer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <section
            className="short-product-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="short-products-title"
          >
            <header>
              <h2 id="short-products-title">
                <MorphIcon icon={ShoppingBag} size={20} /> Sản phẩm trong video
              </h2>
              <button
                aria-label="Đóng danh sách sản phẩm"
                onClick={() => setSelected(null)}
              >
                <MorphIcon icon={X} size={20} />
              </button>
            </header>
            {selected.products.map((product) => (
              <a
                className="short-product-row"
                key={product.id}
                href={product.href}
                onClick={()=>meter(selected)('CLICK',product.id)}
                target={product.kind === "EXTERNAL" ? "_blank" : undefined}
                rel={
                  product.kind === "EXTERNAL"
                    ? "noopener noreferrer sponsored"
                    : undefined
                }
              >
                <span className="short-product-icon">
                  <MorphIcon icon={ShoppingBag} size={24} />
                </span>
                <span>
                  <strong>{product.title}</strong>
                  <small>
                    {product.kind === "RENTAL"
                      ? formatMoney(product.price) + " / ngày"
                      : "Xem tại Shopee / TikTok Shop"}
                  </small>
                  {product.disclosure && <em>{product.disclosure}</em>}
                </span>
                <MorphIcon icon={ChevronRight} size={20} />
              </a>
            ))}
          </section>
        </div>,document.body
      )}
      {report && createPortal(
        <div className="short-drawer-overlay">
          <section
            className="short-product-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="short-report-title"
          >
            <header>
              <h2 id="short-report-title">Báo cáo nội dung</h2>
              <button aria-label="Đóng báo cáo" onClick={() => setReport(null)}>
                <MorphIcon icon={X} size={20} />
              </button>
            </header>
            <form onSubmit={sendReport}>
              <label>
                Lý do
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nội dung, thông tin sản phẩm hoặc hành vi cần kiểm tra..."
                />
              </label>
              <label className="short-consent">
                <input
                  type="checkbox"
                  checked={block}
                  onChange={(e) => setBlock(e.target.checked)}
                />{" "}
                Ẩn video của người đăng này khỏi trang của tôi.
              </label>
              <p>Đăng nhập tài khoản RELOO để gửi báo cáo và lưu lựa chọn.</p>
              <button className="btn btn-primary" disabled={reportBusy}>
                Gửi báo cáo
              </button>
            </form>
          </section>
        </div>,document.body
      )}
    </section>
  );
}
