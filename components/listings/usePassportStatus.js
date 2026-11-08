'use client';
import {useEffect,useState} from 'react';
export function usePassportStatus(hash,enabled=true){
 const key=enabled&&hash?hash:null,[result,setResult]=useState(null);
 useEffect(()=>{if(!key)return;const controller=new AbortController();fetch('/api/polygon/passport?hash='+encodeURIComponent(key),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('PASSPORT_UNAVAILABLE');return r.json()}).then(data=>setResult({key,data})).catch(e=>{if(e.name!=='AbortError')setResult({key,data:{ok:false,passport:{status:'offline',statusLabel:'Lỗi kết nối'}}})});return()=>controller.abort()},[key]);
 return {status:key&&result?.key===key?result.data:null,loading:!!key&&result?.key!==key};
}
