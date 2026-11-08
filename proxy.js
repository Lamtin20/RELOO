import {NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {supabaseServerFetch} from './lib/supabase/fetch.js';
import {contentSecurityPolicy} from './lib/security/web-policy.js';
import {authCookieOptions,legacyAuthCookieHeaders} from './lib/auth/cookie-options.js';
import {pausedVideoPath} from './lib/features/video.js';
import {stagingAccess} from './lib/runtime/staging.js';
import {CHAT_HOST,isChatHost,chatHostConfigured,controlPathAllowed} from './lib/chat-control/host.js';
import {AGENT_HOST,isAgentHost,officePathAllowed} from './lib/agent-office/host.js';
import {federationCookie,federatedIdentity} from './lib/auth/federation-identity.js';
import {federationClient} from './lib/auth/federation-policy.js';
export async function proxy(request){
 if(process.env.RELOO_IDENTITY_MODE==='federated-client'&&!federationClient('https://'+(request.headers.get('host')||request.nextUrl.host).toLowerCase()))return new NextResponse('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 let stage=stagingAccess(request);if(stage&&stage.status===503)return new NextResponse(stage.body,{status:stage.status,headers:stage.headers});
 if(isAgentHost(request)){
  if(process.env.RELOO_AGENT_OFFICE_HOST!==AGENT_HOST)return new NextResponse('Agent Office is not configured.',{status:503});
  if(!officePathAllowed(request.nextUrl.pathname))return new NextResponse('Not found',{status:404});
  if(request.nextUrl.pathname==='/')return NextResponse.redirect(new URL('/agent-office','https://'+AGENT_HOST));
 }
 if(isChatHost(request)){
  if(!chatHostConfigured())return new NextResponse('Management UAT is not configured.',{status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  if(!controlPathAllowed(request.nextUrl.pathname,request.method))return new NextResponse('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  if(request.nextUrl.pathname==='/')return NextResponse.redirect(new URL('/chat-control','https://'+CHAT_HOST));
 }
 if(pausedVideoPath(request.nextUrl.pathname))return request.nextUrl.pathname.startsWith('/api/')?NextResponse.json({ok:false,code:'VIDEO_PAUSED'},{status:410,headers:{'Cache-Control':'no-store'}}):NextResponse.redirect(new URL(request.nextUrl.pathname.startsWith('/dashboard/')?'/lend':'/explore',request.url));
 const host=request.headers.get('host')?.toLowerCase().split(':')[0]||request.nextUrl.hostname;
 if(host==='www.reloo.vn')return NextResponse.redirect(new URL('https://reloo.vn'+request.nextUrl.pathname+request.nextUrl.search));
 if(['reloo.vn','www.reloo.vn'].includes(host)&&(request.nextUrl.pathname==='/crm'||request.nextUrl.pathname.startsWith('/crm/')))
  return NextResponse.redirect(new URL(request.nextUrl.pathname+request.nextUrl.search,'https://crm.reloo.vn'));
 const nonce=Buffer.from(crypto.randomUUID()).toString('base64');
 const csp=contentSecurityPolicy(nonce,{development:process.env.NODE_ENV!=='production',authOrigin:process.env.NEXT_PUBLIC_SUPABASE_URL?new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin:'https://auth.reloo.vn'});
 const requestHeaders=new Headers(request.headers);requestHeaders.set('x-nonce',nonce);requestHeaders.set('Content-Security-Policy',csp);
 let response=NextResponse.next({request:{headers:requestHeaders}});
 const options=authCookieOptions();
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const existing=request.cookies.getAll().filter(cookie=>cookie.name.startsWith('sb-'));
 let authenticated=false;
 const centralRequired=process.env.RELOO_IDENTITY_MODE==='federated-client'&&!!federationClient('https://'+(request.headers.get('host')||request.nextUrl.host).toLowerCase());
 if(centralRequired&&federationCookie(request)){try{await federatedIdentity(request);authenticated=true;}catch(e){if(e.status>=500)return NextResponse.json({ok:false,code:'IDENTITY_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}}
 // Upgrade legacy browser-readable cookies without exposing tokens to client JS.
 for(const cookie of existing)response.cookies.set(cookie.name,cookie.value,options);
 if(url&&key&&existing.length&&!centralRequired){
  const client=createServerClient(url,key,{cookieOptions:options,global:{fetch:supabaseServerFetch},cookies:{
   getAll:()=>request.cookies.getAll(),
   setAll:cookies=>{
    cookies.forEach(({name,value})=>request.cookies.set(name,value));
    requestHeaders.set('cookie',request.cookies.toString());
    const previous=response.cookies.getAll();
    response=NextResponse.next({request:{headers:requestHeaders}});
    previous.forEach(cookie=>response.cookies.set(cookie));
    cookies.forEach(({name,value,options:cookieOptions})=>response.cookies.set(name,value,{...cookieOptions,...options,maxAge:cookieOptions.maxAge===0?0:options.maxAge}));
   },
  }});
  try{const verified=await client.auth.getUser();authenticated=authenticated||!!verified.data.user&&!verified.error;}catch{/* Backend operations independently verify authentication. */}
 }
 stage=stagingAccess(request,process.env,{authenticated});
 if(centralRequired&&!authenticated&&(isAgentHost(request)&&request.nextUrl.pathname==='/agent-office'||isChatHost(request)&&request.nextUrl.pathname==='/chat-control'))return NextResponse.redirect(new URL(isAgentHost(request)?'/agent-office/login':'/chat-control/login',request.url));
 if(stage&&stage.status!==200){
  if(request.nextUrl.pathname.startsWith('/api/'))return NextResponse.json({ok:false,code:'UAT_LOGIN_REQUIRED'},{status:stage.status,headers:stage.headers});
  const target=isChatHost(request)?'https://chat.reloo.vn/chat-control/login':'https://staging.reloo.vn/uat/login';
  return NextResponse.redirect(new URL(target+'?next='+encodeURIComponent(request.nextUrl.pathname+request.nextUrl.search)));
 }
 // Append separately: host-only replacement and legacy domain expiration have
 // identical names but distinct scopes, which ResponseCookies' map cannot hold.
 for(const header of legacyAuthCookieHeaders(existing,host))response.headers.append('Set-Cookie',header);
 response.headers.set('Content-Security-Policy',csp);response.headers.set('Cache-Control','private, no-store');
 if(stage)response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|images/|brand/|mascot/|vision/|api/health).*)']};

