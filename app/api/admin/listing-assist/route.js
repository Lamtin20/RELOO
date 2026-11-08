import {requireAccount} from '@/lib/security/authorization';
import {errorResponse} from '@/lib/server/http';
import {listingAssistMetrics} from '@/lib/listing-ai/usage';
import {productSearchConfiguration} from '@/lib/listing-ai/search';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 try{
  await requireAccount(request,{admin:true});
  return Response.json({ok:true,metrics:listingAssistMetrics(),search:productSearchConfiguration()},{headers:{'Cache-Control':'private,no-store','X-Robots-Tag':'noindex'}});
 }catch(error){return errorResponse(error);}
}
