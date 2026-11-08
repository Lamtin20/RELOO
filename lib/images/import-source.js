import {request} from 'node:https';
import {lookup} from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {HttpError} from '../server/http.js';

export function publicImageAddress(address){
 try{return ipaddr.process(address).range()==='unicast';}catch{return false;}
}
export async function downloadImage(source,redirects=0,allowedHosts=null,{allowNotFound=false,userAgent=null}={}){
 const url=new URL(source);
 if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||redirects>2||(allowedHosts&&!allowedHosts.includes(url.hostname)))
  throw new HttpError(400,'Đường dẫn ảnh không hợp lệ.');
 const addresses=await lookup(url.hostname.replace(/^\[|\]$/g,''),{all:true});
 if(!addresses.length||addresses.some(item=>!publicImageAddress(item.address)))throw new HttpError(400,'Đường dẫn ảnh không được phép.');
 const pinned=addresses[0];
 return new Promise((resolveResult,reject)=>{
  const req=request(url,{...(userAgent?{headers:{'User-Agent':userAgent}}:{}),lookup:(_host,options,callback)=>options.all?callback(null,[pinned]):callback(null,pinned.address,pinned.family)},res=>{
   if([301,302,303,307,308].includes(res.statusCode)&&res.headers.location){res.resume();downloadImage(new URL(res.headers.location,url).href,redirects+1,allowedHosts,{allowNotFound,userAgent}).then(resolveResult,reject);return;}
   if(allowNotFound&&res.statusCode===404){res.resume();resolveResult(Buffer.alloc(0));return;}
   if(res.statusCode!==200){res.resume();reject(new HttpError(400,'Không tải được ảnh từ đường dẫn đã nhập.'));return;}
   let size=0;const chunks=[];
   res.on('data',chunk=>{size+=chunk.length;if(size>8000000){req.destroy(new HttpError(413,'Ảnh nhập tối đa 8 MB.'));return;}chunks.push(chunk);});
   res.on('end',()=>resolveResult(Buffer.concat(chunks)));res.on('error',reject);
  });
  const timer=setTimeout(()=>req.destroy(new HttpError(408,'Tải ảnh quá lâu. Hãy tải ảnh từ thiết bị.')),12000);
  req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();
 });
}
export async function importImageBytes(source){
 if(source.startsWith('data:')){
  if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(source))throw new HttpError(400,'Dữ liệu ảnh không hợp lệ.');
  return Buffer.from(source.slice(source.indexOf(',')+1),'base64');
 }
 if(source.startsWith('https://'))return downloadImage(source);
 const root=resolve('public'),path=resolve(root,'.'+decodeURIComponent(source));
 if(!path.startsWith(root+sep)||!/^\/(images|brand|mascot)\//.test(source))throw new HttpError(400,'Đường dẫn ảnh không hợp lệ.');
 if((await stat(path)).size>8000000)throw new HttpError(413,'Ảnh nhập tối đa 8 MB.');
 return readFile(path);
}
