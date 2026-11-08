'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Fingerprint} from 'lucide-react';
import {CodeInput} from '@/components/auth/CodeInput';
async function confirm(body){const r=await fetch('/api/security/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw Error(d.error||'Chưa xác nhận được.');return d;}
export function DeviceConfirmation({onVerified,autoPrompt=true}){
 const [data,setData]=useState(null),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),automatic=useRef(false);
 const verified=useRef(onVerified);useEffect(()=>{verified.current=onVerified;},[onVerified]);
 async function biometric(){setBusy(true);setError('');try{const d=await confirm({action:'PASSKEY_OPTIONS'}),{startAuthentication}=await import('@simplewebauthn/browser'),credential=await startAuthentication({optionsJSON:d.options});await confirm({action:'PASSKEY_VERIFY',challengeId:d.challenge_id,credential});verified.current?.();}catch(e){setError(e.name==='NotAllowedError'?'Bạn có thể nhập PIN 6 số bên dưới để tiếp tục.':e.message);}finally{setBusy(false);}}
 useEffect(()=>{let active=true;fetch('/api/security/confirm',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(!active)return;setData(d);if(autoPrompt&&d?.hasPasskey&&window.PublicKeyCredential&&!automatic.current){automatic.current=true;void biometric();}}).catch(()=>{});return()=>{active=false;};},[autoPrompt]);
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{await confirm({action:'PIN_VERIFY',pin});setPin('');verified.current?.();}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(!data)return null;
 return <section className="device-confirmation"><h3>Xác nhận thao tác</h3><p>Dùng Face ID, vân tay hoặc cách mở khóa thiết bị đã thiết lập. Bạn cũng có thể dùng PIN giao dịch 6 số.</p>{error&&<p role="alert" className="ops-error">{error}</p>}{data.hasPasskey&&<button type="button" className="btn btn-secondary" disabled={busy} onClick={biometric}><Fingerprint size={20}/>Xác nhận bằng thiết bị</button>}{data.hasPin?<div role="group" aria-label="Xác nhận bằng PIN" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(pin.length===6&&!busy)void submit(e);}}}><CodeInput label="PIN giao dịch" value={pin} onChange={setPin} mask autoComplete="off"/><button type="button" onClick={submit} className="btn btn-primary" disabled={busy||pin.length!==6}>{busy?'Đang xác nhận…':'Xác nhận bằng PIN'}</button></div>:<Link href="/account/security">Tạo PIN hoặc bật sinh trắc học trong Bảo mật</Link>}</section>;
}
