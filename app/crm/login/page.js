"use client";
import { Suspense, useEffect, useState,useCallback,useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, KeyRound, LoaderCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { crmNext } from "@/lib/operations/access";
import './login.css';
export default function CrmLoginPage(){return <Suspense fallback={<main className="crm-login-screen">Đang xác nhận phiên đăng nhập…</main>}><CrmLogin/></Suspense>;}
async function api(body){const r=await fetch('/api/crm/access',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error),{status:r.status,code:d.code});return d;}
function CrmLogin(){
  const params=useSearchParams(),next=crmNext(params.get('next'));
  const [access,setAccess]=useState(null),[loading,setLoading]=useState(true),[showLogin,setShowLogin]=useState(false),[busy,setBusy]=useState(false),[googleBusy,setGoogleBusy]=useState(false),[error,setError]=useState(''),[denied,setDenied]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[factor,setFactor]=useState(''),[enrollment,setEnrollment]=useState(null),[code,setCode]=useState('');
  const [centralIdentity,setCentralIdentity]=useState(false),[emailLogin,setEmailLogin]=useState(false),[googleLogin,setGoogleLogin]=useState(false),[capabilityError,setCapabilityError]=useState(false);
  const verifying=useRef(false);
  useEffect(()=>{const a=new AbortController();fetch('/api/auth/capabilities',{signal:a.signal}).then(r=>{if(!r.ok)throw Error('CAPABILITIES_UNAVAILABLE');return r.json();}).then(d=>{setCentralIdentity(d.centralIdentity===true);setEmailLogin(d.emailLogin===true);setGoogleLogin(d.google===true);setCapabilityError(d.available===false);}).catch(e=>{if(e.name!=='AbortError')setCapabilityError(true);});return ()=>a.abort();},[]);
  const load=useCallback(async()=>{setLoading(true);setError('');try{const d=await api();if(d.authorized){window.location.replace(next);return;}setAccess(d);setFactor(d.factors[0]?.id || '');setShowLogin(false);setDenied(false);}catch(e){if(e.status===401){setShowLogin(true);setDenied(false);}else{setError(e.message);setDenied(e.status===403 || e.status===410);}}finally{setLoading(false);}},[next]);
  useEffect(()=>{const t=setTimeout(()=>load(),0);return ()=>clearTimeout(t);},[load]);
  async function login(e){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const d=await r.json();if(!r.ok)throw Error(d.error);setPassword('');await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function enroll(){setBusy(true);setError('');try{const d=await api({action:'ENROLL'});setEnrollment(d);setFactor(d.factorId);}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function verifyCode(value){
    if(verifying.current||busy||!factor||!/^\d{6}$/.test(value))return;
    verifying.current=true;setBusy(true);setError('');
    try{await api({action:'VERIFY',factorId:factor,code:value});setCode('');setEnrollment(null);window.location.replace(next);}
    catch(e){setCode('');setError(e.message);verifying.current=false;setBusy(false);}
  }
  function verify(e){e.preventDefault();void verifyCode(code);}
  function changeCode(e){const value=e.target.value.replace(/\D/g,'').slice(0,6);setCode(value);if(value.length===6)void verifyCode(value);}
  const qr=enrollment?.qrCode ? 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(enrollment.qrCode.slice(enrollment.qrCode.indexOf(',')+1)) : '';
  return <main className="crm-login-screen crm-entry"><div className="crm-entry__shell"><aside className="crm-entry__aside"><div className="crm-entry__brand"><Logo crm href="https://reloo.vn" size={28}/><span>CRM</span></div><div className="crm-entry__aside-copy"><span className="crm-entry__eyebrow">KHÔNG GIAN LÀM VIỆC RELOO</span><h2>Quản lý công việc.<br/>Kết nối đội ngũ.</h2><p>Truy cập các công cụ quản lý khách hàng, nội dung và vận hành trong cùng một hệ thống.</p><ul><li><span>01</span><div><strong>Đăng nhập tài khoản</strong><p>Sử dụng tài khoản đã được cấp quyền.</p></div></li><li><span>02</span><div><strong>Xác thực hai bước</strong><p>Xác nhận bằng ứng dụng trên điện thoại.</p></div></li><li><span>03</span><div><strong>Bắt đầu công việc</strong><p>Các phân hệ hiển thị theo quyền của bạn.</p></div></li></ul></div><p className="crm-entry__aside-footer">Dành cho đội ngũ quản trị và nhân viên RELOO.</p></aside><section className="crm-login-card crm-entry__panel" aria-labelledby="crm-login-title">
    <div className="crm-entry__mobile-brand"><Logo crm href="https://reloo.vn" size={27}/><span>CRM</span></div><div className="crm-entry__form-head"><div className="crm-entry__status"><ShieldCheck size={16}/><span>Khu vực quản lý nội bộ</span></div>
    <h1 id="crm-login-title">{showLogin?'Đăng nhập CRM':denied?'Chưa có quyền truy cập':access?'Xác thực tài khoản':'Kiểm tra phiên đăng nhập'}</h1>
    <p className="crm-login-intro">{showLogin?'Sử dụng tài khoản đã được cấp quyền để tiếp tục.':denied?'Tài khoản hiện tại chưa được cấp quyền vào CRM. Vui lòng liên hệ người quản trị.':access?'Nhập mã 6 số từ Google Authenticator để tiếp tục vào hệ thống.':'Vui lòng đợi trong giây lát.'}</p></div>
    {!denied&&<ol className="crm-entry__progress" aria-label="Tiến trình đăng nhập"><li aria-current={showLogin?'step':undefined} className={access?'is-complete':''}><span>1</span>Đăng nhập</li><li aria-current={access?'step':undefined}><span>2</span>Xác thực</li></ol>}
    {loading?<p role="status"><LoaderCircle className="spin" size={18}/> Đang xác nhận phiên đăng nhập…</p>:<>
      {showLogin?<>{centralIdentity&&<a className="btn btn-primary" href={"/api/auth/federation/start?next="+encodeURIComponent(next)}>Tiếp tục với CRM</a>}{googleLogin&&<GoogleAuthButton next={'/crm/login?next='+encodeURIComponent(next)} disabled={busy} onError={setError} onBusyChange={setGoogleBusy}/>} {capabilityError&&<p role="alert">Chưa kết nối được dịch vụ đăng nhập. Vui lòng tải lại trang.</p>}{emailLogin&&<>{googleLogin&&<div className="auth-method-divider"><span>hoặc dùng email và mật khẩu</span></div>}
        <form onSubmit={login} className="crm-login-form"><label>Email<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><label htmlFor="crm-password">Mật khẩu</label><PasswordInput id="crm-password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} maxLength={128}/><button className="btn btn-primary" disabled={busy||googleBusy}>{busy&&<LoaderCircle className="spin" size={18}/>} Đăng nhập</button></form></>}</>:
      access&&!denied?<><p className="crm-login-user">{access.user.name} · {access.user.email}</p>
        {!access.factors.length&&!enrollment?<div className="crm-mfa-setup"><KeyRound size={28}/><h2>Thiết lập Google Authenticator</h2><p>Mở ứng dụng Google Authenticator trên điện thoại, quét mã QR được tạo ở bước tiếp theo và nhập mã xác nhận.</p><button className="btn btn-primary" type="button" onClick={enroll} disabled={busy}>Tạo mã thiết lập</button></div>:<>
          {enrollment&&<div className="crm-mfa-setup"><h2>Quét mã bằng Google Authenticator</h2><img className="crm-mfa-qr" src={qr} alt="Mã thiết lập Google Authenticator cho tài khoản của bạn"/><details><summary>Nhập mã thiết lập thủ công</summary><code>{enrollment.secret}</code></details><p>Lưu tài khoản vào ứng dụng trước khi nhập mã 6 số bên dưới.</p></div>}
          <form onSubmit={verify} className="crm-login-form">{access.factors.length>1&&<label>Ứng dụng xác thực<select value={factor} onChange={e=>setFactor(e.target.value)}>{access.factors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
          <label>Mã Google Authenticator<input className="crm-mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} minLength={6} required readOnly={busy} aria-describedby="crm-code-status" value={code} onChange={changeCode} placeholder="000000"/></label><p id="crm-code-status" role="status" style={{fontSize:12,margin:0,color:'#617b6d'}}>{busy?'Đang xác thực…':'Mã sẽ được xác thực tự động khi bạn nhập đủ 6 số.'}</p><button className="btn btn-primary" disabled={busy||code.length!==6}>{busy?<LoaderCircle className="spin" size={18}/>:<ShieldCheck size={18}/>} {busy?'Đang xác thực…':'Xác nhận & vào CRM'}</button></form></>}
      </>:<button className="btn btn-secondary" type="button" onClick={()=>{setDenied(false);setShowLogin(true);setError('');}}>Đăng nhập tài khoản khác</button>}
    </>}
    {error&&<p className="ops-error" role="alert">{error}</p>}
    <div className="crm-entry__support"><p>Chưa được cấp quyền? Liên hệ quản trị viên của bạn.</p><a href="https://reloo.vn">Về website RELOO</a></div>
  </section></div></main>;
}
