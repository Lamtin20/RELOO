"use client";
import {IdCard,ShieldCheck} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {identityFlow} from '@/lib/i18n/identity-flow';
export function IdentityQrCard({fields,full=false,local=false}){
 const {locale}=useLocale(),t=identityFlow[locale]||identityFlow['vi-VN'];
 const date=v=>{const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())?d.toLocaleDateString(locale,{timeZone:'UTC'}):t.unknown;};
 const rows=full?[[t.nationalId,fields.nationalId],[t.oldId,fields.oldId||t.missing],[t.name,fields.name],[t.birthDate,date(fields.birthDate)],[t.gender,locale==='en-US'?(fields.gender==='Nam'?'Male':fields.gender==='Nữ'?'Female':fields.gender):fields.gender],[t.residence,fields.residence],[t.issueDate,date(fields.issueDate)]]:[[t.nationalId,fields.nationalId],[t.expiry,date(fields.expiryDate)]];
 return <article className="identity-qr-card"><header><IdCard size={26}/><div><h2>{full?t.qrTitle:t.recordTitle}</h2><span className="identity-state-pill">{t.unverified}</span></div></header><dl>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||t.unknown}</dd></div>)}</dl><p><ShieldCheck size={16}/>{local?t.local:t.reviewTime}</p></article>;
}
