'use client';
import {useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {ShieldCheck,ArrowLeft,BriefcaseBusiness,ArrowRight,Search,ClipboardList,Plus,UserRound,Clock3,CalendarDays,Building2,Check,LifeBuoy} from 'lucide-react';
import {IntentLink as Link} from '@/components/mobile/IntentLink';
import {useLocale} from '@/components/settings/LocaleProvider';
import {useAuth} from '@/lib/store';
import {MINI_APPS,safeModuleIntent,moduleSearchHref} from '@/lib/product/modules';
import {superappCopy} from '@/lib/i18n/superapp';
import {MiniAppCards,ServiceIllustration} from './SuperAppEntry';
import './superapp.css';
function SparkleServiceLink({locale}){const en=locale==='en-US';return <><BriefcaseBusiness size={26}/><div><h3>{en?'Try service matching':'Trải nghiệm kết nối dịch vụ'}</h3><p>{en?'Prepare your needs, review DEMO offers and try the request journey. No real hiring or payment.':'Chuẩn bị nhu cầu, xem gói DEMO và thử hành trình gửi yêu cầu. Không tuyển dụng hay thu tiền thật.'}</p><Link className="sa-back" href="/viec-lam/dich-vu">{en?'Explore the sandbox':'Khám phá bản thử'}<ArrowRight size={18}/></Link></div></>}
export function ServiceDirectory({purpose='search'}){
 const {locale}=useLocale(),t=superappCopy[locale]||superappCopy['vi-VN'],params=useSearchParams(),{isAuthenticated}=useAuth(),router=useRouter();
 const [query,setQuery]=useState(params.get('q')?.slice(0,160)||''),[domain,setDomain]=useState(safeModuleIntent(params.get('module'))||'');
 const title=purpose==='post'?t.post:purpose==='transactions'?t.transactions:t.choose,Icon=purpose==='post'?Plus:purpose==='transactions'?ClipboardList:Search;
 function search(e){e.preventDefault();if(domain)router.push(moduleSearchHref(domain,query));else{router.replace('/tim-kiem'+(query.trim()?'?q='+encodeURIComponent(query.trim()):''));document.getElementById('sa-service-choices')?.focus()}}
 return <section className={'sa-page sa-directory sa-directory--'+purpose+' container'}>
  <Link href="/" className="sa-back"><ArrowLeft size={18}/>{t.home}</Link>
  <header className="sa-directory-hero"><div className="sa-page-title"><span>RELOO REAL · {t.apps}</span><h1>{title}</h1><p>{purpose==='post'?t.postIntro:purpose==='transactions'?t.transactionsIntro:t.searchIntro}</p></div><div className="sa-directory-symbol" aria-hidden="true"><Icon size={63} strokeWidth={1.25}/><span>✦</span></div></header>
  {purpose==='search'&&<form role="search" aria-label={t.searchLabel} className="sa-search" onSubmit={search}><label><Search size={21}/><span className="sr-only">{t.query}</span><input aria-label={t.query} value={query} placeholder={t.placeholder} maxLength={160} onChange={e=>setQuery(e.target.value)}/></label><div className="sa-search-actions"><select aria-label={t.apps} value={domain} onChange={e=>setDomain(e.target.value)}><option value="">{t.all}</option>{MINI_APPS.map(m=><option key={m.id} value={m.id}>{m.label[locale]}</option>)}</select><button type="submit">{t.search}<ArrowRight size={17}/></button></div></form>}
  {purpose==='post'&&<ol className="sa-post-steps" aria-label={t.postGuide}>{t.postSteps.map((step,i)=><li key={step}><span>{String(i+1).padStart(2,'0')}</span>{step}</li>)}</ol>}
  {purpose==='search'&&<Link className="sa-back" href={'/ban-do?'+new URLSearchParams({q:query})}>{locale==='en-US'?'Explore the map':'Khám phá trên bản đồ'}<ArrowRight size={16}/></Link>}
  {purpose==='transactions'&&!isAuthenticated&&<section className="sa-account-prompt"><div className="sa-account-prompt-icon"><UserRound size={27}/></div><div><h2>{t.accountNote}</h2><p>{t.accountNoteText}</p></div><Link href={'/auth?next='+encodeURIComponent('/giao-dich')}>{t.signIn}<ArrowRight size={17}/></Link></section>}
  <div className="sa-section-label" id="sa-service-choices" tabIndex={-1}><h2>{t.servicesTitle}</h2><p>{t.servicesHint}</p></div>
  <MiniAppCards query={query} purpose={purpose}/>
  <div className="sa-directory-bottom">{purpose==='post'&&<p className="sa-note"><ShieldCheck size={18}/>{t.privacy}</p>}<Link href="/help" className="sa-help-card"><LifeBuoy size={20}/><span><strong>{t.help}</strong></span><ArrowRight size={16}/></Link></div>
 </section>;
}
export function JobsLanding(){
 const {locale}=useLocale(),t=superappCopy[locale]||superappCopy['vi-VN'],params=useSearchParams();
 const router=useRouter(),role=params.get('role')==='employer'?'employer':'worker',[type,setType]=useState('shift');
 const setRole=value=>router.replace('/viec-lam?role='+value,{scroll:false});
 const types=[['shift',Clock3],['partTime',CalendarDays],['fullTime',Building2]],steps=role==='worker'?t.workerSteps:t.employerSteps;
 return <section className="sa-page sa-jobs container">
  <Link className="sa-back" href="/ban-do?domain=jobs">{locale==='en-US'?'Map service status':'Trạng thái bản đồ việc làm'}<ArrowRight size={16}/></Link>
  <Link href="/" className="sa-back"><ArrowLeft size={18}/>{t.home}</Link>
  <header className="sa-jobs-hero"><div className="sa-page-title"><span>{t.jobsService} · {t.soon}</span><h1>{t.jobsTitle}</h1><p>{t.jobsIntro}</p></div><ServiceIllustration id="jobs"/></header>
  <section className="sa-guide-note"><SparkleServiceLink locale={locale}/></section>
  <div className="sa-role-switch" role="group" aria-label={t.apps}>{['worker','employer'].map(id=><button key={id} aria-pressed={role===id} onClick={()=>setRole(id)}>{id==='worker'?<UserRound size={20}/>:<BriefcaseBusiness size={20}/>}<span>{t[id]}</span>{role===id&&<Check size={16}/>}</button>)}</div>
  <p className="sa-role-note">{role==='worker'?t.workerNote:t.employerNote}</p>
  <div className="sa-work-types" role="group" aria-label={t.choose}>{types.map(([id,Icon])=><button key={id} aria-pressed={type===id} onClick={()=>setType(id)}><span className="sa-work-type-icon"><Icon size={24}/></span><strong>{t[id]}</strong><span>{t[id+'Hint']}</span><span className="sa-work-type-check" aria-hidden="true">{type===id&&<Check size={13}/>}</span></button>)}</div>
  <div className="sa-jobs-content"><section className="sa-empty"><span className="sa-empty-icon"><BriefcaseBusiness size={32}/></span><span className="sa-inline-status">{t.soon}</span><h2>{t.jobsEmpty}</h2><p>{t.jobUnknown}</p></section><section className="sa-roadmap"><h2>{t.jobsRoadmap}</h2><ol>{steps.map((step,i)=><li key={step}><span>{i+1}</span>{step}</li>)}</ol></section></div>
  <section className="sa-guide-note"><ShieldCheck size={26}/><div><h3>{t.safetyTitle}</h3><p>{t.jobsSafety}</p></div></section>
 </section>;
}
