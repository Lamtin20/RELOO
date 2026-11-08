'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {Bell,CheckCheck,ChevronRight,Settings2,X} from 'lucide-react';
import {useAuth,useNotifications} from '@/lib/store';
import {useLocale} from '@/components/settings/LocaleProvider';
import {getNotificationMeta,resolveNotificationLink} from '@/lib/notifications';
import './notification-center.css';
const Center=createContext({open:()=>{}});
export const useNotificationCenter=()=>useContext(Center);
export const notificationCopy={
 'vi-VN':{title:'Thông báo',intro:'Mọi cập nhật của bạn, cùng một nơi.',all:'Tất cả',unread:'Chưa đọc',orders:'Giao dịch',news:'Tin tức',readAll:'Đọc tất cả',empty:'Bạn đã xem hết thông báo',emptyBody:'Cập nhật đơn hàng, tin nhắn và tài khoản sẽ xuất hiện tại đây.',close:'Đóng thông báo',settings:'Cài đặt thông báo',login:'Đăng nhập để xem thông báo',loginBody:'Thông báo được lưu riêng cho tài khoản của bạn.',signIn:'Đăng nhập',loading:'Đang tải thông báo…',retry:'Thử lại',unknown:'Không có thời gian',more:'Mở cập nhật'},
 'en-US':{title:'Notifications',intro:'All your updates, in one place.',all:'All',unread:'Unread',orders:'Transactions',news:'News',readAll:'Mark all read',empty:'You’re all caught up',emptyBody:'Order, message and account updates will appear here.',close:'Close notifications',settings:'Notification settings',login:'Sign in to view notifications',loginBody:'Notifications are private to your account.',signIn:'Sign in',loading:'Loading notifications…',retry:'Retry',unknown:'Time unavailable',more:'Open update'},
};
export function NotificationBell({className='',children}){
 const {open}=useContext(Center),{unreadCount}=useNotifications(),{locale}=useLocale(),t=notificationCopy[locale]||notificationCopy['vi-VN'];
 return <button type="button" className={className} onClick={open} aria-label={t.title} aria-haspopup="dialog">{children||<Bell size={22}/>} {unreadCount>0&&<span className="nc-bell-count">{unreadCount>99?'99+':unreadCount}</span>}</button>;
}
export function NotificationCenterProvider({children}){
 const dialog=useRef(null),lastActor=useRef(null),[shown,setShown]=useState(false),[filter,setFilter]=useState('all');
 const {user,hydrated}=useAuth(),{notifications,error,loading,refresh,markNotificationRead,markAllNotificationsRead}=useNotifications();
 const {locale}=useLocale(),t=notificationCopy[locale]||notificationCopy['vi-VN'],router=useRouter(),path=usePathname();
 const open=useCallback(()=>{setFilter('all');setShown(true);dialog.current?.showModal();},[]);
 const close=useCallback(()=>{dialog.current?.close();setShown(false);},[]);
 useEffect(()=>{if(!hydrated)return;const timer=setTimeout(()=>{const url=new URL(location.href);if(url.searchParams.get('notifications')==='1'){open();url.searchParams.delete('notifications');history.replaceState(null,'',url.pathname+url.search+url.hash);}},0);return()=>clearTimeout(timer);},[path,open,hydrated]);
 useEffect(()=>{if(!shown)return;const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=before;};},[shown]);
 useEffect(()=>{if(lastActor.current&&lastActor.current!==user?.id)dialog.current?.close();lastActor.current=user?.id;},[user?.id]);
 const visible=useMemo(()=>notifications.filter(n=>filter==='unread'?!n.read:filter==='orders'?getNotificationMeta(n.type).filter==='transaction':filter==='news'?getNotificationMeta(n.type).tab==='news':true),[notifications,filter]);
 const unread=notifications.filter(n=>!n.read).length;
 function visit(item){if(!item.read)markNotificationRead(item.id);const href=resolveNotificationLink(item.link);if(href){close();router.push(href);}}
 return <Center.Provider value={{open}}>{children}<dialog ref={dialog} className="nc-dialog" aria-labelledby="nc-title" onClose={()=>setShown(false)} onClick={event=>{if(event.target===event.currentTarget)close();}}>
  <header className="nc-head"><div className="nc-symbol"><Bell size={23}/></div><div><h2 id="nc-title">{t.title}{user&&unread>0&&<span>{unread}</span>}</h2><p>{t.intro}</p></div><button className="nc-icon" type="button" aria-label={t.close} onClick={close}><X size={22}/></button></header>
  {user?<><div className="nc-tools"><div className="nc-filters" aria-label={t.title}>{['all','unread','orders','news'].map(id=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)}>{t[id]}{id==='unread'&&<b>{unread}</b>}</button>)}</div><button className="nc-mark" type="button" disabled={!unread} onClick={()=>markAllNotificationsRead(user.id)}><CheckCheck size={16}/>{t.readAll}</button></div>
  <div className="nc-list" aria-live="polite">{error?<div role="alert" className="nc-error">{error}<button type="button" onClick={()=>refresh()}>{t.retry}</button></div>:!hydrated||loading?<p className="nc-loading">{t.loading}</p>:!visible.length?<div className="nc-empty"><Bell size={32}/><h3>{t.empty}</h3><p>{t.emptyBody}</p></div>:visible.map(item=>{const meta=getNotificationMeta(item.type),Icon=meta.Icon;const date=new Date(item.createdAt);return <button key={item.id} type="button" className={'nc-row'+(!item.read?' is-unread':'')} onClick={()=>visit(item)}><span className={'nc-row-icon nc-row-icon--'+meta.tone}><Icon size={20}/></span><span className="nc-row-content"><strong>{item.title}</strong><span>{item.message}</span><time dateTime={Number.isNaN(date.getTime())?undefined:date.toISOString()}>{Number.isNaN(date.getTime())?t.unknown:new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(date)}</time></span>{!item.read&&<i aria-label={t.unread}/>}<ChevronRight size={16}/></button>;})}</div>
  <footer className="nc-footer"><Link href="/dashboard/security" onClick={close}><Settings2 size={16}/>{t.settings}</Link></footer></>:<div className="nc-empty"><Bell size={32}/><h3>{t.login}</h3><p>{t.loginBody}</p><Link className="btn btn-primary" href={'/auth?next='+encodeURIComponent((path||'/')+'?notifications=1')} onClick={close}>{t.signIn}</Link></div>}
 </dialog></Center.Provider>;
}
