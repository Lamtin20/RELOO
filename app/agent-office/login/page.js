import Link from 'next/link';
import {redirect} from 'next/navigation';
import {federationClientConfigured} from '@/lib/auth/federation-policy';
import {CentralIdentityEntry} from '@/components/auth/CentralIdentityEntry';
export const metadata={title:'Đăng nhập · RELOO Agent Office',robots:{index:false,follow:false}};
export default async function Page({searchParams}){const params=await searchParams,reason=['permission','expired'].includes(params?.reason)?params.reason:'';if(federationClientConfigured('https://agent.reloo.vn')){if(!reason)redirect('/api/auth/federation/start');return <CentralIdentityEntry next="/agent-office" reason={reason}/>;}return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:24,background:'#f2f7f3'}}><section style={{maxWidth:480,padding:32,background:'white',borderRadius:24,border:'1px solid #dce7df'}}><p>RELOO / AGENT OFFICE</p><h1>Văn phòng AI của bạn.</h1><p>Dùng tài khoản CRM và xác thực hai bước. Quyền quản trị được kiểm tra lại khi truy cập.</p><Link className="btn btn-primary" href="/api/auth/sso/start">Tiếp tục với CRM</Link></section></main>;}
