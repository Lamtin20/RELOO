import {mapQuery} from '@/lib/maps/spatial';
import {searchMap} from '@/lib/maps/server';
import {rateLimit,errorResponse,HttpError} from '@/lib/server/http';
export const dynamic='force-dynamic';
export async function GET(request){
 try{rateLimit(request,'map-search',40);let query;try{query=mapQuery(new URL(request.url).searchParams);}catch{throw new HttpError(400,'Kiểm tra khu vực và bộ lọc bản đồ.','MAP_QUERY_INVALID');}
 return Response.json(await searchMap(query),{headers:{'Cache-Control':'no-store'}});
 }catch(error){return errorResponse(error);}
}
