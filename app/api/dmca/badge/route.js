import {NextResponse} from 'next/server';
import {dmcaCertificate,dmcaPageCertificate} from '@/lib/content/dmca';
import {encodeWebp} from '@/lib/images/webp';
import {rateLimit} from '@/lib/server/http';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export const runtime='nodejs';
const cache=new Map();
export async function GET(request){
 const id=process.env.RELOO_DMCA_PROTECTION_ID,certificate=dmcaCertificate(id,process.env.RELOO_DMCA_REGISTRATION_CONFIRMED),path=new URL(request.url).searchParams.get('path');
 if(!certificate||!path||path.length>300||!/^\/[a-zA-Z0-9/_%-]*$/.test(path)||!dmcaPageCertificate(certificate,path))return new Response(null,{status:404});
 let decoded;try{decoded=decodeURIComponent(path);}catch{return new Response(null,{status:404});}
 if(/[\\?#\u0000-\u001f]/.test(decoded)||!dmcaPageCertificate(certificate,decoded))return new Response(null,{status:404});
 const headers={'Content-Type':'image/webp','Cache-Control':'public, max-age=43200, s-maxage=43200','X-Content-Type-Options':'nosniff'};
 const hit=cache.get(path);if(hit&&hit.expires>Date.now())return new Response(hit.bytes,{headers});
 try{
  rateLimit(request,'dmca-badge',20,60000);
  // Only real public RELOO URLs may trigger the vendor's free badge/indexing request.
  const canonical='https://reloo.vn'+path;
  const exists=await fetch(canonical,{method:'HEAD',redirect:'manual',headers:{'User-Agent':'RELOO-DMCA-Badge/1.0'},signal:AbortSignal.timeout(6000)});
  if(exists.status!==200)return new Response(null,{status:404});
  const upstream=await fetch('https://images.dmca.com/Badges/dmca-badge-w100-5x1-09.png?ID='+id,{headers:{Referer:canonical,'User-Agent':'RELOO-DMCA-Badge/1.0'},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!upstream.ok||!/^image\/(png|webp)/i.test(upstream.headers.get('content-type')||'')||Number(upstream.headers.get('content-length'))>65536)throw Error('BADGE_UNAVAILABLE');
  const input=Buffer.from(await upstream.arrayBuffer());if(input.length>65536)throw Error('BADGE_TOO_LARGE');
  const encoded=await encodeWebp(input,{maxEdge:240,maxBytes:24000});
  if(cache.size>=1000)cache.delete(cache.keys().next().value);cache.set(path,{bytes:encoded.data,expires:Date.now()+43200000});
  return new NextResponse(encoded.data,{headers});
 }catch{
  // A provider outage never prevents the public page from rendering its status link.
  const bytes=await readFile(join(process.cwd(),'public/images/dmca-badge-w100-5x1-09.webp'));
  return new Response(bytes,{headers:{...headers,'Cache-Control':'public, max-age=60','X-Reloo-DMCA':'provider-unavailable'}});
 }
}
