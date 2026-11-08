import {timingSafeEqual} from 'node:crypto';
import {privateHash} from '../operations/crypto.js';
import {analyticsConsent} from '../content/news-measurement.js';
const NAME='reloo-measurement-session';
export function measurementCookie(sessionHash,actor,{now=Date.now(),secure=true}={}){
 const body=Buffer.from(JSON.stringify({s:sessionHash,a:actor?privateHash('MEASUREMENT_ACTOR',actor):null,e:now+1800000})).toString('base64url');
 return NAME+'='+body+'.'+privateHash('MEASUREMENT_COOKIE',body)+'; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800'+(secure?'; Secure':'');
}
export function measurementSession(request,actor,now=Date.now()){
 try{if(!analyticsConsent(request.headers.get('cookie')||'',now)||request.headers.get('dnt')==='1'||request.headers.get('sec-gpc')==='1')return null;
 const value=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(NAME+'='))?.slice(NAME.length+1),[body,signature]=String(value||'').split('.');const expected=privateHash('MEASUREMENT_COOKIE',body);if(!signature||signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;
 const data=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));if(data.a!==privateHash('MEASUREMENT_ACTOR',actor)||data.e<now||data.e>now+1800000||!/^[a-f0-9]{64}$/.test(data.s))return null;return data.s;
 }catch{return null;}
}
export async function linkRentalMeasurement(request,db,actor,source,order){
 if(process.env.RELOO_PRODUCT_ANALYTICS_ENABLED!=='true')return;
 const session=measurementSession(request,actor);if(!session)return;
 try{await db.rpc('reloo_link_product_order',{p_actor:actor,p_session:session,p_source:source,p_order:String(order),p_actor_hash:privateHash('MEASUREMENT_ACTOR',actor)});}catch{/* A committed transaction must never fail because of optional analytics. */}
}
