'use client';
import {usePathname,useSearchParams,useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft,Search,ClipboardList,Plus,Building2,BriefcaseBusiness} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {miniAppContext,miniAppTabs,miniAppHref,safeMiniAppReturn} from '@/lib/product/mini-app-navigation';
import {miniApp} from '@/lib/product/modules';
import './mini-app.css';
import {useNativeApp} from '@/lib/mobile/useNativeApp';
import {useMiniAppScroll} from './useMiniAppScroll';
export function MiniAppNavigation({children}){
 const path=usePathname(),params=useSearchParams(),router=useRouter(),{locale}=useLocale(),en=locale==='en-US';
 const native=useNativeApp();
 const id=miniAppContext(path,params.toString());
 useMiniAppScroll(path+'?'+params,!!id&&['/explore','/dat-phong','/viec-lam'].includes(path));
 if(!id)return children;
 const back=safeMiniAppReturn(params.get('returnTo'),id)||safeMiniAppReturn(path+'?'+params,id)||appHome(id),app=miniApp(id),tabs=miniAppTabs(id,en),active=path.startsWith('/account')?'account':path.startsWith('/lend')||path.includes('/assets/new')?'post':path.startsWith('/dashboard/orders')||path.startsWith('/dashboard/purchases')?'orders':id==='stays'?(path!=='/dat-phong'?'manage':params.get('tab')==='orders'?'orders':'home'):id==='jobs'?(params.get('role')==='employer'?'manage':'home'):'home';
 function navigate(event){const a=event.target.closest?.('a[href]');if(!a||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||a.target||a.hasAttribute('download'))return;const href=a.getAttribute('href');if(!href||href.startsWith('#'))return;const next=miniAppHref(href,id,back);if(next!==href){event.preventDefault();router.push(next);}}
 const icons={home:Search,orders:ClipboardList,post:Plus,manage:id==='jobs'?BriefcaseBusiness:Building2};
 return <div className={'mini-world mini-world--'+id+(native?' mini-world--native':'')} onClickCapture={navigate}>
  <header className="mini-world-header"><Link href="/" className="mini-world-exit"><ArrowLeft size={18}/>RELOO</Link><div><span>{en?'RELOO services':'Dịch vụ RELOO'}</span><strong>{app.label[locale]||app.label['vi-VN']}</strong></div><Link href={miniAppHref('/account',id,back)} className="mini-world-account">{en?'Account':'Tài khoản'}</Link></header>
  {!['/explore','/dat-phong','/viec-lam'].includes(path)&&<Link className="mini-world-return" href={back}><ArrowLeft size={16}/>{en?'Back to discovery':'Về trang khám phá'}</Link>}
  <div className="mini-world-content">{children}</div>
  <nav className="mini-world-nav" aria-label={en?app.label['en-US']+' navigation':'Điều hướng '+app.label['vi-VN']}>{tabs.map(([href,label,key])=>{const Icon=icons[key];return <Link key={key} href={key==='home'&&id!=='jobs'?back:miniAppHref(href,id,back)} aria-current={active===key?'page':undefined}><Icon size={21}/><span>{label}</span></Link>})}</nav>
 </div>;
}
function appHome(id){return miniApp(id)?.href||'/'}
