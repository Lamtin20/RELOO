'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useNativeApp} from '@/lib/mobile/useNativeApp';
import {useAuth} from '@/lib/store';
import {useLocale} from '@/components/settings/LocaleProvider';
import {CATEGORIES} from '@/lib/constants';
import {saveGuestInterests} from '@/lib/personalization/declared';
import {setupCategoryName} from '@/lib/i18n/setup';
import {Icon} from '@/components/ui';
import './app-launch.css';
import '@/components/ui/reloo-loading.css';
const KEY='reloo-app-intro-v1';
export function AppLaunch(){
 const native=useNativeApp(),{hydrated,user}=useAuth(),{locale}=useLocale(),en=locale==='en-US',router=useRouter();
 const [ready,setReady]=useState(false),[seen,setSeen]=useState(false),[step,setStep]=useState(0),[selected,setSelected]=useState([]),[error,setError]=useState('');
 const dialog=useRef(null),heading=useRef(null);
 useEffect(()=>{if(!native)return;const frame=requestAnimationFrame(()=>{try{setSeen(localStorage.getItem(KEY)==='1'||!!localStorage.getItem('reloo-experience-install-v1'));}catch{}setReady(true)});return()=>cancelAnimationFrame(frame)},[native]);
 const visible=native&&(!ready||!hydrated||!seen);
 useEffect(()=>{if(!visible)return;const node=dialog.current,previous=document.activeElement,overflow=document.body.style.overflow;node.showModal();document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=overflow;previous?.isConnected&&previous.focus?.()}},[visible]);
 useEffect(()=>{heading.current?.focus()},[step,hydrated]);
 function finish(){try{saveGuestInterests(localStorage,selected);window.dispatchEvent(new Event('reloo-declared-interests-changed'));localStorage.setItem(KEY,'1');localStorage.setItem('reloo-experience-install-v1','seen');setSeen(true);router.replace(user?'/':'/auth?next=%2F');}catch{setError(en?'Allow local storage to save your choices, then retry.':'Cho phép lưu trên thiết bị rồi thử lại để giữ lựa chọn của bạn.')}}
 if(!visible)return null;
 const welcome=!ready||!hydrated;
 const titles=en?['Welcome to RELOO','More possibilities, one app','What do you enjoy?']:['Chào bạn, đến với RELOO','Một RELOO, nhiều trải nghiệm','Bạn thích khám phá gì?'];
 return <dialog ref={dialog} className="app-launch" aria-labelledby="app-launch-heading" onCancel={e=>{e.preventDefault();if(!welcome&&step>0)setStep(step-1)}}>
  {welcome?<section className="app-welcome"><img src="/images/app-welcome-art.webp" alt="RELOO"/><div><h1 id="app-launch-heading" ref={heading} tabIndex={-1}>{en?'Welcome back':'Chào bạn trở lại'}</h1><span className="reloo-circle-spinner" role="status"><span className="sr-only">{en?'Restoring your session':'Đang khôi phục phiên của bạn'}</span></span></div></section>:<section className="app-intro">
   <header><span>RELOO</span><span aria-label={en?'Step':'Bước'}>{step+1} / 3</span></header>
   {step===0?<img className="app-intro__welcome" src="/images/app-welcome-art.webp" alt={en?'RELOO welcomes you':'RELOO chào đón bạn'}/>:step===1?<div className="app-intro__services">{[['BedDouble','Đặt phòng','Stays'],['Camera','Thuê đồ','Rentals'],['ShoppingBag','Đồ cũ','Pre-owned'],['BriefcaseBusiness','Việc làm','Jobs']].map(([icon,vi,eng])=><div key={icon}><Icon name={icon} size={34}/><strong>{en?eng:vi}</strong></div>)}</div>:<img className="app-intro__mascot" src="/mascot/reloop/v1/smiling.webp" alt=""/>}
   <h1 id="app-launch-heading" ref={heading} tabIndex={-1}>{titles[step]}</h1>
   <p>{step===0?(en?'Use what you need. Discover more, together.':'Dùng điều bạn cần. Khám phá thêm điều bạn thích.'):step===1?(en?'Rent, find a stay and explore local services. Availability is shown in each service.':'Thuê đồ, tìm chỗ nghỉ và khám phá dịch vụ gần bạn. Tình trạng mở bán được ghi rõ trong từng dịch vụ.'):(en?'Choose up to 5 interests, or continue without choosing.':'Chọn tối đa 5 sở thích, hoặc tiếp tục không chọn.')}</p>
   {step===2&&<><div className="app-intro__interests">{CATEGORIES.map(c=><button type="button" key={c.id} aria-pressed={selected.includes(c.id)} disabled={selected.length>=5&&!selected.includes(c.id)} onClick={()=>setSelected(all=>all.includes(c.id)?all.filter(x=>x!==c.id):[...all,c.id])}><Icon name={c.icon} size={22}/>{setupCategoryName(c,locale)}</button>)}</div><p className="app-intro__privacy">{en?'Used for recommendations on this device for 30 days. Confirm after signing in to save to your account. This does not enable browsing tracking.':'Dùng để gợi ý trên thiết bị trong 30 ngày. Bạn xác nhận lại sau đăng nhập để lưu vào tài khoản. Không bật theo dõi lịch sử xem.'}</p></>}
   {error&&<p role="alert">{error}</p>}
   <footer><div aria-label={en?'Introduction progress':'Tiến trình giới thiệu'}>{[0,1,2].map(i=><span key={i} data-active={i===step}/>)}</div><div>{step>0&&<button type="button" onClick={()=>setStep(step-1)}>{en?'Back':'Quay lại'}</button>}<button className="is-primary" type="button" onClick={()=>step<2?setStep(step+1):finish()}>{step<2?(en?'Continue':'Tiếp tục'):(en?'Sign in / Register':'Đăng nhập / Đăng ký')}</button></div></footer>
  </section>}
 </dialog>;
}
