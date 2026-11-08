'use client';
import {IdentityStatusBadge} from './IdentityStatus';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Pencil,UserRound,CheckCircle2,AlertCircle} from 'lucide-react';
import {useAuth} from '@/lib/store';
import {useLocale} from '@/components/settings/LocaleProvider';
import {accountExperienceCopy} from '@/lib/i18n/account-experience';
import {accountLayoutCopy} from '@/lib/i18n/account-layout';
export function AccountProfileEditor(){
 const {user,refreshSession}=useAuth(),{locale}=useLocale(),t=accountExperienceCopy[locale]||accountExperienceCopy['vi-VN'],l=accountLayoutCopy[locale]||accountLayoutCopy['vi-VN'];
 const [form,setForm]=useState({name:user?.name||'',bio:''}),[record,setRecord]=useState(null),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[reload,bump]=useState(0),actor=useRef(user?.id);
 useEffect(()=>{actor.current=user?.id;let live=true;const controller=new AbortController();fetch('/api/profile',{signal:controller.signal,cache:'no-store'}).then(r=>r.json()).then(d=>{if(!d.ok)throw Error(t.error);if(live){setRecord(d);setForm({name:d.profile.name||'',bio:d.details?.bio||''});}}).catch(e=>{if(live&&e.name!=='AbortError')setError(t.error);});return()=>{live=false;actor.current=null;controller.abort();};},[user?.id,reload,t.error]);
 async function save(e){e.preventDefault();if(busy)return;const owner=user?.id;setBusy(true);setError('');setNotice('');try{const r=await fetch('/api/profile',{method:'PUT',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify(form)}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error);if(actor.current!==owner)return;await refreshSession();setRecord(current=>({...current,profile:{...current.profile,name:form.name},details:{...current.details,bio:form.bio}}));setEditing(false);setNotice(t.saved);}catch(e){if(actor.current===owner)setError(e.message||t.error);}finally{if(actor.current===owner)setBusy(false);}}
 const contact=record?.contact,profile=record?.profile||user,date=(v,zone='UTC')=>{const n=typeof v==='string'?Date.parse(v):NaN;return Number.isFinite(n)?new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric',timeZone:zone}).format(n):t.missing;};
 const verification=value=>value===undefined?null:<span className={'ap-status '+(value?'is-verified':'is-pending')}>{value?<CheckCircle2 size={13}/>:<AlertCircle size={13}/>} {value?l.verified:l.unverified}</span>;
 return <section className="ah-inline-profile account-profile-card"><header><div><h2>{locale==='en-US'?'Personal profile':'Hồ sơ cá nhân'}</h2><IdentityStatusBadge/></div><button type="button" className="ap-edit" disabled={!record||busy} onClick={()=>{setEditing(!editing);setError('');setNotice('');if(editing)setForm({name:record.profile.name||'',bio:record.details?.bio||''});}}><Pencil size={16}/>{editing?l.cancel:l.edit}</button></header>
 
 <div className="ap-layout"><div className="ap-person"><span className="ap-avatar">{profile?.avatar&&!profile.avatar.includes('/brand/reloo-logo')?<img src={profile.avatar} alt=""/>:<UserRound size={48}/>}</span><h3>{profile?.name||t.profile}</h3>{contact?.joinedAt&&<p>{l.joined}: {date(contact.joinedAt,'Asia/Ho_Chi_Minh')}</p>}</div>
 <div className="ap-details"><dl className="ap-basics">{record?.details?.birthDate&&<div><dt>{l.birth}</dt><dd>{date(record.details.birthDate)}</dd></div>}{profile?.address&&<div><dt>{l.address}</dt><dd>{profile.address}</dd></div>}</dl>
 <dl className="ap-contacts">{profile?.phone&&<div><dt>{t.phone}{verification(contact?.phoneVerified)}</dt><dd>{profile.phone}</dd></div>}{profile?.email&&<div><dt>{t.email}{verification(contact?.emailVerified)}</dt><dd>{profile.email}</dd></div>}{contact?.googleLinked&&<div><dt>Google</dt><dd>{l.linked}</dd></div>}</dl>
 {record?.details?.bio&&!editing&&<p className="ap-bio">{record.details.bio}</p>}</div></div>
 {editing&&<form onSubmit={save}><fieldset disabled={busy}><label>{t.name}<input required maxLength={100} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoComplete="name"/></label><label>{t.bio}<textarea rows={2} maxLength={1000} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></label><button type="submit">{busy?t.saving:t.save}</button></fieldset></form>}
 {error&&<p role="alert">{error}</p>}{!record&&error&&<button type="button" onClick={()=>{setError('');bump(n=>n+1);}}>{t.retry}</button>}{notice&&<p role="status">{notice}</p>}
 <nav className="ah-inline-links">{[['address','address'],['bank','bank'],['security','security']].map(([key,section])=><Link key={key} href={section==='security'?'/account/security':'/dashboard/profile?section='+section}>{key==='security'?(locale==='en-US'?'Login & security':'Đăng nhập & Bảo mật'):t[key]}</Link>)}</nav>
 </section>;
}
