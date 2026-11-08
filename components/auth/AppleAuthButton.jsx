'use client';
import {useEffect,useState} from 'react';
import {SocialAuthButton} from './GoogleAuthButton';
export function AppleAuthButton(props){
 const [ready,setReady]=useState(false);
 useEffect(()=>{const abort=new AbortController();fetch('/api/auth/capabilities',{cache:'no-store',signal:abort.signal}).then(r=>r.ok?r.json():null).then(d=>setReady(d?.apple===true)).catch(()=>{});return()=>abort.abort();},[]);
 return ready?<SocialAuthButton {...props} provider="apple"/>:null;
}
