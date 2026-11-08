'use client';
import {useEffect,useState} from 'react';
import {ShieldCheck,ArrowRight} from 'lucide-react';
import {Logo} from '@/components/brand/Logo';
import {useLocale} from '@/components/settings/LocaleProvider';
import './chat-control.css';
export function ChatControlLogin({reason='',isUat=false}){
 const {locale}=useLocale(),t=(vi,en)=>locale==='en-US'?en:vi,[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;fetch('/api/crm/session',{cache:'no-store'}).then(r=>{if(live&&r.ok)window.location.replace('/chat-control')}).catch(()=>{});return()=>{live=false}},[]);
 return <main className="cc-entry"><section className="cc-login"><Logo href="/chat-control" size={29}/><p><ShieldCheck size={16}/> Chat Control · {t('Quản lý nội bộ','Internal management')}</p><h1>{t('Một tài khoản CRM.','One CRM account.')}</h1><p>{t('Dùng tài khoản và xác thực hai bước của CRM. Nếu phiên CRM còn hiệu lực, bạn không cần nhập lại mật khẩu.','Use your CRM account and two-step verification. An active CRM session lets you continue without entering your password again.')}</p>{reason&&<p className="cc-error" role="alert">{reason==='permission'?t('Tài khoản chưa được cấp quyền Chat Control. Nhờ admin cấp quyền xem hội thoại hoặc quản lý bot.','This account has no Chat Control permission. Ask an admin for conversation or bot access.'):t('Phiên chuyển đăng nhập đã hết hạn. Hãy tiếp tục lại bằng CRM.','The sign-in handoff expired. Continue with CRM again.')}</p>}<button type="button" className="cc-primary cc-login-link" disabled={busy} onClick={()=>{setBusy(true);window.location.assign(new URL('/api/auth/sso/start',window.location.origin).href)}}>{t('Tiếp tục với CRM','Continue with CRM')}<ArrowRight size={18}/></button><p hidden={!isUat}>{t('UAT dùng tài khoản thử riêng. Phiên CRM production không tự chuyển sang môi trường thử nghiệm.','UAT uses separate test accounts. Production CRM sessions are not transferred into the test environment.')}</p><p>{t('Admin cấp quyền theo từng phân hệ; đăng nhập không tự cấp quyền quản lý.','Admins grant module-specific permissions; signing in does not grant management rights.')}</p></section></main>;
}
