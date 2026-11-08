import {UatLogin} from '@/components/chat-control/UatLogin';
import {notFound,redirect} from 'next/navigation';
import {CentralIdentityEntry} from '@/components/auth/CentralIdentityEntry';
import {federationClientConfigured} from '@/lib/auth/federation-policy';
export const metadata={title:'RELOO · Đăng nhập UAT',robots:{index:false,follow:false}};
export default async function UatLoginPage({searchParams}){if(process.env.NODE_ENV==='production'&&process.env.RELOO_ENVIRONMENT!=='staging')notFound();const p=await searchParams;let next='/';try{const u=new URL(p?.next||'/','https://staging.reloo.vn');if(u.origin==='https://staging.reloo.vn'&&!/[\\\u0000-\u001f]/.test(p?.next||'')&&!/^\/(?:api|uat)(?:\/|$)/.test(u.pathname))next=u.pathname+u.search;}catch{}if(federationClientConfigured('https://staging.reloo.vn')&&!['permission','expired'].includes(p?.reason))redirect('/api/auth/federation/start?next='+encodeURIComponent(next));return federationClientConfigured('https://staging.reloo.vn')?<CentralIdentityEntry next={next} reason={['permission','expired'].includes(p?.reason)?p.reason:''}/>:<UatLogin next={next}/>;}
