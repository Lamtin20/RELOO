'use client';
import {useState,useSyncExternalStore} from 'react';
import {Fingerprint,LoaderCircle} from 'lucide-react';
import {isNative,startNativeLogin} from '@/lib/mobile/client';
import './passkey-login.css';
export async function passkeyRequest(body){const r=await fetch('/api/auth/passkeys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok){const e=Error(d.error||'Chưa xác thực được thiết bị.');e.code=d.code;throw e;}return d;}
export function PasskeyLoginButton({onSuccess,onError,next='/account',intent,disabled=false}){
 const supported=useSyncExternalStore(()=>()=>{},()=>isNative()||!!window.PublicKeyCredential,()=>false),[busy,setBusy]=useState(false);
 if(!supported)return null;
 async function login(){setBusy(true);try{if(isNative()){await startNativeLogin(next,intent,'passkey');return;}const data=await passkeyRequest({action:'LOGIN_OPTIONS'}),{startAuthentication}=await import('@simplewebauthn/browser'),credential=await startAuthentication({optionsJSON:data.options});await passkeyRequest({action:'LOGIN_VERIFY',challengeId:data.challenge_id,credential});await onSuccess?.();}catch(e){onError?.(e.name==='NotAllowedError'?'Bạn đã hủy hoặc thiết bị chưa có khóa truy cập RELOO.':e.message);}finally{setBusy(false);}}
 return <button type="button" className="btn btn-secondary passkey-login-button" disabled={busy||disabled} onClick={login}>{busy?<LoaderCircle className="spin" size={19}/>:<Fingerprint size={20}/>}Face ID / Vân tay</button>;
}
