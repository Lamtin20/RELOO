'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Activity,Pause,Play,RefreshCw,Plus,Minus,RotateCw,House,Layers,Search,ShieldCheck,Server,Bot,CalendarClock,Building2,ShoppingBag} from 'lucide-react';
import {controlText} from '@/lib/operations/control-content';
import styles from './ControlCenter.module.css';
import {ControlObservations} from './ControlObservations';
import {ControlInfrastructure} from './ControlInfrastructure';
import {useLocale} from '@/components/settings/LocaleProvider';
const positions={gateway:[330,190],jobs:[590,290],news:[810,170],orders:[295,420],calendar:[805,435],residency:[555,550]};
const icons={gateway:Server,jobs:Layers,news:Bot,orders:ShoppingBag,calendar:CalendarClock,residency:Building2};
function Tower({x,y,id,status,selected,onSelect,label}){
 const Icon=icons[id]||Server;
 return <g transform={`translate(${x} ${y})`} className={`${styles.tower} ${selected?styles.selected:''}`}>
  <ellipse cx="0" cy="36" rx="74" ry="31" fill="#163e3820"/>
  <path d="M-68 15 0-20 68 15 0 51Z" fill="#cce7dc" stroke="#b2d5c6"/>
  <path d="M-49-7 0 19 0-91-49-117Z" fill="#6aa791"/><path d="M0 19 49-7 49-117 0-91Z" fill="#27775f"/>
  <path d="M-49-117 0-143 49-117 0-91Z" fill="#b4e3c6"/>
  {[0,1,2].map(i=><g key={i} transform={`translate(0 ${i*25})`}><path d="M-38-95-10-80v10l-28-15Z" fill="#d2efe0"/><path d="M12-80 38-94v10L12-70Z" fill="#79bba1"/></g>)}
  <circle cy="-117" r="13" fill="#fff"/><foreignObject x="-9" y="-126" width="18" height="18"><Icon size={18} color="#1d735a"/></foreignObject>
  <g className={styles.selectionRing}><path d="M-80 4v-14l17-9M80 4v-14l-17-9M-80 38v14l17 9M80 38v14l-17 9" fill="none" stroke="#00865c" strokeWidth="3"/></g>
  <foreignObject x="-110" y="62" width="220" height="65"><button type="button" className={styles.nodeButton} onClick={onSelect} aria-pressed={selected}><span className={`${styles.dot} ${styles[status]}`}/>{label}</button></foreignObject>
  <title>{label}</title>
 </g>;
}
export default function ControlCenter({previewData=null,previewLive=false}){
 const {locale}=useLocale();
 const t=controlText(locale),[data,setData]=useState(previewData),[error,setError]=useState(''),[paused,setPaused]=useState(false),[loading,setLoading]=useState(!previewData),[selected,setSelected]=useState('gateway'),[query,setQuery]=useState(''),[mode,setMode]=useState('map'),[camera,setCamera]=useState({zoom:1,rotation:0,x:0,y:0});
 const search=useRef(null),controller=useRef(null),drag=useRef(null),mounted=useRef(false),observationsAnchor=useRef(null);
 const refresh=useCallback(async()=>{
  if(previewData&&!previewLive)return;
  controller.current?.abort();const c=new AbortController();controller.current=c;setLoading(true);
  const timeout=setTimeout(()=>c.abort(),10000);
  try{const response=await fetch('/api/crm/control-center',{cache:'no-store',signal:c.signal});if(!response.ok){if([401,403].includes(response.status)){setData(null);setPaused(true);throw Error('login');}throw Error('error');}const next=await response.json();if(!c.signal.aborted&&mounted.current){setData(next);setError('');}}
  catch(e){if(mounted.current&&controller.current===c){if(e.name!=='AbortError'||c.signal.aborted)setError(e.message==='login'?'login':'error');}}
  finally{clearTimeout(timeout);if(mounted.current&&controller.current===c)setLoading(false);}
 },[previewData,previewLive]);
 useEffect(()=>{mounted.current=true;const timer=setTimeout(()=>{if(!previewData||previewLive)refresh();},0);return()=>{clearTimeout(timer);mounted.current=false;controller.current?.abort();};},[refresh,previewData,previewLive]);
 useEffect(()=>{if(paused||previewData&&!previewLive)return;const tick=()=>{if(document.visibilityState==='visible')refresh();};const timer=setInterval(tick,15000);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};},[paused,previewData,previewLive,refresh]);
 useEffect(()=>{function key(e){if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();search.current?.focus();}if(e.key==='Escape'){setQuery('');search.current?.blur();}}document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);
 const nodes=data?.nodes||[],filtered=nodes.filter(n=>t[n.id]?.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale))),current=filtered.find(n=>n.id===selected)||filtered[0],available=nodes.filter(n=>n.metrics),attention=nodes.filter(n=>['attention','unavailable'].includes(n.status)).length;
 const zoom=(delta)=>setCamera(c=>({...c,zoom:Math.min(1.5,Math.max(.65,c.zoom+delta))}));
 const choose=id=>{setSelected(id);};
 const formatTime=value=>value?new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value)):t.unknown;
 return <section className={styles.center} aria-label={t.title}>
  {previewData&&<div className={styles.preview}>{t.sandbox}</div>}
  <header className={styles.top}><div className={styles.brandMark}><Activity size={23}/></div><div><p className={styles.eyebrow}>RELOO OPERATIONS</p><h1>{t.title}</h1></div><label className={styles.search}><Search size={17}/><input ref={search} aria-label={t.search} placeholder={t.search} value={query} onChange={e=>setQuery(e.target.value)}/><kbd>/</kbd></label><span className={styles.live}><span className={styles.dot}/>{paused?t.paused:t.live}</span><button type="button" className={styles.iconButton} aria-label={paused?t.resume:t.pause} onClick={()=>setPaused(p=>!p)}>{paused?<Play size={17}/>:<Pause size={17}/>}</button><button type="button" className={styles.iconButton} aria-label={t.refresh} disabled={loading||!!previewData&&!previewLive} onClick={refresh}><RefreshCw size={17} className={loading?styles.spin:''}/></button></header>
  {error&&<div role="alert" className={styles.error}>{t[error]} {error!=='login'&&<button onClick={refresh} disabled={loading}>{t.retry}</button>}{error==='login'&&<a href="/crm/login?next=%2Fcrm%3Fview%3Dcontrol">CRM</a>}</div>}
  {data?.observations?.newsroom&&<div className={styles.liveSummary} role="status"><span>{t.latestRun}: <b>{t[data.observations.newsroom.lastRun?.status]||data.observations.newsroom.lastRun?.status||t.unknown}</b></span><span>{t.publishedToday}: <b>{data.observations.newsroom.publishedToday??'—'}</b></span><button type="button" onClick={()=>observationsAnchor.current?.scrollIntoView({block:'start'})}>{t.observability}</button></div>}
  <div className={styles.world}>
   <div className={styles.kpis}>{[[t.coverage,`${available.length} / ${nodes.length}`],[t.issues,data?attention:'—'],[t.activity,data?available.reduce((s,n)=>s+n.metrics.observed,0):'—']].map(([label,value])=><article key={label}><span>{label}</span><strong>{value}</strong><small>{t.source}</small></article>)}</div>
   <div className={styles.sceneHeader}><span>{t.subtitle}</span><div className={styles.toggle}>{['map','list'].map(m=><button type="button" aria-pressed={mode===m} key={m} onClick={()=>setMode(m)}>{t[m]}</button>)}</div></div>
   {loading&&!data?<div className={styles.skeleton} aria-busy="true">{t.source}…</div>:!filtered.length?<p className={styles.empty}>{t.noResults}</p>:mode==='map'?<div className={styles.scene}>
    <svg viewBox="70 -10 900 780" role="group" aria-label={t.map} onPointerDown={e=>{if(e.target.closest('button'))return;drag.current={x:e.clientX,y:e.clientY,camera};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current){const d=drag.current;setCamera(c=>({...c,x:d.camera.x+(e.clientX-d.x),y:d.camera.y+(e.clientY-d.y)}));}}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
     <defs><pattern id="control-grid" width="44" height="26" patternUnits="userSpaceOnUse"><path d="M0 13 22 0 44 13 22 26Z" fill="none" stroke="#86b5a430" strokeWidth=".8"/></pattern></defs>
     <g transform={`translate(${camera.x} ${camera.y}) translate(525 360) scale(${camera.zoom}) rotate(${camera.rotation}) translate(-525 -360)`}>
      <path d="M70 250 500 5 975 280 975 520 550 770 70 490Z" fill="#e3eee8" stroke="#cbded3"/><path d="M70 250 500 5 975 280 975 520 550 770 70 490Z" fill="url(#control-grid)"/>
      {(data.links||[]).map(([a,b])=>{const p=positions[a],q=positions[b];return <g key={a+b}><path className={styles.road} d={`M${p[0]} ${p[1]+30} L${q[0]} ${q[1]+30}`}/><path className={`${styles.flow} ${paused?styles.stopped:''}`} d={`M${p[0]} ${p[1]+30} L${q[0]} ${q[1]+30}`}/></g>;})}
      {[150,210,880,920,120,650].map((x,i)=><g key={x} transform={`translate(${x} ${[300,180,330,495,450,645][i]})`}><ellipse cy="16" rx="20" ry="10" fill="#95bda64a"/><path d="M0 0v20" stroke="#759785" strokeWidth="5"/><ellipse cy="-13" rx="17" ry="26" fill="#9ec4a5"/><ellipse cy="-18" cx="-5" rx="12" ry="20" fill="#b4d1b6"/></g>)}
      {filtered.map(n=><Tower key={n.id} x={positions[n.id][0]} y={positions[n.id][1]} {...n} selected={current?.id===n.id} label={t[n.id]} onSelect={()=>choose(n.id)}/>)}
     </g>
    </svg><div className={styles.camera}>{[[t.zoomIn,Plus,()=>zoom(.1)],[t.zoomOut,Minus,()=>zoom(-.1)],[t.rotate,RotateCw,()=>setCamera(c=>({...c,rotation:(c.rotation+15)%360}))],[t.reset,House,()=>setCamera({zoom:1,rotation:0,x:0,y:0})]].map(([label,Icon,action])=><button key={label} aria-label={label} onClick={action}><Icon size={18}/></button>)}</div></div>:<div className={styles.serviceList}>{filtered.map(n=><button key={n.id} onClick={()=>choose(n.id)} aria-pressed={n.id===current?.id}><span>{t[n.id]}</span><span className={styles.status}>{t[n.status]}</span></button>)}</div>}
   <nav className={styles.mobileNodes} aria-label={t.list}>{filtered.map(n=><button key={n.id} onClick={()=>choose(n.id)} aria-pressed={current?.id===n.id}>{t[n.id]}</button>)}</nav><aside className={styles.details}>{current?<><p className={styles.eyebrow}>{t.detail} / {current.id.toUpperCase()}</p><h2>{t[current.id]}</h2><span className={`${styles.badge} ${styles[current.status]}`}><span className={styles.dot+' '+styles[current.status]}/>{t[current.status]}</span><p className={styles.description}>{t[current.id+'Desc']}</p><p className={styles.meta}>{current.windowHours===null?t.inventoryWindow:t.window}</p>{current.id==='news'&&data.ai&&<div className={styles.aiConfig}><h3>{t.aiConfig} · {data.ai.provider}</h3><b>{data.ai.enabled?t.aiEnabled:t.aiDisabled}</b><p>{data.ai.ready?t.aiReady:t.aiBlocked}</p></div>}<dl>{[['sample',current.metrics?.observed],['running',current.metrics?.running],['waiting',current.metrics?.waiting],['failed',current.metrics?.failed]].map(([key,value])=><div key={key}><dt>{t[key]}</dt><dd>{value??'—'}</dd></div>)}</dl>{current.metrics?.p95!==null&&current.metrics?.p95!==undefined&&<p className={styles.meta}>{t.p95}: <b>{current.metrics.p95} ms</b></p>}<p className={styles.meta}>{t.last}<br/><b>{formatTime(current.metrics?.lastActivity)}</b></p>{current.capped&&<p className={styles.warning}>{t.limited}</p>}{current.view&&<a className={styles.open} href={'/crm?view='+current.view}>{t.open}</a>}</>:<p>{t.inspect}</p>}{current?.events?.length>0&&<div className={styles.events}><h3>{t.recentActivity}</h3>{current.events.map((event,i)=><div key={i}><time>{formatTime(event.at)}</time><code>{event.status}</code></div>)}</div>}<div className={styles.safety}><ShieldCheck size={17}/><span>{t.restricted}</span></div></aside>
   <div className={styles.bottom}><div><span className={styles.eyebrow}>{t.topology}</span><p>{t.note}</p></div><span className={styles.timestamp}>{nodes.some(n=>n.id==='jobs')&&<span>{t[data?.heartbeat==='recent'?'workerRecent':data?.heartbeat==='stale'?'workerStale':'workerUnknown']}<br/></span>}{error?t.stale:t.updated+' '+formatTime(data?.generatedAt)}</span></div>
  </div>
  <div ref={observationsAnchor}><ControlInfrastructure data={data?.infrastructure} locale={locale}/>
  <ControlObservations observations={data?.observations} ai={data?.ai} locale={locale} workloads={data?.nodes?.find(n=>n.id==='jobs')?.workloads}/></div>
  <footer className={styles.footer}><span>{t.scope}</span><span>RELOO · {data?.schemaVersion?'v'+data.schemaVersion:'—'}</span></footer>
 </section>;
}
