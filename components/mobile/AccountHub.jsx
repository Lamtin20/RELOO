'use client';
import {useWarmConnection} from './useWarmConnection';
import {AccountProfileEditor} from '@/components/profile/AccountProfileEditor';
import {CookieSettingsButton} from '@/components/privacy/CookieConsent';
import {LanguageSettings} from '@/components/settings/LanguageSettings';
import {accountExperienceCopy} from '@/lib/i18n/account-experience';
import {MiniAppLink as Link} from '@/components/superapp/MiniAppLink';
import {User,Wallet,ChevronRight,Heart,ClipboardList,Package,ShieldCheck,Gift,HelpCircle,FileText,LogOut,Clock,Megaphone,Leaf,Bookmark,X,Settings,CalendarDays,MapPin,SlidersHorizontal,Languages,MessageCircle,Plus,ShoppingBag} from 'lucide-react';
import {useAuth,useReloo} from '@/lib/store';
import {useSavedListings} from '@/lib/hooks/useSavedListings';
import {useSavedOwners} from '@/lib/hooks/useSavedOwners';
import {useLocale} from '@/components/settings/LocaleProvider';
import {LanguageFlag} from '@/components/settings/LanguageSettings';
import {AccountCountsProvider,useAccountCounts} from '@/components/dashboard/AccountCounts';
import {accountCopy} from '@/lib/i18n/account';
import './account-hub.css';
import './account-inline.css';
const shortcuts=[['orders','/dashboard/orders',ClipboardList],['purchases','/dashboard/purchases',ShoppingBag],['assets','/dashboard/assets',Package],['saved','/explore?saved=1',Heart]];
const groups=[
 ['manage',[
  ['messages','/dashboard/messages',MessageCircle,null,'messages'],['address','/dashboard/profile?section=address',MapPin],['bank','/dashboard/profile?section=bank',Wallet],['calendar','/account/calendar',CalendarDays]
 ]],
 ['settings',[
  ['security','/account/security',Settings],['personalization','/account/personalization',SlidersHorizontal],['language','/dashboard/profile/language',Languages]
 ]],
 ['benefits',[
  ['offers','/dashboard/promotions',Gift],['cashback','/cashback',ShoppingBag]
 ]],
 ['support',[
  ['help','/help',HelpCircle],['safety','/safety',ShieldCheck],['guide','/cms/rental-guide',FileText],['terms','/cms/terms',FileText],['privacy','/cms/privacy',ShieldCheck]
 ]]
];
const publicKeys=new Set(['saved','post','cashback','help','safety','guide','terms','privacy']);
export function AccountHub(){return <AccountCountsProvider><AccountHubInner/></AccountCountsProvider>;}
function AccountHubInner(){
 const warmConnection=useWarmConnection();
 const {user,hydrated,isAuthenticated,logout}=useAuth(),{state}=useReloo(),{savedIds}=useSavedListings(),{savedIds:owners,toggleSaved}=useSavedOwners(),{locale}=useLocale(),{counts,loading,error,refresh}=useAccountCounts();
 const t=accountCopy[locale]||accountCopy['vi-VN'],at=accountExperienceCopy[locale]||accountExperienceCopy['vi-VN'];
 const href=(key,path)=>!isAuthenticated&&!publicKeys.has(key)?'/auth?next='+encodeURIComponent(path):path;
 const badge=(key)=>{if(!isAuthenticated)return null;const n=counts[key];if(loading||typeof n!=='number'||n<=0)return null;const label=`${n} ${t.pending}`;return <span className={'ah-count'+(n>0?' ah-count--pending':'')} aria-label={label} title={label}>{loading?'…':typeof n!=='number'?'—':n>999?'999+':n}</span>;};
 if(!hydrated)return <div className="account-hub ah-loading" role="status">{t.loading}</div>;
 if(!isAuthenticated)return <div className="account-hub ah-guest"><header className="ah-heading"><div><h1>{t.title}</h1></div></header><section className="ah-profile-card ah-guest-welcome"><span className="ah-guest-icon"><User size={30}/></span><h2>{t.hello}</h2><p>{at.guest}</p><div className="ah-auth"><Link href="/auth" prefetch={warmConnection}>{t.login}</Link><Link href="/auth/register" prefetch={warmConnection}>{t.register}</Link></div></section><section className="ah-group ah-guest-system"><h2>{at.system}</h2><div className="ah-rows"><details className="ah-system-language"><summary><Languages size={20}/><span>{t.language}</span><LanguageFlag locale={locale}/><ChevronRight size={17}/></summary><LanguageSettings publicMode/></details><CookieSettingsButton/></div></section><section className="ah-group ah-guest-support"><h2>{t.support}</h2><div className="ah-rows">{groups.find(g=>g[0]==='support')[1].map(([id,path,Icon])=><Link className="ah-row" key={id} href={path}><Icon size={20}/><span>{t[id]}</span><ChevronRight size={17}/></Link>)}</div></section></div>;

 return <div className="account-hub">
  <header className="ah-heading"><div><h1>{t.title}</h1></div><Link href={href('profile','/account/security')} aria-label={t.settings}><Settings size={21}/></Link></header>
  <div className="ah-member-layout ah-member-layout--compact"><div className="ah-member-content">
  <section id="account-overview"><AccountProfileEditor key={user.id}/></section>
  <section id="account-identity" className="ah-section-anchor"><Link className="ah-row ah-identity-link" href="/verify-identity"><ShieldCheck size={22}/><span><strong>{t.identity}</strong></span><ChevronRight size={18}/></Link></section>
  <nav className="ah-shortcuts" id="account-activity" aria-label={t.shortcuts}>{shortcuts.map(([key,path,Icon])=><Link key={key} href={href(key,path)}><span className="ah-shortcut-icon"><Icon size={23}/>{key==='saved'?(savedIds.length>0&&<span className="ah-count">{savedIds.length}</span>):badge(key)}</span><strong>{t[key]}</strong>{key!=='saved'&&isAuthenticated&&counts[key]>0&&<small>{t.pending}</small>}</Link>)}</nav>

  {error&&isAuthenticated&&<p className="ah-count-error" role="status">{t.countError} <button type="button" onClick={refresh}>{t.retry}</button></p>}
  <div className="ah-groups">{groups.map(([key,items])=><section className="ah-group" key={key} aria-labelledby={'ah-'+key}><h2 id={'ah-'+key}>{t[key]}</h2><div className="ah-rows">{items.map(([id,path,Icon,detail,count])=><Link className="ah-row" key={id} href={href(id,path)}><Icon size={21}/><span><strong>{t[id]||at[id]}</strong></span>{id==='language'&&<span className="ah-language"><LanguageFlag locale={locale}/></span>}{count&&badge(count)}<ChevronRight size={17}/></Link>)}</div></section>)}</div>
  {owners.length>0&&<section className="ah-group"><h2>{t.owners}</h2><div className="ah-rows">{owners.map(id=>{const owner=state.users.find(x=>x.id===id);return <div className="ah-owner" key={id}><Link href={'/user/'+encodeURIComponent(id)}><Bookmark size={20}/><span>{owner?.name||t.owner}</span></Link><button type="button" aria-label={`${t.remove}: ${owner?.name||t.owner}`} onClick={()=>toggleSaved(id)}><X size={18}/></button></div>;})}</div></section>}
  <details className="ah-more-tools"><summary>{locale==='en-US'?'Tools for owners':'Công cụ cho chủ đồ'}</summary><div className="ah-rows">{[['post','/lend',Plus],['finance','/dashboard/cashflow',Wallet],['audit','/dashboard/audit',Leaf],['ads','/dashboard/ads',Megaphone],['history','/explore?history=1',Clock]].map(([id,path,Icon])=><Link className="ah-row" key={id} href={href(id,path)}><Icon size={20}/><span><strong>{t[id]}</strong></span><ChevronRight size={17}/></Link>)}</div></details>
  {isAuthenticated&&<button className="ah-logout" type="button" onClick={logout}><LogOut size={20}/>{t.logout}</button>}
  </div></div>
 </div>;
}
