'use client';
import {useLayoutEffect} from 'react';
// Ephemeral UI positions only. No cookies/storage, account IDs or form contents.
const positions=new Map();
export function useMiniAppScroll(key,enabled){
 useLayoutEffect(()=>{
  if(!enabled)return;
  const saved=positions.get(key);let frame=0,restoring=saved>0;
  const save=()=>{if(!restoring)positions.set(key,window.scrollY)};
  const restore=()=>{if(!restoring)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{window.scrollTo({top:saved,behavior:'instant'});if(document.documentElement.scrollHeight-innerHeight>=saved){restoring=false;observer.disconnect()}})};
  const cancel=()=>{restoring=false;observer.disconnect();save()};
  const observer=new ResizeObserver(restore);if(restoring){observer.observe(document.body);restore()}
  window.addEventListener('scroll',save,{passive:true});window.addEventListener('wheel',cancel,{passive:true});window.addEventListener('touchstart',cancel,{passive:true});
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',save);window.removeEventListener('wheel',cancel);window.removeEventListener('touchstart',cancel)};
 },[key,enabled]);
}
