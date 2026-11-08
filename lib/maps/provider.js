import {downloadImage} from '../images/import-source.js';
import {resourceUrl,mapConfiguration} from './config.js';
import {coordinate} from './spatial.js';
import {selfHostedBytes} from './self-hosted.js';
export function proxyResource(raw){const url=new URL(raw);for(const name of [...url.searchParams.keys()])if(/^(key|api_key|apikey|access_token|token)$/i.test(name)||name===process.env.RELOO_MAP_KEY_PARAMETER)url.searchParams.delete(name);return '/api/maps/resource?url='+encodeURIComponent(url.href.replace(/%7B/gi,'{').replace(/%7D/gi,'}')).replaceAll('%7B','{').replaceAll('%7D','}');}
export function rewriteStyle(input,base,env=process.env){
 const style=structuredClone(input);if(style.version!==8||!style.sources||!Array.isArray(style.layers))throw Error('MAP_STYLE_INVALID');
 const proxy=raw=>proxyResource(resourceUrl(new URL(raw,base).href,env).href);
 for(const source of Object.values(style.sources)){
  if(source.url)source.url=proxy(source.url);
  if(source.tiles)source.tiles=source.tiles.map(proxy);
  // Provider GeoJSON must not fetch arbitrary third-party data behind the browser.
  if(source.type==='geojson'&&typeof source.data==='string')source.data=proxy(source.data);
 }
 if(style.glyphs)style.glyphs=proxy(style.glyphs);
 if(typeof style.sprite==='string')style.sprite=proxy(style.sprite);
 else if(Array.isArray(style.sprite))style.sprite=style.sprite.map(s=>({...s,url:proxy(s.url)}));
 delete style.terrain; // Terrain is optional; explicit 3D buildings are a separate UI control.
 return style;
}
export async function providerBytes(raw,{env=process.env,purpose='resource'}={}){
 if(!mapConfiguration(env).enabled)throw Error('MAP_PROVIDER_UNAVAILABLE');
 if(env.RELOO_MAP_MODE==='self-hosted')return selfHostedBytes(raw,{purpose});
 const url=resourceUrl(raw,env);
 if(env.RELOO_MAP_API_KEY){const name=env.RELOO_MAP_KEY_PARAMETER||'key';if(!/^[a-zA-Z_]{1,30}$/.test(name))throw Error('MAP_CONFIG_INVALID');url.searchParams.set(name,env.RELOO_MAP_API_KEY);}
 const hosts=(env.RELOO_MAP_RESOURCE_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean);
 return downloadImage(url.href,0,hosts,{userAgent:'RELOO-LiveMap/1.0 (+https://reloo.vn)'});
}
export async function placeSearch(input,{env=process.env}={}){
 const endpoint=input.reverse===true?env.RELOO_MAP_REVERSE_URL:env.RELOO_MAP_GEOCODE_URL;
 if(env.RELOO_MAP_PROVIDER_APPROVED!=='1'||!endpoint)throw Error('MAP_GEOCODING_UNAVAILABLE');
 const url=resourceUrl(endpoint,env);
 if(input.reverse===true){const point=coordinate(input.coords);url.searchParams.set('lat',String(point.lat));url.searchParams.set('lon',String(point.lng));}
 else{const q=typeof input.q==='string'?input.q.trim():'';if(q.length<3||q.length>150||/[\u0000-\u001f]/.test(q))throw Error('MAP_QUERY_INVALID');url.searchParams.set('q',q);}
 url.searchParams.set('limit','5');url.searchParams.set('language',input.locale==='en-US'?'en':'vi');
 // This adapter uses the same pinned downloader; provider must return GeoJSON.
 const bytes=await providerBytes(url.href,{env,purpose:'geocoding'});const json=JSON.parse(bytes.toString('utf8'));
 if(json.type!=='FeatureCollection'||!Array.isArray(json.features))throw Error('MAP_GEOCODER_FORMAT');
 return json.features.slice(0,5).filter(f=>f.geometry?.type==='Point'&&f.geometry.coordinates?.length===2&&f.geometry.coordinates.every(Number.isFinite)&&Math.abs(f.geometry.coordinates[0])<=180&&Math.abs(f.geometry.coordinates[1])<=85).map(f=>({label:String(f.properties?.label||[f.properties?.name,[f.properties?.housenumber,f.properties?.street].filter(Boolean).join(' '),f.properties?.city,f.properties?.state,f.properties?.country].filter(Boolean).join(', ')).slice(0,250),coords:{lng:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]}})).filter(place=>place.label);
}
