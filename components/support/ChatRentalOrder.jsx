'use client';
import {useEffect,useState} from 'react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {RentalRequestFlow} from '@/components/booking/RentalRequest';
export function ChatRentalOrder({listingId,onClose}){
 const {locale}=useLocale(),en=locale==='en-US', [result,setResult]=useState(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;const controller=new AbortController();fetch('/api/listings/'+encodeURIComponent(listingId),{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw Error();if(live)setResult({listing:d.listing})}).catch(()=>{if(live)setResult({error:true})});return()=>{live=false;controller.abort()}},[listingId,attempt]);
 return <div className="advisor-order"><button type="button" className="advisor-order-back" onClick={onClose}>{en?'Back to conversation':'Quay lại hội thoại'}</button>{!result?<p role="status">{en?'Loading rental details…':'Đang tải thông tin thuê…'}</p>:result.error?<><p role="alert">{en?'Could not load this item.':'Chưa tải được món đồ này.'}</p><button type="button" onClick={()=>{setResult(null);setAttempt(n=>n+1)}}>{en?'Retry':'Thử lại'}</button></>:<RentalRequestFlow key={listingId} listing={result.listing} embedded/>}</div>;
}
