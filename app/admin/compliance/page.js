'use client';
import {useEffect,useState} from 'react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {RelooLoading} from '@/components/ui/RelooLoading';
export default function ComplianceDashboard(){
 const {locale}=useLocale(),en=locale==='en-US',t=(vi,english)=>en?english:vi;
 const [data,setData]=useState(null),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{const c=new AbortController();fetch('/api/admin/compliance',{signal:c.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();setData(await r.json());setError(false)}).catch(e=>{if(e.name!=='AbortError')setError(true)});return()=>c.abort()},[revision]);
 return <section style={{minWidth:0,overflowWrap:'anywhere'}}><h1>Compliance Guardian</h1><p>{t('Kết quả kỹ thuật không phải chứng nhận tuân thủ pháp luật.','Technical results do not certify legal compliance.')}</p>{error?<div role="alert"><p>{t('Chưa tải được báo cáo. Kiểm tra quyền truy cập và báo cáo đã được tạo.','Report unavailable. Check access and whether an audit report has been generated.')}</p><button className="btn" onClick={()=>setRevision(v=>v+1)}>{t('Thử lại','Retry')}</button></div>:!data?<RelooLoading/>:<>
 <p role="status"><strong>{t('Release','Release')}: {data.gate.status}</strong> · {new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(data.at))}</p>
 <p>{t('Bản kiểm tra','Reviewed revision')}: {data.commit} {data.dirty?'· working tree':''}</p><p style={{overflowWrap:'anywhere'}}>SHA-256: {data.sourceHash}</p>
 <dl style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBlock:24}}>{['PASS','FAIL','NOT_TESTED','NEEDS_REVIEW','NEEDS_LEGAL_REVIEW'].map(s=><div key={s} style={{padding:16,background:"var(--reloo-card)",borderRadius:12}}><dt style={{fontSize:12}}>{s}</dt><dd>{data.rules.filter(r=>r.status===s).length}</dd></div>)}</dl>
 <p>{['CRITICAL','HIGH','MEDIUM','LOW'].map(s=>s+': '+data.findings.filter(f=>f.severity===s).length).join(' · ')}</p>
 <h2>{t('Quy tắc và người phụ trách','Rules and owners')} ({data.rules.length})</h2><div style={{overflowX:'auto'}}><table className="table" style={{minWidth:760,background:"var(--reloo-card)"}}><thead><tr>{['Rule','Scope','Status','Owner'].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{data.rules.map(r=><tr key={r.id}><th scope="row">{r.id}<br/>{r.description}</th><td>{r.scope.join(', ')}</td><td style={{whiteSpace:"nowrap"}}>{r.status}</td><td>{r.owner}</td></tr>)}</tbody></table></div>
 <h2>{t('Phát hiện cần xử lý','Findings to review')}</h2>{data.findings.length===0?<p>{t('Không có phát hiện từ bộ quét đã chạy; các mục chưa kiểm thử vẫn cần bằng chứng.','No findings from executed scans; untested controls still require evidence.')}</p>:data.findings.map(f=><article key={f.id}><h3>{f.rule} · {f.severity} · {f.status}</h3><p>{f.reason}</p><p>{f.path}:{f.line||''}</p><p>{f.remediation}</p></article>)}
 <h2>{t('Bằng chứng còn thiếu','Missing evidence')}</h2><p>{data.gate.missing.join(', ')}</p>
 <p>{t('Lịch sử báo cáo được lưu theo thời điểm chạy ở artifact CI/local. Báo cáo này không quan sát production theo thời gian thực.','Timestamped history is retained in CI/local artifacts. This report does not observe production in real time.')}</p>
 <ul>{(data.history||[]).map(h=><li key={h.at}>{h.at} · {h.status} · {h.findings} {t('phát hiện','findings')}</li>)}</ul>
 </>}</section>;
}
