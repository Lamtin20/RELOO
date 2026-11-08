import {providerBytes,proxyResource} from '@/lib/maps/provider';
import {resourceUrl} from '@/lib/maps/config';
import {rateLimit} from '@/lib/server/http';
export async function GET(request){try{
 rateLimit(request,'map-resources',300);const input=new URL(request.url).searchParams.get('url'),url=resourceUrl(input);
 const bytes=await providerBytes(url.href);let body=bytes,type='application/octet-stream';
 if(/\.json$/.test(url.pathname)||bytes.subarray(0,1).toString()==='{'){
  const json=JSON.parse(bytes.toString('utf8'));
  if(json.tiles)json.tiles=json.tiles.map(value=>proxyResource(resourceUrl(new URL(value,url).href).href));
  body=JSON.stringify(json);type='application/json';
 }else if(/\.png$/.test(url.pathname))type='image/png';else if(/\.webp$/.test(url.pathname))type='image/webp';else type='application/x-protobuf';
 return new Response(body,{headers:{'Content-Type':type,'Cache-Control':'private,max-age=300','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:503});}}
