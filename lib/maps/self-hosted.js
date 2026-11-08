import {readFile} from 'node:fs/promises';
const VIRTUAL='https://maps.reloo.internal';
export function selfHostedTarget(raw,purpose='resource'){
 const url=new URL(raw);if(url.origin!==VIRTUAL||url.username||url.password||url.hash)throw Error('MAP_SELF_HOSTED_URL_INVALID');
 const path=decodeURIComponent(url.pathname);
 if(url.pathname==='/style.json'&&purpose==='resource')return {file:'lib/maps/free-style.json'};
 const tile=url.pathname.match(/^\/tiles\/(\d{1,2})\/(\d{1,9})\/(\d{1,9})\.pbf$/);
 if(tile&&purpose==='resource'){
  const [z,x,y]=tile.slice(1).map(Number);if(z>16||x>=2**z||y>=2**z)throw Error('MAP_TILE_INVALID');
  return {url:`http://map-tiles:3000/vietnam/${z}/${x}/${y}`};
 }
 const font=path.match(/^\/fonts\/([A-Za-z0-9 ,_-]{1,120})\/(\d{1,7}-\d{1,7})\.pbf$/);
 if(font&&purpose==='resource'){const [start,end]=font[2].split('-').map(Number);if(start%256!==0||end-start!==255||end>1114111)throw Error('MAP_FONT_RANGE_INVALID');return {url:'http://map-tiles:3000/font/'+encodeURIComponent(font[1])+'/'+font[2]};}
 if(['/geocode','/reverse'].includes(url.pathname)&&purpose==='geocoding'){
  const target=new URL('http://map-geocoder:2322'+(url.pathname==='/geocode'?'/api/':'/reverse'));
  for(const key of ['q','lat','lon','limit'])if(url.searchParams.has(key))target.searchParams.set(key,url.searchParams.get(key));
  if(url.searchParams.get('language')==='en')target.searchParams.set('lang','en');return {url:target.href};
 }
 if(purpose==='routing'&&/^\/route\/v1\/driving\/[-\d.,;]+$/.test(url.pathname)){
  const target=new URL('http://map-router:5000'+url.pathname);target.searchParams.set('overview','simplified');target.searchParams.set('geometries','geojson');return {url:target.href};
 }
 throw Error('MAP_SELF_HOSTED_PATH_DENIED');
}
export async function selfHostedBytes(raw,{purpose='resource',fetchImpl=fetch}={}){
 const target=selfHostedTarget(raw,purpose);if(target.file)return readFile(target.file);
 if(purpose==='geocoding'&&process.env.RELOO_PHOTON_ACTIVE_STATE){
  const data=await readFile(process.env.RELOO_PHOTON_ACTIVE_STATE);if(data.length>16000)throw Error('PHOTON_STATE_INVALID');
  const state=JSON.parse(data.toString());
  if(state.schemaVersion!==1||!['a','b'].includes(state.slot)||!/^[a-f0-9]{64}$/.test(state.sha256))throw Error('PHOTON_STATE_INVALID');
  const selected=new URL(target.url);selected.hostname=`map-geocoder-${state.slot}`;target.url=selected.href;
 }
 const response=await fetchImpl(target.url,{redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('MAP_SELF_HOSTED_UNAVAILABLE');
 const reader=response.body?.getReader();if(!reader)throw Error('MAP_SELF_HOSTED_UNAVAILABLE');const chunks=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>8000000){await reader.cancel();throw Error('MAP_RESOURCE_TOO_LARGE');}chunks.push(value)}
 return Buffer.concat(chunks);
}
