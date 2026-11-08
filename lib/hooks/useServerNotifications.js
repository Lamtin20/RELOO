"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
const requests=new Map();
export function useServerNotifications(userId){
 const current=useRef(userId);useEffect(()=>{current.current=userId;},[userId]);
 const [snapshot,setSnapshot]=useState({userId:null,notifications:[],error:''});
 const refresh=useCallback(async()=>{
  if(!userId)return false;
  try{let request=requests.get(userId);if(!request){request=fetch('/api/notifications',{cache:'no-store',signal:AbortSignal.timeout(12000)}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);return d.notifications;}).finally(()=>requests.delete(userId));requests.set(userId,request);}
   const notifications=await request;if(current.current===userId)setSnapshot({userId,notifications,error:''});return true;
  }catch(e){if(current.current===userId)setSnapshot(s=>({userId,notifications:s.userId===userId?s.notifications:[],error:e.message}));return false;}
 },[userId]);
 useEffect(()=>{if(!userId)return;const load=()=>{if(!document.hidden)refresh();};const start=setTimeout(load,0),timer=setInterval(load,15000);window.addEventListener('reloo-notifications-change',load);document.addEventListener('visibilitychange',load);return()=>{clearTimeout(start);clearInterval(timer);window.removeEventListener('reloo-notifications-change',load);document.removeEventListener('visibilitychange',load);};},[userId,refresh]);
 const mark=useCallback(async input=>{try{const r=await fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}),d=await r.json();if(!r.ok)throw Error(d.error);await refresh();window.dispatchEvent(new Event('reloo-notifications-change'));return true;}catch(e){if(current.current===userId)setSnapshot(s=>({...s,userId,error:e.message}));return false;}},[refresh,userId]);
 const notifications=snapshot.userId===userId?snapshot.notifications:[];
 return {notifications,unreadCount:notifications.filter(n=>!n.read).length,error:snapshot.userId===userId?snapshot.error:'',loading:!!userId&&snapshot.userId!==userId,refresh,markNotificationRead:id=>mark({id}),markAllNotificationsRead:()=>mark({all:true})};
}
