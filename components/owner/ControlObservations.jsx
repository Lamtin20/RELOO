'use client';
import {controlText} from '@/lib/operations/control-content';
import styles from './ControlCenter.module.css';
export function ControlObservations({observations,ai,locale,workloads=[]}){
 const t=controlText(locale),n=observations?.newsroom;
 if(!observations)return null;
 const time=v=>v?new Intl.DateTimeFormat(locale,{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(v)):t.unknown;
 const label=code=>t[code]||code||t.unknown;
 return <section className={styles.observations} aria-label={t.observability}>
  <header><div><p className={styles.eyebrow}>{t.operationalHistory}</p><h2>{t.observability}</h2></div><span>{t.source}</span></header>
  {n&&<><div className={styles.pipelineHeader}><h3>{t.newsPipeline}</h3><a href="/crm?view=news">{t.open}</a></div>
   <div className={styles.observationCards}>{[[t.publishedToday,n.publishedToday],[t.eligible,n.eligible],[t.held,n.held.length],[t.budget,ai?.budgetVnd],[t.target,ai?.dailyTarget]].map(([name,value])=><article key={name}><span>{name}</span><strong>{value??'—'}</strong></article>)}</div>
   <div className={styles.runState} role="status"><b>{t.latestRun}: {label(n.lastRun?.status)}</b><time>{time(n.lastRun?.at)}</time>{n.lastRun?.code&&<code>{n.lastRun.code}</code>}{n.lastRun?.status==='NO_FRESH_SOURCE'&&<p>{t.noFreshExplain}</p>}</div>
   <div className={styles.observationCards}>{n.steps.map(s=><article key={s.kind}><h3>{t[s.kind]}</h3><strong>{s.available?s.succeededToday:'—'}</strong><span>{t.succeededToday}</span><p>{t.lastSuccess}<br/><b>{time(s.lastSuccessAt)}</b></p><p>{t.lastAttempt}<br/>{time(s.lastAttemptAt)} · {label(s.lastStatus)}</p>{s.errorCode&&<code>{s.errorCode}</code>}<small>{t.spentToday}: {s.available?s.spentTodayVnd:'—'} đ</small>{s.kind==='IMAGE'&&<p>{ai?.imageEnabled?t.imageEnabled:t.imageDisabled}</p>}</article>)}</div>
   <details className={styles.sourceDetails} open><summary>{t.sources} · {n.sources.length}</summary><div>{n.sources.map(s=><article key={s.id}><b>{s.name}</b><span>{t.checked}: {time(s.checkedAt)}</span><span>{t.discovered}: {s.discovered??'—'} · {t.eligibleBatch}: {s.eligible??'—'}</span>{s.errorCode&&<code>{s.errorCode}</code>}</article>)}</div></details>
   {n.held.length>0&&<details className={styles.sourceDetails}><summary>{t.held} · {n.held.length}</summary>{n.held.map((r,i)=><p key={i}>{label(r.status)} · <code>{r.code}</code></p>)}</details>}{n.capped&&<p className={styles.warning}>{t.limited}</p>}</>}
  <div className={styles.observationCards}>{observations.channels.map(c=><article key={c.id}><h3>{t[c.id]}</h3><strong>{c.observed??'—'}</strong><span>{c.available?t.observedRows:t.unavailable}</span><p>{t.pending}: {c.available?c.waiting:'—'} · {t.errors}: {c.available?c.failed:'—'}</p><small>{t.last}: {time(c.lastAt)}</small>{c.capped&&<p>{t.limited}</p>}</article>)}</div>
  {workloads.length>0&&<><h3>{t.jobs}</h3><div className={styles.observationCards}>{workloads.map(w=><article key={w.kind}><h3>{t[w.kind]||w.kind}</h3><strong>{w.observed}</strong><span>{t.observedRows}</span><p>{t.running}: {w.running} · {t.pending}: {w.waiting} · {t.errors}: {w.failed}</p><small>{time(w.lastActivity)}</small></article>)}</div></>}
  {observations.runtime&&<p className={styles.runtime}>{t.runtime}: {t.memory} {observations.runtime.memoryRssMb} MB · {t.uptime} {observations.runtime.uptimeSeconds}<br/>{t.runtimeNote}</p>}
  <p className={styles.meta}>{t.integrationNote}</p>
 </section>;
}
