'use client';
import {useEffect,useState} from 'react';
export const BUSINESS_CHANGED='reloo-business-changed';
export function notifyBusinessChanged(){
 window.dispatchEvent(new Event(BUSINESS_CHANGED));
 if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel(BUSINESS_CHANGED);channel.postMessage('refresh');channel.close()}
}
export function useBusinessEntity(initial={}){
 const [entity,setEntity]=useState(initial);
 useEffect(()=>{
  const controller=new AbortController();let revision=0;
  const load=async()=>{const current=++revision;try{const r=await fetch('/api/business',{signal:controller.signal,cache:'no-store'}),d=await r.json();if(r.ok&&d.ok&&!controller.signal.aborted&&current===revision)setEntity(d.entity||{})}catch{/* Keep the last explicit value on a transient error; never invent an entity. */}};
  const visible=()=>{if(document.visibilityState==='visible')void load()};
  void load();window.addEventListener('focus',visible);window.addEventListener(BUSINESS_CHANGED,visible);document.addEventListener('visibilitychange',visible);
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(BUSINESS_CHANGED):null;if(channel)channel.onmessage=visible;
  const timer=setInterval(visible,60000);
  return()=>{controller.abort();clearInterval(timer);channel?.close();window.removeEventListener('focus',visible);window.removeEventListener(BUSINESS_CHANGED,visible);document.removeEventListener('visibilitychange',visible)};
 },[]);
 return entity;
}
