import {requireAccount} from '@/lib/security/authorization';
import {errorResponse,rateLimit} from '@/lib/server/http';
import {readAccountCounts} from '@/lib/dashboard/counts';
export async function GET(request){try{const {db,profile}=await requireAccount(request,{active:false});rateLimit(request,'dashboard-counts:'+profile.id,15,60000);return Response.json(await readAccountCounts(db,profile.id),{headers:{'Cache-Control':'private,no-store'}});}catch(e){return errorResponse(e);}}
