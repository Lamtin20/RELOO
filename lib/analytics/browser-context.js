import {externalTouch} from './dictionary';
export function analyticsContext(scope='anonymous',now=Date.now()){
 const key='reloo_product_analytics_context',old=JSON.parse(sessionStorage.getItem(key)||'null');
 if(old&&old.scope===scope&&now-old.last<1800000){old.last=now;sessionStorage.setItem(key,JSON.stringify(old));return old;}
 const u=new URL(location.href),touch=externalTouch(document.referrer,{source:u.searchParams.get('utm_source'),medium:u.searchParams.get('utm_medium'),campaign:u.searchParams.get('utm_campaign'),content:u.searchParams.get('utm_content')});
 let visitor=JSON.parse(localStorage.getItem('reloo_analytics_scope')||'null');
 if(!visitor||visitor.scope!==scope||now-visitor.at>90*86400000)visitor={scope,id:crypto.randomUUID(),at:now,firstTouch:touch};
 localStorage.setItem('reloo_analytics_scope',JSON.stringify(visitor));localStorage.setItem('reloo_analytics_visitor',visitor.id);
 const context={scope,visitorId:visitor.id,sessionId:crypto.randomUUID(),touch,firstTouch:visitor.firstTouch,last:now};sessionStorage.setItem(key,JSON.stringify(context));sessionStorage.setItem('reloo_analytics_session_v2',JSON.stringify({id:context.sessionId,last:now}));return context;
}
