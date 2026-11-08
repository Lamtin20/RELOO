import {requireAccount} from '@/lib/security/authorization';
import {assertOrigin,errorResponse,HttpError,rateLimit,readMultipart} from '@/lib/server/http';
import {encodeWebp} from '@/lib/images/webp';
export async function POST(request){
 try{
  assertOrigin(request);rateLimit(request,'image-optimize',30);
  await requireAccount(request,{scope:'listing_write'});
  const form=await readMultipart(request,16000000),file=form.get('file');
  if(!file||typeof file.arrayBuffer!=='function'||file.size>15*1024*1024)throw new HttpError(400,'Ảnh tối đa 15 MB.');
  const image=await encodeWebp(Buffer.from(await file.arrayBuffer()));
  return new Response(image.data,{headers:{'Content-Type':'image/webp','Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){return errorResponse(error);}
}
