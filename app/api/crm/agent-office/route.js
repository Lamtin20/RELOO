import {requireCrmAccess} from '@/lib/operations/crm-auth';
import {isFullCrmRole} from '@/lib/operations/access';
import {HttpError,errorResponse} from '@/lib/server/http';
import {readOffice} from '@/lib/agent-office/adapter';
export async function GET(request){try{
  const account=await requireCrmAccess(request);
  if(!isFullCrmRole(account.staff.role))throw new HttpError(403,'Chỉ quản trị viên được truy cập văn phòng AI.','OFFICE_ACCESS_DENIED');
  return Response.json({ok:true,...await readOffice()},{headers:{'Cache-Control':'no-store'}});
}catch(e){return errorResponse(e)}}
