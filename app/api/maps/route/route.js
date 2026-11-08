import {assertOrigin,readJson,rateLimit,errorResponse,HttpError} from '@/lib/server/http';
import {coordinate} from '@/lib/maps/spatial';
import {providerBytes} from '@/lib/maps/provider';
import {resourceUrl} from '@/lib/maps/config';
export async function POST(request){try{
 assertOrigin(request);rateLimit(request,'map-routing',10);const input=await readJson(request,1500);
 let from,to;try{from=coordinate(input.from);to=coordinate(input.to);}catch{throw new HttpError(400,'Kiểm tra điểm đi và đến.','MAP_COORDINATE_INVALID');}
 if(!['driving','walking'].includes(input.mode))throw new HttpError(400,'Phương tiện chưa được hỗ trợ.','MAP_MODE_INVALID');
 const endpoint=input.mode==='walking'?process.env.RELOO_MAP_WALK_ROUTE_URL:process.env.RELOO_MAP_ROUTE_URL;
 if(!endpoint)throw new HttpError(503,'Chưa cấu hình dịch vụ chỉ đường.','MAP_ROUTING_UNAVAILABLE');
 const url=resourceUrl(endpoint);url.pathname=url.pathname.replace(/\/$/,'')+'/'+from.lng+','+from.lat+';'+to.lng+','+to.lat;url.searchParams.set('overview','simplified');url.searchParams.set('geometries','geojson');
 const data=JSON.parse((await providerBytes(url.href,{purpose:'routing'})).toString('utf8')),route=data.routes?.[0];
 if(data.code!=='Ok'||!Number.isFinite(route?.distance)||!Number.isFinite(route?.duration)||route.geometry?.type!=='LineString'||!Array.isArray(route.geometry.coordinates)||route.geometry.coordinates.length>10000)throw Error('ROUTE_UNAVAILABLE');
 for(const point of route.geometry.coordinates)coordinate({lng:point[0],lat:point[1]});
 return Response.json({ok:true,geometry:route.geometry,distanceMeters:route.distance,durationSeconds:route.duration,liveTraffic:false,approximateDestination:input.approximateDestination!==false},{headers:{'Cache-Control':'private,no-store'}});
 }catch(error){return errorResponse(error instanceof HttpError?error:new HttpError(503,'Chưa tìm được tuyến đường.','MAP_ROUTING_UNAVAILABLE'));}}
