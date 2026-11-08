import {readFile,stat,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {requireAccount} from '@/lib/security/authorization';
import {errorResponse,HttpError} from '@/lib/server/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 try{
  await requireAccount(request,{admin:true});
  const path=resolve(process.cwd(),'output/compliance/latest.json');
  const info=await stat(path).catch(()=>null);if(!info||info.size>10000000)throw new HttpError(503,'Chưa có báo cáo Guardian.','COMPLIANCE_REPORT_UNAVAILABLE');
  const report=JSON.parse(await readFile(path,'utf8'));
  const names=(await readdir(resolve(process.cwd(),'output/compliance'))).filter(n=>/^report-[\dTZ-]+\.json$/.test(n)).sort().reverse().slice(0,12);
  const history=await Promise.all(names.map(async name=>{try{const file=resolve(process.cwd(),'output/compliance',name),s=await stat(file);if(s.size>10000000)return null;const r=JSON.parse(await readFile(file,'utf8'));return {at:r.at,sourceHash:r.sourceHash,status:r.gate.status,findings:r.findings.length}}catch{return null}}));
  return Response.json({...report,history:history.filter(Boolean)},{headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}});
 }catch(e){return errorResponse(e)}
}
