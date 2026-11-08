'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ChevronRight,Fingerprint,KeyRound,LockKeyhole,Mail,ShieldCheck,X} from 'lucide-react';
import {useAuth} from '@/lib/store';
import {CodeInput} from '@/components/auth/CodeInput';
import {PasswordInput} from '@/components/auth/PasswordInput';
import {PasswordRequirements} from '@/components/auth/PasswordRequirements';
import {validatePassword} from '@/lib/password-policy';
import {validatePin} from '@/lib/security/pin-policy';
import {GoogleAuthButton} from '@/components/auth/GoogleAuthButton';
import {passkeyRequest} from '@/components/auth/PasskeyLoginButton';
import {isNative,startNativeLogin} from '@/lib/mobile/client';
import {SmartKeyPanel} from './SmartKeyPanel';
import {NotificationPreferences} from './NotificationPreferences';
import './login-security.css';
const titles={PIN_SET:'Tạo mã PIN',PIN_CHANGE:'Đổi mã PIN',PASSWORD_SET:'Đặt mật khẩu',PASSWORD_CHANGE:'Đổi mật khẩu',PASSKEY_ENROLL:'Bật Face ID / Vân tay',PASSKEY_REMOVE:'Gỡ khóa truy cập'};
async function api(path,body){const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'}),d=await r.json();if(!r.ok){const error=Error(d.error||'Chưa xử lý được yêu cầu.');error.code=d.code;throw error;}return d;}
export function LoginSecurityPanel(props){const {user,hydrated}=useAuth();return <LoginSecuritySession key={user?.id||'guest'} {...props} user={user} hydrated={hydrated}/>;}
function LoginSecuritySession({passkeyOnly=false,onEnrolled,user,hydrated}){
 const profileId=user?.id,[data,setData]=useState(null),[action,setAction]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){const d=await api('/api/security/account');setData(d);}
 useEffect(()=>{if(!profileId)return;let active=true;api('/api/security/account').then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[profileId]);
 if(!hydrated)return <p role="status">Đang tải bảo mật…</p>;
 if(!user)return <div className="login-security"><h1>Đăng nhập & Bảo mật</h1><Link className="btn btn-primary" href="/auth?next=%2Faccount%2Fsecurity">Đăng nhập</Link></div>;
 const row=(Icon,title,detail,button,operation)=><button type="button" className="security-setting-row" disabled={!data} onClick={()=>{setAction({type:operation});setError('');setNotice('');}}><span className="security-setting-icon"><Icon size={23}/></span><span><strong>{title}</strong><small>{detail}</small></span><span className="security-setting-action">{button}<ChevronRight size={17}/></span></button>;
 return <section className="login-security">
 {!passkeyOnly&&<header><Link href="/account" aria-label="Về Cá nhân"><ArrowLeft size={21}/></Link><div><h1>Đăng nhập & Bảo mật</h1><p>Quản lý cách đăng nhập và xác nhận của bạn.</p></div></header>}
 {error&&<p className="security-error" role="alert">{error} <button onClick={()=>load().catch(e=>setError(e.message))}>Thử lại</button></p>}{notice&&<p role="status" className="security-notice">{notice}</p>}
 {!data&&!error&&<p role="status">Đang tải cài đặt…</p>}
 <div className="security-settings">
 {!passkeyOnly&&row(LockKeyhole,'PIN giao dịch','PIN 6 số, riêng với mật khẩu đăng nhập.',data?.hasPin?'Đổi mã PIN':'Tạo mã PIN',data?.hasPin?'PIN_CHANGE':'PIN_SET')}
 {row(Fingerprint,'Face ID / Vân tay',data?.passkeys.length?'Đã bật xác nhận thao tác bằng thiết bị.':'Tùy chọn xác nhận giao dịch, không bắt buộc khi đăng nhập.','Thiết lập','PASSKEY_ENROLL')}
 {!passkeyOnly&&row(KeyRound,'Mật khẩu','Ít nhất 8 ký tự, chữ hoa, số và ký tự đặc biệt.',data?.hasPassword?'Đổi mật khẩu':'Đặt mật khẩu',data?.hasPassword?'PASSWORD_CHANGE':'PASSWORD_SET')}
 </div>
 {data?.passkeys.length>0&&<section className="security-passkeys"><h2>Khóa truy cập đã lưu</h2>{data.passkeys.map(key=><div key={key.id}><Fingerprint size={20}/><span>{key.friendly_name||'Khóa truy cập thiết bị'}</span><button onClick={()=>setAction({type:'PASSKEY_REMOVE',id:key.id})}>Gỡ</button></div>)}</section>}
 {!passkeyOnly&&<details className="security-extra"><summary>Xác thực giao dịch nâng cao & thông báo</summary><SmartKeyPanel autoPrompt={false}/><NotificationPreferences/><Link href="/dashboard/profile?section=security">Quản lý và xóa tài khoản</Link></details>}
 {action&&<CredentialDialog key={action.type+(action.id||'')} action={action} data={data} onClose={()=>setAction(null)} onDone={async()=>{setAction(null);setNotice('Đã cập nhật bảo mật tài khoản.');await load();if(action.type==='PASSKEY_ENROLL')onEnrolled?.();}}/>}
 </section>;
}
function CredentialDialog({action,data,onClose,onDone}){
 const panel=useRef(null),[form,setForm]=useState({pin:'',confirmPin:'',oldPin:'',password:'',confirmPassword:'',currentPassword:''}),[otp,setOtp]=useState(null),[otpVerified,setOtpVerified]=useState(false),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[needsAuth,setNeedsAuth]=useState(false),[smart,setSmart]=useState(false),[wait,setWait]=useState(0);
 useEffect(()=>{const before=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';panel.current?.focus();return()=>{document.body.style.overflow=overflow;before?.focus();};},[]);
 useEffect(()=>{if(!wait)return;const timer=setTimeout(()=>setWait(n=>n-1),1000);return()=>clearTimeout(timer);},[wait]);
 function update(key,value){setForm(f=>({...f,[key]:value}));setError('');}
 async function sendOtp(){if(action.type.startsWith('PIN_')&&(!validatePin(form.pin)||form.pin!==form.confirmPin)){setError('Nhập đủ 6 số PIN và xác nhận trùng khớp trước khi nhận mã.');return;}if(action.type.startsWith('PASSWORD_')&&(validatePassword(form.password)||form.password!==form.confirmPassword)){setError('Mật khẩu cần đúng quy tắc và nhập lại trùng khớp.');return;}setBusy(true);setError('');try{const d=await api('/api/security/account/otp',{action:'SEND',purpose:action.type});setOtp(d);setOtpVerified(false);setCode('');setWait(60);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function commit(otpId){const body={...form,otpId};if(action.type==='PASSKEY_ENROLL'){
   if(isNative()){await startNativeLogin('/account/security',null,'passkey-enroll');onClose();return;}
   if(!window.PublicKeyCredential)throw Error('Trình duyệt này chưa hỗ trợ khóa truy cập. Hãy dùng mật khẩu hoặc Google.');
   const d=await passkeyRequest({action:'ENROLL_OPTIONS',...body}),{startRegistration}=await import('@simplewebauthn/browser'),credential=await startRegistration({optionsJSON:d.options});await passkeyRequest({action:'ENROLL_VERIFY',challengeId:d.challenge_id,credential});
  }else if(action.type==='PASSKEY_REMOVE')await passkeyRequest({action:'REMOVE',id:action.id,...body});
  else await api('/api/security/account',{action:action.type,...body});
  await onDone();
 }
 async function submit(event){event.preventDefault();if(busy)return;setBusy(true);setError('');try{let id;if(otp){if(!otpVerified){await api('/api/security/account/otp',{action:'VERIFY',id:otp.id,code});setOtpVerified(true);}id=otp.id;}await commit(id);}catch(e){setError(e.name==='NotAllowedError'?'Thiết bị đã hủy xác thực. Bạn có thể thử lại.':e.message);if(e.code==='SECURITY_REAUTH_REQUIRED')setNeedsAuth(true);if(e.code==='SMART_KEY_REQUIRED')setSmart(true);}finally{setBusy(false);}}
 function keyDown(e){if(e.key==='Escape'&&!busy)onClose();if(e.key==='Tab'){const nodes=[...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}
 const pin=action.type.startsWith('PIN_'),password=action.type.startsWith('PASSWORD_');
 return <div className="credential-overlay" onKeyDown={keyDown}><section className="credential-dialog" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="credential-title"><header><h2 id="credential-title">{titles[action.type]}</h2><button type="button" aria-label="Đóng" disabled={busy} onClick={onClose}><X size={21}/></button></header>
 {otp?<div className="security-otp-heading"><Mail size={34}/><h3>Nhập mã xác thực</h3><p>Mã đã gửi đến <strong>{otp.email}</strong>.<br/>Hiệu lực 5 phút. Nếu thiết bị gợi ý mã, chạm để điền; bạn cũng có thể dán đủ 6 số.</p></div>:pin?<p>Chọn PIN 6 số. Tránh dãy số lặp hoặc liên tiếp.</p>:action.type==='PASSKEY_ENROLL'?<p>Thiết bị sẽ yêu cầu Face ID, vân tay hoặc phương thức mở khóa được hệ điều hành hỗ trợ.</p>:null}
 <form onSubmit={submit}><fieldset disabled={busy}>
 {otp?<CodeInput value={code} onChange={setCode} autoFocus/>:<>
 {pin&&<>{action.type==='PIN_CHANGE'&&<CodeInput label="PIN hiện tại" value={form.oldPin} onChange={v=>update('oldPin',v)} mask autoComplete="off"/>}<CodeInput label="PIN mới" value={form.pin} onChange={v=>update('pin',v)} mask autoComplete="off"/><CodeInput label="Nhập lại PIN mới" value={form.confirmPin} onChange={v=>update('confirmPin',v)} mask autoComplete="off"/></>}
 {password&&<><label>Mật khẩu mới<PasswordInput required value={form.password} onChange={e=>update('password',e.target.value)} autoComplete="new-password" maxLength={128}/></label><PasswordRequirements value={form.password}/><label>Nhập lại mật khẩu mới<PasswordInput required value={form.confirmPassword} onChange={e=>update('confirmPassword',e.target.value)} autoComplete="new-password" maxLength={128}/></label></>}
 {data.hasPassword&&<label>Mật khẩu hiện tại<PasswordInput value={form.currentPassword} onChange={e=>update('currentPassword',e.target.value)} autoComplete="current-password" required={action.type==='PASSWORD_CHANGE'}/></label>}
 </>}
 {error&&<p role="alert" className="security-error">{error}</p>}
 <button type="submit" className="btn btn-primary" disabled={busy||otp&&code.length!==6}>{busy?'Đang xác thực…':otp?'Xác nhận':'Tiếp tục'}</button>
 {otp&&<button type="button" className="security-link" onClick={sendOtp} disabled={wait>0||busy}>{wait?'Gửi lại sau '+wait+' giây':'Gửi lại mã'}</button>}
 {!otp&&action.type!=='PASSWORD_CHANGE'&&data.emailAvailable&&data.otpAvailable!==false&&<button type="button" className="security-link" disabled={busy} onClick={sendOtp}>Xác nhận bằng mã OTP email</button>}
 {otp&&<button type="button" className="security-link" onClick={()=>{setOtp(null);setCode('');setError('');}}>Quay lại</button>}
 </fieldset></form>
 {!otp&&data.otpAvailable===false&&<p className="security-otp-unavailable">OTP email hiện chưa sẵn sàng. Bạn có thể nhập mật khẩu hiện tại hoặc đăng nhập Google lại để xác nhận.</p>}
 {needsAuth&&!otp&&<GoogleAuthButton next="/account/security" onError={setError}/>}{smart&&<SmartKeyPanel onVerified={()=>setSmart(false)}/>}
 </section></div>;
}
