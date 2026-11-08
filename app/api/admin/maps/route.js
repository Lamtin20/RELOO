import {photonUpdateStatus} from '@/lib/maps/photon-status';
import {requireAccount} from '@/lib/security/authorization';
import {errorResponse} from '@/lib/server/http';
import {mapConfiguration} from '@/lib/maps/config';
export async function GET(request){try{const {db}=await requireAccount(request,{admin:true});const result=await db.from('reloo_map_features').select('domain,visible',{count:'exact',head:true});return Response.json({ok:true,configuration:mapConfiguration(),projectedFeatures:result.error?null:result.count,databaseReady:!result.error,backgroundTracking:false,photonUpdate:await photonUpdateStatus()},{headers:{'Cache-Control':'private,no-store'}});}catch(error){return errorResponse(error);}}
