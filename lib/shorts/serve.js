import { stat,readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import { securityDb } from '../security/service.js';
import { optionalShortProfile,shortMayView } from './access.js';
import { SHORT_ROOT } from './media.js';
import { parseByteRange } from './validation.js';
import { readShortTicket } from './tickets.js';
export function shortMediaPart(part){const key=part.join('/');return key===''||key==='poster.jpg'||key==='poster.webp'||key==='master.m3u8'||/^(360|720|1080)\/(index\.m3u8|media\.mp4)$/.test(key)?key:null;}
export function rewriteShortManifest(source,base,query,key){
 const directory=key.includes('/')?key.slice(0,key.lastIndexOf('/')+1):'';
 const uri=value=>{const part=directory+value;if(shortMediaPart(part.split('/'))===null)throw Error('INVALID_MANIFEST_URI');return base+'/'+part+'?'+query;};
 return source.split(/\r?\n/).map(line=>{if(line&&line[0]!=='#')return uri(line.trim());return line.replace(/URI="([^"]+)"/g,(_,value)=>'URI="'+uri(value)+'"');}).join('\n');
}
export async function serveShortMedia(request,id,part=[],head=false){try{
 if(!/^[-a-f0-9]{36}$/i.test(id))return new Response(null,{status:404});const key=shortMediaPart(part);if(key===null)return new Response(null,{status:404});
 const db=securityDb(),m=await db.from('short_video_media').select('id,profile_id,filename,status,hls_ready,poster_filename,stream_version').eq('id',id).single();
 if(m.error||m.data.status!=='READY')return new Response(null,{status:404});const v=await db.from('short_videos').select('id,profile_id,status').eq('media_id',id).maybeSingle();if(v.error)return new Response(null,{status:404});
 const params=new URL(request.url).searchParams,token=readShortTicket(params.get('ticket'),'play');let publicAccess=false;
 if(token&&v.data?.status==='PUBLISHED'&&token.mediaId===id&&token.videoId===v.data.id){const r=await db.rpc('reloo_public_short_access',{p_video:v.data.id,p_viewer:token.viewerId});if(r.error)return new Response(null,{status:503});publicAccess=r.data;}
 if(!publicAccess){const profile=await optionalShortProfile(request,db);if(!v.data?profile?.id!==m.data.profile_id:!(await shortMayView(db,v.data,profile,request)))return new Response(null,{status:404});}
 let path,type;
 if(key==='poster.jpg'||key==='poster.webp'){if(![id+'.jpg',id+'.webp'].includes(m.data.poster_filename))return new Response(null,{status:404});path=join(SHORT_ROOT,m.data.poster_filename);type=m.data.poster_filename.endsWith('.webp')?'image/webp':'image/jpeg';}
 else if(key){if(!m.data.hls_ready)return new Response(null,{status:404});const version=Number(params.get('v')||m.data.stream_version);if(![1,2,3].includes(version)||version>m.data.stream_version)return new Response(null,{status:404});path=join(SHORT_ROOT,id,version>=3?'hls-v3':'hls',...part);type=key.endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp4';}
 else {if(m.data.filename!==id+'.mp4')return new Response(null,{status:404});path=join(SHORT_ROOT,m.data.filename);type='video/mp4';}
 const info=await stat(path),headers={'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':publicAccess?'private,max-age=60':'private,no-store','Accept-Ranges':'bytes',ETag:'"'+id+'-'+m.data.stream_version+'-'+key.replaceAll('/','-')+'-'+info.size+'-'+Math.floor(info.mtimeMs)+'"'};
 if(request.headers.get('if-none-match')===headers.ETag&&!request.headers.has('range'))return new Response(null,{status:304,headers});
 if(key.endsWith('.m3u8')){const body=rewriteShortManifest(await readFile(path,'utf8'),'/api/shorts/media/'+id,params.toString(),key);return new Response(head?null:body,{headers:{...headers,'Content-Length':String(Buffer.byteLength(body))}});}
 const range=parseByteRange(request.headers.get('range'),info.size);if(range===false)return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+info.size}});
 headers['Content-Length']=String(range?range.end-range.start+1:info.size);if(range)headers['Content-Range']=`bytes ${range.start}-${range.end}/${info.size}`;
 return new Response(head?null:Readable.toWeb(createReadStream(path,range||{})),{status:range?206:200,headers});
 }catch{return new Response(null,{status:404});}}
