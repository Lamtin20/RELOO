'use client';
import {useEffect,useEffectEvent,useRef,useState} from 'react';
import {Check,LoaderCircle,RotateCcw} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import {PHOTO_ASSIST_NOTICE,PRODUCT_BRANDS,TECH_CATEGORIES,productIdentity,automaticPhotoSuggestion,verifiedProductPatch,officialProductUrl} from '@/lib/listing-ai/policy';
import './listing-photo-assist.css';
const CATEGORY_LABELS={'am-thanh':['Loa & Âm thanh','Speakers & Audio'],'may-anh':['Máy ảnh','Cameras'],'may-quay':['Máy quay','Video cameras'],livestream:['Livestream','Livestream'],'dien-tu':['Điện tử khác','Other electronics'],'laptop-pc':['Máy tính','Computers'],'dien-thoai':['Điện thoại','Phones'],gaming:['Máy chơi game','Consoles'],'may-chieu':['Máy chiếu','Projectors']};

export function ListingPhotoAssist({images=[],disabled=false,onSuggestion,autoStart=true,active=true,allowed=true,onAllowedChange,onOpenHelp}){
 const {locale}=useLocale(),en=locale==='en-US',t=(vi,english)=>en?english:vi;
 const [config,setConfig]=useState(null),[result,setResult]=useState(null),[phase,setPhase]=useState('idle'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[editor,setEditor]=useState({brand:'',model:'',category:''});
 const generation=useRef(0),controller=useRef(null),last=useRef(null),mounted=useRef(true),delivered=useRef(onSuggestion);
 useEffect(()=>{delivered.current=onSuggestion},[onSuggestion]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort()}},[]);
 useEffect(()=>{
  const abort=new AbortController();
  fetch('/api/listings/assist',{cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(5000)])}).then(r=>r.ok?r.json():null).then(d=>{if(!abort.signal.aborted)setConfig(d?.ok?d:{enabled:false})}).catch(()=>{if(!abort.signal.aborted)setConfig({enabled:false})});
  return()=>abort.abort();
 },[attempt]);
 const image=images.at(-1)||null;
 const current=version=>mounted.current&&version===generation.current;
 async function request(body,signal){
  const requestId=crypto.randomUUID();
  for(let retry=0;retry<2;retry++){
   try{
    const response=await fetch('/api/listings/assist',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([signal,AbortSignal.timeout(85000)]),body:JSON.stringify({...body,requestId,locale,noticeVersion:PHOTO_ASSIST_NOTICE})});
    const data=await response.json();if(!response.ok||!data.ok)throw Error(data.code||'AI_UNAVAILABLE');return data;
   }catch(cause){
    if(signal.aborted||retry===1||!['TypeError','AI_BUSY'].includes(cause.name==='TypeError'?cause.name:cause.message))throw cause;
    await new Promise((resolve,reject)=>{const cancel=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'))};const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve()},600);signal.addEventListener('abort',cancel,{once:true});});
   }
  }
 }
 function begin(){controller.current?.abort();controller.current=new AbortController();return {version:++generation.current,signal:controller.current.signal};}
 function finish(value,version){if(!current(version))return;setResult(value);setPhase(delivered.current?.(value)===false?'conflict':'done');}
 async function researchAndFill(identity,version,signal,fallback){
  setPhase('researching');
  try{const value=await request({action:'enrich',identity},signal);finish(value,version);}
  catch(cause){if(!current(version)||signal.aborted)return;finish({...fallback,research:{provider:'none',fallbackReason:'RESEARCH_UNAVAILABLE'}},version);}
 }
 async function identify(value){
  const {version,signal}=begin();last.current=value;setPhase('identifying');setResult(null);setError('');
  try{
   const proposal=await request({action:'identify',image:value},signal);if(!current(version))return;
   setResult(proposal);setEditor(proposal.identity||{brand:'',model:'',category:''});
   const supported=automaticPhotoSuggestion(proposal,locale);
   if(supported)await researchAndFill(proposal.identity,version,signal,supported);
   else setPhase('needs-detail');
  }catch(cause){if(!current(version)||signal.aborted)return;setPhase('error');setError(cause.message==='AI_DAILY_LIMIT'?t('Bạn đã dùng hết lượt hỗ trợ hôm nay. Bản nháp vẫn có thể tự điền.','Today’s assistance limit has been reached. You can still fill in your draft.'):t('RELOO chưa nhận ra món đồ này. Bạn có thể chụp lại, thêm ảnh hoặc tự nhập.','RELOO could not identify this item. Take another photo, add a photo or enter the details.'));}
 }
 const autoIdentify=useEffectEvent(value=>identify(value));
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   if(!active){setPhase(value=>['identifying','researching'].includes(value)?'manual':value);return;}
   if(!allowed||disabled||!config?.enabled||!image?.startsWith('data:image/webp;')){if(!allowed||!image)last.current=null;setPhase('idle');setResult(null);setError('');return;}
   if(last.current!==image&&autoStart)autoIdentify(image);
  });
  const invalidate=()=>{generation.current++;controller.current?.abort()};
  return()=>{cancelAnimationFrame(frame);invalidate()};
 },[image,allowed,disabled,config?.enabled,autoStart,active]);
 async function confirmMissing(){
  let identity;try{identity=productIdentity(editor);if(!identity.model)throw Error()}catch{setError(t('Điền hãng, loại sản phẩm và model trên nhãn. Không nhập số serial.','Enter the brand, product type and model from its label, without a serial number.'));return;}
  const {version,signal}=begin();setError('');await researchAndFill(identity,version,signal,verifiedProductPatch(identity,{facts:[]},[],locale));
 }
 function stop(){generation.current++;controller.current?.abort();setPhase('manual');setResult(null);setError('');}
 function manual(){stop();document.getElementById('owner-title')?.focus();}
 const pending=phase==='identifying'||phase==='researching';
 return <section className="listing-photo-assist" aria-label={t('Hỗ trợ hoàn thiện bài đăng','Listing draft assistance')}>
  <header><span><Check size={17} aria-hidden="true"/><strong>{t('RELOO điền giúp bạn','Let RELOO fill in the details')}</strong></span><label><input type="checkbox" checked={allowed} disabled={disabled} onChange={event=>{onAllowedChange?.(event.target.checked);if(!event.target.checked)stop();else last.current=null}}/>{t('Bật gợi ý','Enable suggestions')}</label></header>
  <p className="listing-photo-notice">{t('Ảnh được xử lý trong RELOO. Hãng và model đọc rõ sẽ được tra cứu trên Internet để điền bản nháp. Bạn luôn kiểm tra trước khi đăng.','Photos are processed within RELOO. Clearly identified brands and models are researched online to fill your draft. You always review before publishing.')}</p>
  {allowed&&config?.enabled===false&&<p role="status">{t('Hỗ trợ ảnh chưa sẵn sàng. Bạn vẫn có thể tự điền.','Photo assistance is unavailable. You can still enter details.')} <button type="button" onClick={()=>setAttempt(n=>n+1)}>{t('Kiểm tra lại','Check again')}</button></p>}
  {pending&&<div><p className="listing-photo-progress" role="status"><LoaderCircle size={16} className="spin" aria-hidden="true"/>{phase==='identifying'?t('Đang xem món đồ của bạn…','Taking a look at your item…'):t('Đang tìm thông tin phù hợp…','Finding matching information…')}</p><button type="button" onClick={manual}>{t('Tiếp tục tự nhập','Continue manually')}</button></div>}
  {allowed&&result&&!pending&&<div className="listing-photo-result">
   {phase==='needs-detail'&&<><strong>{t('Chỉ cần bổ sung thông tin còn thiếu','Just add the missing information')}</strong><p>{t('Chưa đủ căn cứ để chọn đúng model. Xem nhãn trên món đồ hoặc thêm ảnh rõ hơn.','There is not enough evidence to choose the exact model. Check its label or add a clearer photo.')}</p>
    {!!result.candidates?.length&&<div className="listing-photo-candidates" aria-label={t('Model cần đối chiếu','Models to compare')}>{result.candidates.slice(0,3).map(model=><button type="button" key={model} onClick={()=>setEditor(value=>({...value,model}))}>{model}</button>)}</div>}
    <fieldset className="listing-photo-identity" disabled={disabled}><legend>{t('Thông tin trên nhãn sản phẩm','Details on the product label')}</legend>
     <label>{t('Loại sản phẩm','Product type')}<select name="photo-category-confirmation" value={editor.category} onChange={event=>setEditor(value=>({...value,category:event.target.value}))}><option value="">{t('Chọn loại sản phẩm','Choose a type')}</option>{TECH_CATEGORIES.map(category=><option key={category} value={category}>{CATEGORY_LABELS[category]?.[en?1:0]||category}</option>)}</select></label>
     <label>{t('Thương hiệu','Brand')}<select name="photo-brand-confirmation" value={editor.brand} onChange={event=>setEditor(value=>({...value,brand:event.target.value}))}><option value="">{t('Chọn hãng','Choose a brand')}</option>{PRODUCT_BRANDS.map(brand=><option key={brand}>{brand}</option>)}</select></label>
     <label>{t('Model trên món đồ','Model on the item')}<input name="photo-model-confirmation" value={editor.model} maxLength={80} onChange={event=>setEditor(value=>({...value,model:event.target.value}))} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();confirmMissing()}}}/></label>
     <button type="button" disabled={!editor.brand||!editor.model.trim()||!editor.category} onClick={confirmMissing}>{t('Dùng thông tin này','Use these details')}</button>
    </fieldset><button type="button" onClick={manual}>{t('Tự nhập thông tin','Enter details myself')}</button>
   </>}
   {phase==='conflict'&&<p role="status">{t('Thông tin đang sửa thuộc một món đồ khác. RELOO đã giữ nguyên nội dung của bạn; hãy kiểm tra tên, hãng và danh mục.','Your current details describe another item. RELOO kept your edits; please check the title, brand and category.')}</p>}
   {phase==='done'&&<><strong>{[result.identity?.brand,result.identity?.model].filter(Boolean).join(' ')}</strong><p role="status">{result.status==='SOURCED'?t('Đã điền thông tin có nguồn. Bạn chỉ cần kiểm tra và bổ sung tình trạng, phụ kiện, giá và điều kiện thực tế.','Source-backed details filled. Review and add the actual condition, accessories, price and terms.'):t('Đã điền thông tin nhận diện. Chưa tìm được thông số đủ chắc chắn; hãy kiểm tra và bổ sung phần còn thiếu.','Identified details filled. Reliable specifications were not found; please review and add what is missing.')}</p></>}
   {!!result.sources?.length&&<div className="listing-photo-sources">{result.sources.filter(source=>officialProductUrl(source.url)).map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}{source.retrievedAt&&<small> · {t('Tra cứu','Retrieved')} {String(source.retrievedAt).slice(0,10)}</small>}</a>)}</div>}
  </div>}
  {error&&<p role="alert">{error}</p>}
  {allowed&&['error','manual','conflict'].includes(phase)&&image?.startsWith('data:image/webp;')&&<button type="button" disabled={disabled} onClick={()=>identify(image)}><RotateCcw size={15} aria-hidden="true"/>{t('Thử lại với ảnh này','Retry this photo')}</button>}
  <a href="/dashboard/messages?support=1" onClick={event=>{if(onOpenHelp?.()===false)event.preventDefault()}}>{t('Hỏi RELOO','Ask RELOO')}</a>
 </section>;
}
