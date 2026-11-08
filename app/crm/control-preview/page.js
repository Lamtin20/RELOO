import {notFound} from 'next/navigation';
import ControlCenter from '@/components/owner/ControlCenter';
import {CONTROL_SOURCES,CONTROL_LINKS} from '@/lib/operations/control-center';
export const dynamic='force-dynamic';
export default async function ControlPreview({searchParams}){
 if(process.env.NODE_ENV!=='development')notFound();
 const params=await searchParams;
 const data={generatedAt:new Date().toISOString(),schemaVersion:1,links:CONTROL_LINKS,nodes:CONTROL_SOURCES.map((s,i)=>({...s,windowHours:s.time?24:null,status:i===2?'attention':i===4?'unavailable':'observed',metrics:i===4?null:{observed:[143,28,12,31,0,6][i],running:i===1?2:0,waiting:i===1?4:0,failed:i===2?1:0,p95:i===0?186:null,lastActivity:new Date().toISOString()},capped:false}))};
 return <main style={{maxWidth:1700,margin:'24px auto',padding:'0 16px'}}><ControlCenter locale={params.lang==='en-US'?'en-US':'vi-VN'} previewData={data} previewLive={params.live==='1'}/></main>;
}
