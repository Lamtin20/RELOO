import {ChatControlLogin} from '@/components/chat-control/ChatControlLogin';
import {federationClientConfigured} from '@/lib/auth/federation-policy';
import {chatHostConfigured} from '@/lib/chat-control/host';
import {redirect} from 'next/navigation';
export const metadata={title:'Đăng nhập · RELOO Chat',robots:{index:false,follow:false}};
export default async function ChatLoginPage({searchParams}){const params=await searchParams,reason=['permission','expired'].includes(params?.reason)?params.reason:'';if(!reason){if(federationClientConfigured('https://chat.reloo.vn'))redirect('/api/auth/federation/start');if(process.env.RELOO_ENVIRONMENT!=='staging'&&chatHostConfigured())redirect('/api/auth/sso/start');}return <ChatControlLogin isUat={process.env.RELOO_ENVIRONMENT==='staging'&&!federationClientConfigured('https://chat.reloo.vn')} reason={reason}/>;}
