'use client';
import {useEffect,useId,useRef,useState} from 'react';
import './code-input.css';
export function normalizeCode(value){const text=String(value||'').trim(),matches=text.match(/(?<!\d)\d{6}(?!\d)/g);if(matches?.length===1)return matches[0];return text.replace(/\D/g,'').slice(0,6);}
export function CodeInput({value,onChange,label='Mã xác thực 6 số',disabled=false,mask=false,autoFocus=false,autoComplete='one-time-code',channel,id:providedId}){
 const generated=useId(),id=providedId||generated,ref=useRef(null),[focused,setFocused]=useState(false);
 useEffect(()=>{if(channel!=='sms'||!('OTPCredential' in window)||!navigator.credentials)return;const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),60000);navigator.credentials.get({otp:{transport:['sms']},signal:abort.signal}).then(result=>{if(result?.code)onChange(normalizeCode(result.code));}).catch(()=>{});return()=>{clearTimeout(timeout);abort.abort();};},[channel,onChange]);
 return <div className="code-field"><label htmlFor={id}>{label}</label><div className={'code-input'+(focused?' is-focused':'')}>
 <input id={id} ref={ref} value={value} onChange={e=>onChange(normalizeCode(e.target.value))} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onPaste={e=>{e.preventDefault();onChange(normalizeCode(e.clipboardData.getData('text')));}} type={mask?'password':'text'} inputMode="numeric" autoComplete={autoComplete} maxLength={6} pattern="[0-9]{6}" required disabled={disabled} autoFocus={autoFocus} aria-label={label}/>
 <div className="code-cells" aria-hidden="true">{Array.from({length:6},(_,i)=><span key={i} className={focused&&i===Math.min(value.length,5)?'is-current':''}>{value[i]?(mask?'●':value[i]):''}</span>)}</div>
 </div></div>;
}
