import {requirePermission} from '@/lib/operations/permissions';
import {errorResponse,rateLimit} from '@/lib/server/http';
import {readControlCenter} from '@/lib/operations/control-center';
export const dynamic='force-dynamic';
export async function GET(request){
 try{
    const {db,staff,profile}=await requirePermission(request,'control.read');
    rateLimit(request,'control-center:'+profile.id,12,60000);
  return Response.json(await readControlCenter(db,staff),{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return errorResponse(error);}
}
