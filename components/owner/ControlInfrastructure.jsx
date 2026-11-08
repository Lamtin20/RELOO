'use client';
import {controlText} from '@/lib/operations/control-content';
import styles from './ControlCenter.module.css';
export function ControlInfrastructure({data,locale}){
 const t=controlText(locale);
 if(!data)return null;
 const time=new Intl.DateTimeFormat(locale,{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(data.at));
 return <section className={styles.observations} aria-label={t.infrastructure}>
  <header><div><p className={styles.eyebrow}>{t.serverScope}</p><h2>{t.infrastructure}</h2></div><span>{data.stale?t.staleCollector:t.updated} · {time}</span></header>
  <div className={styles.observationCards}>{[[t.cpu,data.cpuPercent===null?'—':data.cpuPercent+'%'],[t.serverMemory,`${data.memoryUsedMb??'—'} / ${data.memoryTotalMb??'—'} MB`],[t.disk,`${data.diskUsedGb??'—'} / ${data.diskTotalGb??'—'} GB`],[t.publicHealth,data.publicHttpStatus??'—']].map(([label,value])=><article key={label}><span>{label}</span><strong className={styles.metricValue}>{value}</strong></article>)}</div>
  <div className={styles.observationCards}><article><span>{t.hostDiskFree}</span><strong className={styles.metricValue}>{data.hostDiskFreeGb??'—'} GB</strong></article>{data.kubernetes&&<><article><span>{t.kubernetesReady}</span><strong className={styles.metricValue}>{data.kubernetes.readyPods??'—'} / {data.kubernetes.totalPods??'—'}</strong><small>{data.kubernetes.stale?t.staleCollector:t.updated}</small></article><article><span>{t.kubernetesAutoscale}</span><strong className={styles.metricValue}>{data.kubernetes.desiredReplicas??'—'} / {data.kubernetes.maxReplicas??'—'}</strong><small>{data.kubernetes.autoscalingActive===true?t.kubernetesMetricsReady:t.unknown}</small></article><article><span>{t.kubernetesRouting}</span><strong className={styles.metricValue}>{data.kubernetes.publicPageRouting?t.kubernetesEnabled:t.kubernetesStandby}</strong><small>{t.kubernetesScope}</small></article></>}</div>
  {data.kubernetes?.singlePhysicalHost&&<p className={styles.runtime}>{t.kubernetesSingleHost}</p>}
  <div className={styles.containerGrid}>{data.containers.map(c=><article key={c.id}><span className={`${styles.dot} ${c.status==='running'&&c.health!=='unhealthy'?styles.observed:styles.attention}`}/><div><b>{t['service_'+c.id]}</b><p>{t['container_'+c.status]||t.unknown}{c.health?' · '+(t['health_'+c.health]||c.health):''}</p></div><small>{t.restarts}: {c.restarts??'—'}</small></article>)}</div>
  <p className={styles.meta}>{t.infrastructureNote}</p>
 </section>;
}
