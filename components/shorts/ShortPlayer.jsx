"use client";
import { useEffect,useRef,useState } from 'react';
import { RefreshCw } from 'lucide';
import { MorphIcon } from '@/components/ui/MorphIcon';
import {playbackBandwidth,rememberBandwidth,initialQualityLevel} from '@/lib/shorts/playback-policy';
let library;
const loadHls=()=>library ||= import('hls.js').then(m=>m.default);
export function ShortPlayer({item,active,warm,muted,onMuteFallback,onView,qualified=true,maxBytes=8000000,bufferSeconds=10}){
 const video=useRef(null),engine=useRef(null),activeRef=useRef(active),viewCallback=useRef(onView),budget=useRef({maxBytes,bufferSeconds}),intent=useRef(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{activeRef.current=active;viewCallback.current=onView;},[active,onView]);
 useEffect(()=>{budget.current={maxBytes,bufferSeconds};},[maxBytes,bufferSeconds]);
 useEffect(()=>{
  const v=video.current;let gone=false,hls=null;const clear=()=>{v.pause();hls?.destroy();if(engine.current===hls)engine.current=null;v.removeAttribute('src');v.load();};
  if(!warm)return clear;
  async function setup(){
   setFailed(false);v.preload='auto';
   if(item.hlsUrl){const Hls=await loadHls();if(gone)return;
    if(Hls.isSupported()){
     const connection=navigator.connection||{},estimate=playbackBandwidth(connection);
     hls=new Hls({enableWorker:true,autoStartLoad:false,startLevel:-1,testBandwidth:false,abrEwmaDefaultEstimate:estimate,abrEwmaFastVoD:2,abrEwmaSlowVoD:5,maxBufferLength:activeRef.current?budget.current.bufferSeconds:2,maxMaxBufferLength:12,maxBufferSize:budget.current.maxBytes,backBufferLength:12,capLevelToPlayerSize:true,maxDevicePixelRatio:3,capLevelOnFPSDrop:true,lowLatencyMode:false});engine.current=hls;
     hls.on(Hls.Events.MANIFEST_PARSED,()=>{if(gone)return;const start=initialQualityLevel(hls.levels,{bandwidth:estimate,width:v.clientWidth*Math.min(devicePixelRatio||1,3),saveData:connection.saveData});hls.startLevel=start;hls.startLoad(0);});
     hls.on(Hls.Events.FRAG_BUFFERED,()=>{rememberBandwidth(hls.bandwidthEstimate);if(!activeRef.current&&v.buffered.length&&v.buffered.end(v.buffered.length-1)>=v.currentTime+1.8)hls.stopLoad();});
     hls.on(Hls.Events.ERROR,(_,data)=>{if(!data.fatal||gone)return;hls.destroy();engine.current=null;v.src=item.mediaUrl;v.load();if(activeRef.current&&!document.hidden)v.play().catch(()=>{});});
     hls.loadSource(item.hlsUrl);hls.attachMedia(v);
    }else{v.src=v.canPlayType('application/vnd.apple.mpegurl')?item.hlsUrl:item.mediaUrl;v.load();}
   }else{v.src=item.mediaUrl;v.load();}
   if(activeRef.current&&!document.hidden&&!intent.current)v.play().catch(()=>{});
  }
  setup().catch(()=>{if(!gone){v.src=item.mediaUrl;v.load();if(activeRef.current)v.play().catch(()=>{});}});
  return ()=>{gone=true;clear();};
 },[warm,item.hlsUrl,item.mediaUrl,retry]);
 useEffect(()=>{
  const v=video.current;let live=true;
  function sync(){
   if(active&&!document.hidden&&!intent.current){if(engine.current){engine.current.config.maxBufferLength=bufferSeconds;engine.current.config.maxBufferSize=maxBytes;engine.current.autoLevelCapping=-1;engine.current.startLoad(v.currentTime||0);}v.play().catch(e=>{if(!live)return;if(e.name==='NotAllowedError'&&!v.muted){v.muted=true;onMuteFallback?.();v.play().catch(()=>{});}});}
   else{v.pause();if(engine.current){engine.current.config.maxBufferLength=2;engine.current.stopLoad();}}
  }
  if(active)intent.current=false;sync();document.addEventListener('visibilitychange',sync);
  return ()=>{live=false;v.pause();document.removeEventListener('visibilitychange',sync);};
 },[active,bufferSeconds,maxBytes,onMuteFallback]);
 useEffect(()=>{const v=video.current;let last=performance.now(),time=v.currentTime,elapsed=0,done=false;
  const t=setInterval(()=>{const now=performance.now(),delta=now-last,progress=v.currentTime-time;
   if(active&&qualified&&!document.hidden&&!v.paused&&!v.seeking&&v.readyState>=2&&progress>0&&progress<=delta/1000+0.4)elapsed+=Math.min(delta,500);
   last=now;time=v.currentTime;
   if(!done&&elapsed>=2000){done=true;viewCallback.current?.(elapsed);}
  },120);return ()=>clearInterval(t);
 },[active,qualified,item.id]);
 function toggle(){const v=video.current;if(!active)return;if(v.paused){intent.current=false;v.play().catch(()=>{});}else{intent.current=true;v.pause();}}
 return <div className="short-player" data-player-warm={warm?'1':'0'}>
  <video ref={video} playsInline disableRemotePlayback muted={muted} loop poster={warm?item.posterUrl:undefined} preload={warm?'auto':'none'} onClick={toggle} onError={()=>{if(activeRef.current)setFailed(true);}} aria-label="Video giới thiệu sản phẩm"/>
  {active&&failed&&<button className="short-center-play" aria-label="Thử tải lại video" onClick={()=>setRetry(n=>n+1)}><MorphIcon icon={RefreshCw} size={32}/></button>}
 </div>;
}
