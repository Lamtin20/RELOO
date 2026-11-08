'use client';
import {useEffect,useState} from 'react';
// Result is keyed by URL so dependent selectors never display a previous parent's data.
export function useJsonResource(url,{interval=0}={}){
 const [result,setResult]=useState(null);
 useEffect(()=>{if(!url)return;let live=true;const controller=new AbortController();async function load(){try{const r=await fetch(url,{signal:controller.signal}),d=await r.json();if(!r.ok||d.ok===false)throw Error(d.error||'Không tải được dữ liệu.');if(live)setResult({url,data:d,error:null})}catch(e){if(live&&e.name!=='AbortError')setResult({url,data:null,error:e.message})}}load();const timer=interval?setInterval(load,interval):null;return()=>{live=false;controller.abort();if(timer)clearInterval(timer)}},[url,interval]);
 const current=result?.url===url?result:null;return {data:current?.data||null,error:current?.error||null,loading:!!url&&!current};
}
