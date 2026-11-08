import {securityDb} from '@/lib/security/service';
import {catalogInput,catalogPage} from '@/lib/agent/catalog';
import {errorResponse,HttpError,rateLimit} from '@/lib/server/http';
export const dynamic='force-dynamic';
export async function GET(request){try{
 rateLimit(request,'agent-catalog',60);
 let input;try{input=catalogInput(new URL(request.url).searchParams)}catch{throw new HttpError(400,'INVALID_QUERY','INVALID_QUERY')}
 let query=securityDb().from('assets').select('*').in('status',['available','rented']).eq('is_locked',false).order('id',{ascending:true}).limit(input.limit+1);
 if(input.after)query=query.gt('id',input.after);
 if(input.q)query=query.ilike('title','%'+input.q+'%');
 if(input.category)query=query.eq('category',input.category);
 const {data,error}=await query;if(error)throw new HttpError(503,'CATALOG_UNAVAILABLE','CATALOG_UNAVAILABLE');
 return Response.json(catalogPage(data||[],input.limit),{headers:{'Cache-Control':'no-store'}});
}catch(e){return errorResponse(e)}}
