import {mayTrack} from '../privacy/consent-policy.mjs';
export const validMeasurementId=id=>typeof id==='string'&&/^G-[A-Z0-9]{6,20}$/.test(id);
export function disableGoogleAnalytics(){if(typeof window==='undefined')return;const state=window.__relooGoogleAnalytics;if(state){state.enabled=false;window['ga-disable-'+state.id]=true;}}
export function googlePageView(id,path,source){
 if(typeof window==='undefined'||!validMeasurementId(id)||!path||location.hostname!=='reloo.vn'||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1')return;
 let consent;try{const raw=localStorage.getItem('reloo-cookie-consent')||decodeURIComponent(document.cookie.split('; ').find(v=>v.startsWith('reloo-cookie-consent='))?.slice('reloo-cookie-consent='.length)||'null');consent=JSON.parse(raw)}catch{return;}
 if(!mayTrack(consent)){disableGoogleAnalytics();return;}
 let state=window.__relooGoogleAnalytics;
 if(!state){state={id,enabled:true};window.__relooGoogleAnalytics=state;window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
 window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});window.gtag('js',new Date());
 window.gtag('config',id,{send_page_view:false,page_location:'https://reloo.vn'+path,page_title:'RELOO',page_referrer:'',allow_google_signals:false,allow_ad_personalization_signals:false,ignore_referrer:true,cookie_domain:'reloo.vn',cookie_expires:15552000});
 const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;const nonce=document.querySelector('script[nonce]')?.nonce;if(nonce)script.nonce=nonce;script.dataset.relooAnalytics='true';document.head.appendChild(script);
 }
 if(state.id!==id)return;state.enabled=true;window['ga-disable-'+id]=false;
 if(state.lastPath===path&&Date.now()-state.lastAt<2000)return;state.lastPath=path;state.lastAt=Date.now();
 window.gtag('config',id,{send_page_view:false,page_location:'https://reloo.vn'+path,page_title:'RELOO',page_referrer:''});
 // Public route templates only: no query, account IDs, title, GPS or private referrer.
 window.gtag('event','page_view',{send_to:id,page_location:'https://reloo.vn'+path,page_path:path,page_title:'RELOO',page_referrer:'',reloo_source:source||'unknown'});
}
