import {AgentOffice} from '@/components/agent-office/AgentOffice';
import {headers} from 'next/headers';
export const metadata={title:'RELOO · Văn phòng AI',robots:{index:false,follow:false}};
export default async function Page(){const host=(await headers()).get('host')?.split(':')[0];return <AgentOffice loginHref={host==='agent.reloo.vn'?'/agent-office/login':'/crm/login?next=/agent-office'} crmOrigin={process.env.CRM_ORIGIN==='https://staging.reloo.vn'?'https://staging.reloo.vn':'https://crm.reloo.vn'}/>;}
