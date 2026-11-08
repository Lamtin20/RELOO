import {securityDb} from '@/lib/security/service';
import {agentListing} from '@/lib/agent/catalog';
import {errorResponse,HttpError,rateLimit} from '@/lib/server/http';
export const dynamic='force-dynamic';
export async function GET(request,{params}){try{
 rateLimit(request,'agent-catalog',60);const {id}=await params;
 if(!/^[a-zA-Z0-9_-]{1,150}$/.test(id||''))throw new HttpError(400,'INVALID_ID','INVALID_ID');
 const {data,error}=await securityDb().from('assets').select('*').eq('id',id).maybeSingle();
 if(error)throw new HttpError(503,'CATALOG_UNAVAILABLE','CATALOG_UNAVAILABLE');
 const item=agentListing(data);if(!item)throw new HttpError(404,'LISTING_UNAVAILABLE','LISTING_UNAVAILABLE');
 return Response.json({schemaVersion:1,item},{headers:{'Cache-Control':'no-store'}});
}catch(e){return errorResponse(e)}}
