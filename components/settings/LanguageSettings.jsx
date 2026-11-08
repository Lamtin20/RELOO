'use client';
import {accountExperienceCopy} from '@/lib/i18n/account-experience';
import {useState} from 'react';
import Link from 'next/link';
import {useLocale} from './LocaleProvider';
import {languageText} from '@/lib/i18n/locale';
import './language-settings.css';
function star(cx,cy,r){return Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.4:r;return [cx+Math.cos(a)*rr,cy+Math.sin(a)*rr].join(',')}).join(' ')}
export function LanguageFlag({locale}){return locale==='vi-VN'?<svg viewBox="0 0 30 20" aria-hidden="true"><path fill="#da251d" d="M0 0h30v20H0z"/><polygon points={star(15,10,6)} fill="#ffdf00"/></svg>:<svg viewBox="0 0 38 20" aria-hidden="true"><path fill="#fff" d="M0 0h38v20H0z"/>{Array.from({length:7},(_,i)=><path key={i} fill="#b22234" d={`M0 ${i*40/13}h38v${20/13}H0z`}/>)}<path fill="#3c3b6e" d="M0 0h15.2v10.77H0z"/>{Array.from({length:9},(_,row)=>Array.from({length:row%2?5:6},(_,col)=><polygon key={row+'-'+col} fill="#fff" points={star((col*2+1+(row%2))*15.2/12,(row+1)*10.77/10,.48)}/>))}</svg>}
export function LanguageSettings({publicMode=false}){
 const {locale,save}=useLocale(),Heading=publicMode?'h2':'h1',at=accountExperienceCopy[locale]||accountExperienceCopy['vi-VN'],t=k=>languageText(locale,k),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');try{await save(draft||locale);setDraft(null);setMessage('saved');}catch{setMessage('error');}finally{setBusy(false);}}
 return <section className="language-settings">{!publicMode&&<Link href="/dashboard/profile">{t('account')}</Link>}<Heading>{t('title')}</Heading><form onSubmit={submit}><fieldset disabled={busy}><legend>{t('choose')}</legend><div className="language-options">{[['vi-VN','vietnamese'],['en-US','english']].map(([value,key])=><label key={value} className={(draft||locale)===value?'is-selected':''}><LanguageFlag locale={value}/><span><strong>{t(key)}</strong><small>{value}</small></span><input type="radio" name="display-language" value={value} checked={(draft||locale)===value} onChange={()=>{setDraft(value);setMessage('')}}/></label>)}</div><button type="submit" disabled={busy}>{t(busy?'saving':'save')}</button></fieldset></form>{message&&<p role={message==='error'?'alert':'status'}>{t(message)}</p>}</section>;
}
