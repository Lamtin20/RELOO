'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Menu,ChevronDown,LogOut,UserCog} from 'lucide-react';
import {useAuth} from '@/lib/store';
import {useLocale} from '@/components/settings/LocaleProvider';
import {uiText} from '@/lib/i18n/ui';
import {PageBackButton} from '@/components/navigation/PageBackButton';
import {NotificationBell} from '@/components/notifications/NotificationCenter';
export function AdminTopbar({onMenuClick,menuExpanded=false}){
 const pathname=usePathname(),{user,logout}=useAuth(),{locale}=useLocale(),t=v=>uiText(locale,v);
 const [menuOpen,setMenuOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),wrapper=useRef(null),trigger=useRef(null);
 useEffect(()=>{if(!menuOpen)return;const close=e=>{if(!wrapper.current?.contains(e.target))setMenuOpen(false)},key=e=>{if(e.key==='Escape'){setMenuOpen(false);trigger.current?.focus()}};document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key)}},[menuOpen]);
 const initials=(user?.name||'?').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();
 async function signOut(){if(busy)return;setBusy(true);setError('');try{await logout();setMenuOpen(false)}catch{setError(t('Chưa đăng xuất được. Vui lòng thử lại.'))}finally{setBusy(false)}}
 return <header className="admin-topbar">
  {pathname!=='/admin'&&<PageBackButton variant="topbar" fallback="/admin" showLabel={false} className="admin-topbar__back"/>}
  <button type="button" className="btn btn-ghost btn-icon" onClick={onMenuClick} aria-label={t('Mở menu')} aria-expanded={menuExpanded} aria-controls="reloo-admin-sidebar" style={{display:'none'}} id="admin-mobile-menu-btn"><Menu size={20}/></button>
  <span className="admin-topbar-title">{t('Quản trị RELOO')}</span><div className="admin-topbar-spacer"/>
  <NotificationBell className="btn btn-ghost btn-icon"/>
  <div ref={wrapper} style={{position:'relative'}}><button ref={trigger} type="button" className="admin-user-chip" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}><span className="avatar" style={{width:30,height:30,fontSize:12}}>{initials}</span><span>{user?.name||t('Tài khoản')}</span><ChevronDown size={14}/></button>
   {menuOpen&&<div className="admin-user-menu"><Link href="/dashboard/profile" onClick={()=>setMenuOpen(false)}><UserCog size={17}/>{t('Cài đặt tài khoản')}</Link><button type="button" disabled={busy} onClick={signOut}><LogOut size={17}/>{t(busy?'Đang đăng xuất…':'Đăng xuất')}</button>{error&&<p role="alert">{error}</p>}</div>}
  </div>
 </header>;
}
