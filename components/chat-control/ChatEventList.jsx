'use client';
import {ChevronRight,Activity} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {eventPresentation} from '@/lib/chat-control/presentation';
export function EventRows({rows,onThread,canReadThreads=false}){
 const {locale}=useLocale(),en=locale==='en-US',t=(vi,english)=>en?english:vi;
 const time=value=>new Intl.DateTimeFormat(locale,{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));
 if(!rows?.length)return <div className="cc-empty cc-empty--center"><Activity size={26} aria-hidden="true"/><strong>{t('Chưa có hoạt động','No activity yet')}</strong><p>{t('Các lượt tư vấn và thao tác sẽ xuất hiện tại đây.','Advice turns and operations will appear here.')}</p></div>;
 return <ol className="cc-event-list">{rows.map(e=>{
  const d=e.data||{},view=eventPresentation(e,en);
  return <li key={e.id} className="cc-event-row"><span className="cc-event-dot" aria-hidden="true"/><div className="cc-event-content"><header className="cc-event-heading"><div className="cc-event-identity"><strong>{view.title}</strong><span className="cc-event-source">{view.source}</span></div><time dateTime={e.created_at}>{time(e.created_at)}</time></header>
   {view.metadata&&<p className="cc-event-meta">{view.metadata}</p>}
   {d.answer&&<p className="cc-event-excerpt">{d.answer}</p>}
   {view.hasDetails&&<details className="cc-event-details"><summary>{t('Xem chi tiết','View details')}</summary><div>{d.path&&<p><span>{t('Trang','Page')}</span><code>{d.path}</code></p>}{e.bot_version&&<p><span>{t('Phiên bản','Version')}</span><code>{e.bot_version.slice(0,8)}</code></p>}{d.answer&&<blockquote>{d.answer}</blockquote>}{d.products?.map(p=><p key={p.id}>{p.title} · {new Intl.NumberFormat(locale).format(p.price)} VND / {p.unit}</p>)}{d.sources?.map((s,i)=><p key={i}>{s.title}<code>{s.url}</code></p>)}</div></details>}
   {(d.requiresCustomerConfirmation||e.conversation_id&&canReadThreads)&&<footer className="cc-event-actions">{d.requiresCustomerConfirmation&&<span className="cc-tag">{t('Khách xác nhận giao dịch','Customer confirms transactions')}</span>}{e.conversation_id&&canReadThreads&&<button type="button" onClick={()=>onThread(e.conversation_id)}>{t('Mở hội thoại','Open conversation')}<ChevronRight size={15}/></button>}</footer>}
  </div></li>;
 })}</ol>;
}
