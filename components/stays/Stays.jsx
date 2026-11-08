'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {BedDouble,MapPin,ArrowLeft,ArrowRight,ShieldCheck,Heart,Check,Clock,Leaf} from 'lucide-react';
import {IntentLink as Link} from '@/components/mobile/IntentLink';
import {useLocale} from '@/components/settings/LocaleProvider';
import {stayCopy} from '@/lib/stays/copy';
import './stays.css';

function nextDate(offset){const d=new Date(Date.now()+offset*86400000);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
export function Stays(){
 const {locale}=useLocale(),t=stayCopy[locale]||stayCopy['vi-VN'];
 const [catalog,setCatalog]=useState(null),[loadError,setLoadError]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [city,setCity]=useState(''),[guests,setGuests]=useState(2),[checkIn,setCheckIn]=useState(()=>nextDate(1)),[checkOut,setCheckOut]=useState(()=>nextDate(2));
 const [sort,setSort]=useState('recommended'),[amenity,setAmenity]=useState(''),[saved,setSaved]=useState([]),[onlySaved,setOnlySaved]=useState(false);
 const [screen,setScreen]=useState('search'),[selected,setSelected]=useState(null),[quote,setQuote]=useState(null),[accepted,setAccepted]=useState(false),[order,setOrder]=useState(null),[orders,setOrders]=useState([]),[cancel,setCancel]=useState(null),[now,setNow]=useState(()=>Date.now());
 const requestLock=useRef(false),holdKey=useRef(null),paymentKey=useRef(null),heading=useRef(null);
 const money=v=>new Intl.NumberFormat(locale,{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(v));
 const date=v=>new Intl.DateTimeFormat(locale,{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'medium',timeStyle:'short'}).format(new Date(v));
 async function load(){setLoadError(false);try{const r=await fetch('/api/stays',{cache:'no-store',signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok||!d.ok)throw Error();setCatalog(d);const params=new URLSearchParams(location.search);setQuery((params.get('q')||'').slice(0,160));if(d.testMode&&params.get('tab')==='orders'){setOrders(await api('mine'));setScreen('orders')}const room=d.stays.find(s=>s.roomTypeId===params.get('room'));if(room){setSelected(room);setScreen('detail')}if(d.testMode&&params.get('order')){setOrder(await api('order',{orderId:params.get('order')}));setScreen('order');}}catch{setLoadError(true);}}
 // Bootstrap once; locale is consumed by render, not a new data fetch.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{const timer=setTimeout(load,0);return()=>clearTimeout(timer)},[]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[screen]);
 useEffect(()=>{if(!catalog)return;const u=new URL(location.href);if(screen==='order'&&order){u.search='';u.searchParams.set('order',order.id)}else if(['detail','review'].includes(screen)&&selected){u.search='';u.searchParams.set('room',selected.roomTypeId)}else{u.search='';if(screen==='search'&&query)u.searchParams.set('q',query)}window.history.replaceState({relooStayScreen:screen},'',u)},[screen,order,selected,catalog,query]);
 async function api(op,input={}){
  const r=await fetch('/api/stays',{method:'POST',headers:{'Content-Type':'application/json',...(op==='hold'?{'Idempotency-Key':holdKey.current}:{})},body:JSON.stringify({op,input}),signal:AbortSignal.timeout(15000)});
  const d=await r.json();if(!r.ok||!d.ok)throw Error(d.code||'SERVICE_UNAVAILABLE');return d.data;
 }
 async function act(fn){if(requestLock.current)return;requestLock.current=true;setLoading(true);setError('');try{await fn()}catch(e){setError(e.message==='SOLD_OUT'?t.soldOut:e.message==='QUOTE_EXPIRED'?t.expired:['PRICE_CHANGED','IDEMPOTENCY_CONFLICT'].includes(e.message)?t.priceChanged:t.error)}finally{requestLock.current=false;setLoading(false)}}
 function navigate(next){setError('');setCancel(null);setScreen(next);const u=new URL(location.href);u.search='';if(next==='order'&&order)u.searchParams.set('order',order.id);else if(['detail','review'].includes(next)&&selected)u.searchParams.set('room',selected.roomTypeId);window.history.pushState({relooStayScreen:next},'',u);window.scrollTo({top:0,behavior:'instant'});}
 useEffect(()=>{function back(e){const next=e.state?.relooStayScreen||'search';setScreen(next==='review'&&!quote?'detail':next==='detail'&&!selected?'search':next);setError('');setCancel(null)}window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back)},[quote,selected]);
 function invalidate(fn){fn();setQuote(null);setAccepted(false);holdKey.current=null;}
 const results=useMemo(()=>{let rows=(catalog?.stays||[]).filter(s=>(!city||s.city===city)&&s.capacity>=guests&&(!query||[s.name,s.city,s.area,s.room].join(' ').toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)))&&(!amenity||s.amenities.includes(amenity))&&(!onlySaved||saved.includes(s.id)));if(sort==='price')rows=[...rows].sort((a,b)=>a.nightlyPrice-b.nightlyPrice);return rows;},[catalog,city,guests,amenity,sort,onlySaved,saved,query,locale]);
 const remaining=order?Math.max(0,Math.ceil((Date.parse(order.hold_until)-now)/1000)):0;
 const quoteExpired=quote&&Date.parse(quote.expires_at)<=now;
 async function refreshOrder(){if(order)await act(async()=>setOrder(await api('order',{orderId:order.id})));}
 useEffect(()=>{
  const focus=()=>{setNow(Date.now());if(screen==='order'&&order)refreshOrder()};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus)};
 // Refreshes the persisted server order when returning from background.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[screen,order?.id]);
 async function showOrders(){await act(async()=>{setOrders(await api('mine'));navigate('orders')});}
 async function makeQuote(){await act(async()=>{const q=await api('quote',{roomTypeId:selected.roomTypeId,checkIn,checkOut,guests});setQuote(q);setAccepted(false);holdKey.current=crypto.randomUUID();navigate('review')});}
 const policy=<section className="stay-policy"><ShieldCheck size={23}/><div><h3>{t.policy}</h3><p>{t.policyText}</p></div></section>;
 const searchForm=<form className="stay-search" onSubmit={e=>{e.preventDefault();invalidate(()=>{});navigate('search')}}>
  <label>{t.destination}<input aria-label={t.query} value={query} maxLength={160} onChange={e=>invalidate(()=>setQuery(e.target.value))}/><select value={city} onChange={e=>invalidate(()=>setCity(e.target.value))}><option value="">{t.all}</option>{(catalog?.stays||[]).map(s=><option key={s.id}>{s.city}</option>)}</select></label>
  <label>{t.checkIn}<input required type="date" min={nextDate(0)} value={checkIn} onChange={e=>invalidate(()=>setCheckIn(e.target.value))}/></label>
  <label>{t.checkOut}<input required type="date" min={checkIn||nextDate(0)} value={checkOut} onChange={e=>invalidate(()=>setCheckOut(e.target.value))}/></label>
  <label>{t.guests}<select value={guests} onChange={e=>invalidate(()=>setGuests(Number(e.target.value)))}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
  <button className="stay-primary" type="submit">{t.search}<ArrowRight size={18}/></button>
 </form>;
 return <section className="stay-page container" aria-busy={loading}>
  <div className="stay-top"><Link href="/">RELOO</Link><span>{t.brand}</span><Link href="/dat-phong/quan-ly">{locale==='en-US'?'Partner':'Đối tác'}</Link><button onClick={showOrders} disabled={!catalog?.testMode||loading}>{t.orders}</button></div>
  <p className="stay-demo"><ShieldCheck size={18}/>{catalog?.testMode?t.local:t.demo}</p>
  <Link className="stay-back" href="/ban-do?domain=stays">{locale==='en-US'?'Map service status':'Trạng thái bản đồ chỗ ở'}<MapPin size={16}/></Link>
  {screen!=='search'&&<button className="stay-back" onClick={()=>navigate(screen==='review'?'detail':'search')}><ArrowLeft size={18}/>{t.back}</button>}
  {error&&<div className="stay-error" role="alert">{error}</div>}
  {loading&&<p role="status">{t.loading}</p>}
  {screen==='search'&&<>
   <header className="stay-hero"><div><span>RELOO REAL</span><h1 tabIndex={-1} ref={heading}>{t.title}</h1></div><div className="stay-hero-icon" aria-hidden="true"><Leaf size={34}/><BedDouble size={88}/></div></header>
   {searchForm}
   <div className="stay-results-head"><h2>{t.results}</h2><div><button aria-pressed={onlySaved} onClick={()=>setOnlySaved(!onlySaved)}><Heart size={17}/>{onlySaved?t.onlySaved:t.allRooms}</button><select aria-label={t.amenities} value={amenity} onChange={e=>setAmenity(e.target.value)}><option value="">{t.allAmenities}</option>{['wifi','kitchen','garden','desk','bathtub'].map(a=><option key={a} value={a}>{t[a]}</option>)}</select><select aria-label={t.sort} value={sort} onChange={e=>setSort(e.target.value)}><option value="recommended">{t.recommended}</option><option value="price">{t.lowPrice}</option></select></div></div>
   {!catalog&&!loadError&&<p role="status">{t.loading}</p>}
   {loadError&&<div role="alert">{t.error}<button onClick={load}>{t.retry}</button></div>}
   {catalog&&!results.length&&<p className="stay-empty" role="status">{t.empty}</p>}
   <div className="stay-grid">{results.map(s=><article className="stay-card" key={s.id}><div className={'stay-illustration '+s.tone} aria-hidden="true"><div className="stay-window"/><div className="stay-bed"/><span>DEMO</span></div><button className="stay-heart" aria-label={saved.includes(s.id)?t.saved:t.save} aria-pressed={saved.includes(s.id)} onClick={()=>setSaved(saved.includes(s.id)?saved.filter(id=>id!==s.id):[...saved,s.id])}><Heart size={20} fill={saved.includes(s.id)?'currentColor':'none'}/></button><div className="stay-card-body"><p><MapPin size={15}/>{s.area} · {s.city}</p><h3>{s.name}</h3><small>{s.capacity} {t.guestsUnit} · {t.noReviews}</small><div className="stay-chips">{s.amenities.map(a=><span key={a}>{t[a]}</span>)}</div><div className="stay-card-bottom"><div><strong>{money(s.nightlyPrice)}</strong><small>{t.night}</small></div><button onClick={()=>{setSelected(s);setQuote(null);navigate('detail')}}>{t.details}<ArrowRight size={17}/></button></div></div></article>)}</div>
  </>}
  {screen==='detail'&&selected&&<>
   <header className="stay-heading"><p><MapPin size={17}/>{selected.area} · {selected.city}</p><h1 ref={heading} tabIndex={-1}>{selected.name}</h1><p>{t.noReviews}</p></header>
   <div className="stay-detail-grid"><div><div className={'stay-illustration stay-large '+selected.tone} aria-label={t.demo} role="img"><div className="stay-window"/><div className="stay-bed"/><span>RELOO · DEMO</span></div><section className="stay-panel"><h2>{selected.room}</h2><p><BedDouble size={20}/>{selected.capacity} {t.guestsUnit}</p><h3>{t.amenities}</h3><div className="stay-chips">{selected.amenities.map(a=><span key={a}><Check size={16}/>{t[a]}</span>)}</div><h3>{t.location}</h3><p>{selected.area}, {selected.city}</p><small>{t.map}</small></section>{policy}</div><aside className="stay-panel stay-book-panel"><strong className="stay-price">{money(selected.nightlyPrice)}</strong><p>{t.night}</p>{searchForm}<p>{t.taxNote}</p><button disabled={!catalog?.testMode||loading||selected.capacity<guests} className="stay-primary" onClick={makeQuote}>{catalog?.testMode?t.quote:t.unavailable}</button></aside></div>
  </>}
  {screen==='review'&&quote&&<section className="stay-review stay-panel"><h1 tabIndex={-1} ref={heading}>{t.review}</h1><h2>{quote.snapshot.roomName}</h2><div className="stay-dates"><p>{t.checkIn}<strong>{date(quote.starts_at)}</strong></p><ArrowRight/><p>{t.checkOut}<strong>{date(quote.ends_at)}</strong></p></div><p>{quote.guests} {t.guestsUnit} · {quote.snapshot.nights} {t.nights}</p><dl className="stay-breakdown"><div><dt>{t.roomTotal}</dt><dd>{money(quote.snapshot.roomTotal)}</dd></div><div><dt>{t.fees}</dt><dd>{money(quote.snapshot.fees+quote.snapshot.tax)}</dd></div><div><dt>{t.discount}</dt><dd>{money(quote.snapshot.discount)}</dd></div><div className="stay-total"><dt>{t.total}</dt><dd>{money(quote.total)}</dd></div></dl><p>{t.taxNote}</p>{policy}<p><Clock size={17}/>{t.expires}: {date(quote.expires_at)}</p><label className="stay-accept"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>{t.accepted}</label>{quoteExpired&&<p role="alert">{t.expired}</p>}<button className="stay-primary" disabled={!accepted||loading||quoteExpired} onClick={()=>act(async()=>{const o=await api('hold',{quoteId:quote.id,policyId:quote.snapshot.policy.id});setOrder(o);paymentKey.current=crypto.randomUUID();navigate('order')})}>{t.hold}</button>{quoteExpired&&<button onClick={makeQuote}>{t.quote}</button>}</section>}
  {screen==='orders'&&<section className="stay-panel"><h1 tabIndex={-1} ref={heading}>{t.orders}</h1>{!orders.length&&<p>{t.noOrders}</p>}{orders.map(o=><button className="stay-order-row" key={o.id} onClick={()=>act(async()=>{setOrder(await api('order',{orderId:o.id}));paymentKey.current=crypto.randomUUID();navigate('order')})}><span>{o.snapshot.roomName}<small>{date(o.starts_at)}</small></span><span>{t[o.status]||o.status}<strong>{money(o.total)}</strong></span><ArrowRight size={18}/></button>)}</section>}
  {screen==='order'&&order&&<section className="stay-panel stay-review"><h1 tabIndex={-1} ref={heading}>{t.order}</h1><small>{order.id}</small><h2>{order.snapshot.roomName}</h2><p className="stay-status">{t[order.status]||order.status}</p><p>{t[order.payment_status]} · {t[order.refund_status]}</p><div className="stay-dates"><p>{t.checkIn}<strong>{date(order.starts_at)}</strong></p><p>{t.checkOut}<strong>{date(order.ends_at)}</strong></p></div><h3>{t.total}: {money(order.total)}</h3>{order.status==='HELD'&&<><p role="timer">{t.remaining}: {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</p>{!remaining&&<p role="alert">{t.expiredHold}</p>}<button disabled={loading||!remaining} className="stay-primary" onClick={()=>act(async()=>{paymentKey.current??=crypto.randomUUID();await api('pay-test',{orderId:order.id,eventId:paymentKey.current,amount:order.total});setOrder(await api('order',{orderId:order.id}))})}>{t.pay}</button></>}{['HELD','CONFIRMED'].includes(order.status)&&<button disabled={loading} onClick={()=>act(async()=>setCancel(await api('cancel-preview',{orderId:order.id})))}>{t.cancelPreview}</button>}{cancel&&<div className="stay-policy"><div><p>{t.refund}: <strong>{money(cancel.refund)}</strong></p><p>{t.expires}: {date(cancel.deadline)}</p><button disabled={loading} onClick={()=>act(async()=>{setOrder(await api('cancel',{orderId:order.id}));setCancel(null);})}>{t.cancel}</button></div></div>}{policy}<button onClick={refreshOrder} disabled={loading}>{t.retry}</button><h3>{t.history}</h3><ol>{(order.history||[]).map((h,i)=><li key={i}>{t[h.event]||h.event} · {date(h.at)}</li>)}</ol><Link href="/help">{t.support}</Link></section>}
 </section>;
}
