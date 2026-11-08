import sharp from 'sharp';
import {HttpError} from '../server/http.js';

export async function encodeWebp(bytes,{maxEdge=1920,quality=84,maxBytes=285000}={}) {
 try {
  const image=sharp(bytes,{limitInputPixels:50000000,failOn:'error'});
  const metadata=await image.metadata();
  if(!['jpeg','png','webp','gif','avif','heif','tiff'].includes(metadata.format))throw Error('UNSUPPORTED_IMAGE');
  if(metadata.format==='webp'&&metadata.width<=maxEdge&&metadata.height<=maxEdge&&bytes.length<=maxBytes&&!(metadata.pages>1)&&!metadata.exif&&!metadata.xmp&&!metadata.iptc&&!metadata.icc){
   return {data:bytes,info:{width:metadata.width,height:metadata.height,format:'webp',size:bytes.length}};
  }
  let result;
  for(let attempt=0;attempt<6;attempt++){
   const edge=Math.max(320,Math.round(maxEdge*Math.pow(.8,attempt)));
   result=await image.clone().rotate().resize({width:edge,height:edge,fit:'inside',withoutEnlargement:true})
    .webp({quality:Math.max(60,quality-attempt*4)}).toBuffer({resolveWithObject:true});
   if(result.data.length<=maxBytes)return result;
  }
  throw Error('IMAGE_TOO_LARGE');
 }catch{throw new HttpError(400,'Không xử lý được ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP hợp lệ.','IMAGE_INVALID');}
}
