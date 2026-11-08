"use client";
import {useEffect,useRef,useState} from 'react';
import {useParams,useSearchParams} from 'next/navigation';
import {useMiniAppDraft} from '@/components/superapp/useMiniAppDraft';
import {useMiniAppRouter} from '@/components/superapp/useMiniAppRouter';
import {MiniAppLink as Link} from '@/components/superapp/MiniAppLink';
import {savePurchaseResume,readPurchaseResume,clearPurchaseResume} from '@/lib/product/purchase-resume';
import {CustomerOffers} from '@/components/promotions/CustomerOffers';
import {useAuth,useListings} from '@/lib/store';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {useLocale} from '@/components/settings/LocaleProvider';
import {Money} from '@/components/ui';
import {canBuy} from '@/lib/commerce';
export default function PurchasePage(){
 const {id}=useParams(),{user}=useAuth();
 return <PurchaseForm key={(user?.id||'guest')+':'+id} id={id} user={user}/>;
}
function PurchaseForm({id,user}){
 const router=useMiniAppRouter(),params=useSearchParams(),{locale}=useLocale(),t=(vi,en)=>locale==='en-US'?en:vi;
 const {getListingById,dbLoading}=useListings(),listing=getListingById(id),resume=params.get('resume');
 const [initial]=useState(()=>{try{return typeof window==='undefined'?null:readPurchaseResume(sessionStorage,resume,id)}catch{return null}});
 const [draft,patchDraft,clearDraft]=useMiniAppDraft((user?.id||'guest')+':purchase:'+id,initial||{mode:'MEET',address:''});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState(null),lock=useRef(false);
 const {mode,address}=draft;
 useEffect(()=>{if(user&&resume){try{clearPurchaseResume(sessionStorage,resume)}catch{/* Draft expiry still applies if storage permission was withdrawn. */}}},[user,resume]);
 async function send(e){
  e.preventDefault();if(lock.current||receipt)return;setError('');
  if(!user){
   try{const token=crypto.randomUUID();savePurchaseResume(sessionStorage,token,id,draft);router.push('/auth?next='+encodeURIComponent('/purchase/'+id+'?resume='+token));}
   catch{setError(t('Chưa lưu được bản nháp. Kiểm tra quyền lưu trữ rồi thử lại.','Unable to save your draft. Check browser storage permissions and retry.'))}
   return;
  }
  lock.current=true;setBusy(true);
  try{
   const r=await fetch('/api/purchases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({listingId:id,deliveryMode:mode,address})}),d=await r.json();
   if(!r.ok||d.ok===false||typeof d.id!=='string')throw Error(d.error||t('Chưa gửi được yêu cầu. Vui lòng thử lại.','Unable to send your request. Please retry.'));
   setReceipt(d.id);clearDraft();try{clearPurchaseResume(sessionStorage,resume)}catch{/* Cleanup failure must not hide a server-confirmed order. */}router.push('/dashboard/purchases?id='+encodeURIComponent(d.id));
  }catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}
 }
 return <MarketplaceShell><section className="container purchase-page">
  <Link href={'/product/'+id}>← {t('Quay lại sản phẩm','Back to item')}</Link><h1>{t('Mua món đồ bạn cần','Buy what you need')}</h1>
  {receipt?<section role="status"><h2>{t('Đã gửi yêu cầu mua','Purchase request sent')}</h2><Link href={'/dashboard/purchases?id='+encodeURIComponent(receipt)}>{t('Xem đơn mua','View purchase request')}</Link></section>:dbLoading&&!listing?<p role="status">{t('Đang tải sản phẩm…','Loading item…')}</p>:!listing||!canBuy(listing)?<p>{t('Món đồ hiện chưa mở bán.','This item is not available for purchase.')}</p>:<form onSubmit={send} aria-busy={busy}>
   <article className="purchase-summary"><h2>{listing.title}</h2><strong><Money amount={listing.salePrice}/></strong><p>{listing.location}</p></article>
   {user&&<CustomerOffers context={'listing='+encodeURIComponent(id)+'&kind=SALE'}/>}
   <label>{t('Cách nhận đồ','Handover method')}<select className="input" value={mode} onChange={e=>patchDraft({mode:e.target.value})}><option value="MEET">{t('Gặp trực tiếp','Meet in person')}</option><option value="DELIVER">{t('Nhờ người bán giao','Delivery by seller')}</option></select></label>
   <label>{mode==='MEET'?t('Địa điểm gặp dự kiến','Proposed meeting area'):t('Địa chỉ nhận đồ','Delivery address')}<textarea className="input" rows="3" minLength="5" maxLength="500" required value={address} onChange={e=>patchDraft({address:e.target.value})} placeholder={t('Nhập địa điểm để hai bên thống nhất giao nhận','Enter a location to agree with the seller')}/></label>
   <p>{t('Giá được chốt theo tin đăng tại thời điểm gửi. Người bán xác nhận trước khi giao. Thanh toán trực tiếp do hai bên thống nhất; tạo đơn chưa ghi nhận tiền đã thanh toán.','The price is checked against the listing when submitted. The seller confirms before handover. Payment is agreed directly; creating a request does not record a completed payment.')}</p>
   {error&&<p role="alert" className="ops-error">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy?t('Đang gửi…','Sending…'):user?t('Gửi yêu cầu mua','Send purchase request'):t('Đăng nhập để mua','Sign in to buy')}</button>
  </form>}
 </section></MarketplaceShell>;
}
