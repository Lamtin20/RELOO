'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {useAuth} from '@/lib/store';
const Context=createContext({counts:{},loading:true,error:false,refresh:()=>{}});
export const useAccountCounts=()=>useContext(Context);
export function AccountCountsProvider({children}){const {user}=useAuth(),path=usePathname(),[state,setState]=useState({actor:null,counts:{},loading:true,error:false}),active=useRef(null);
 const actor=user?.id;
 const refresh=useCallback(async()=>{if(!actor)return;active.current?.abort();const c=new AbortController();active.current=c;try{const r=await fetch('/api/dashboard/counts',{cache:'no-store',signal:AbortSignal.any([c.signal,AbortSignal.timeout(10000)])});const d=await r.json();if(!r.ok)throw Error();if(!c.signal.aborted)setState({...d,actor,loading:false,error:false});}catch{if(!c.signal.aborted)setState({actor,counts:{},loading:false,error:true});}},[actor]);
 useEffect(()=>{const start=setTimeout(refresh,200),timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},60000);const update=()=>refresh();window.addEventListener('reloo-account-changed',update);window.addEventListener('focus',update);return()=>{clearTimeout(start);clearInterval(timer);active.current?.abort();window.removeEventListener('reloo-account-changed',update);window.removeEventListener('focus',update);};},[refresh,path]);
 const value=state.actor===user?.id?state:{counts:{},loading:true,error:false};return <Context.Provider value={{...value,refresh}}>{children}</Context.Provider>;
}
export function PendingBadge({name,total=false}){const {counts,loading}=useAccountCounts(),value=counts[name+(total?'Total':'')];return <span className={'aw-count'+(Number(value)>0?' has-items':'')} title={loading?'Đang tải số lượng':value===null||value===undefined?'Chưa có số liệu đáng tin cậy':total?'Tổng số trong tài khoản':'Số mục đang chờ; thông báo/hộp thư là số chưa đọc'} aria-label={loading?'Đang tải số lượng':value===null||value===undefined?'Chưa có số liệu':`${value} ${total?'tổng số':'đang chờ'}`}>{loading?'…':value===null||value===undefined?'—':value>999?'999+':value}</span>;}
