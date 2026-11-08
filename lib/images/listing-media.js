import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {MEDIA_ROOT} from '../content/media.js';
import {encodeWebp} from './webp.js';
import {importImageBytes} from './import-source.js';
import {HttpError} from '../server/http.js';

export async function prepareListingImages(images,{db,ownerId,existing=[],purpose='listing'}){
 const created=[];
 async function rollback(){
  for(const {id,path} of created){await db.from('media_assets').delete().eq('id',id);await unlink(path).catch(()=>{});}
 }
 try{
  const urls=[];
  for(const source of images){
   if(existing.includes(source)){urls.push(source);continue;}
   const mediaId=source.match(/^\/api\/media\/([a-f0-9-]{36})$/i)?.[1];
   if(mediaId){
    const {data,error}=await db.from('media_assets').select('mime,created_by').eq('id',mediaId).single();
    if(error||data?.mime!=='image/webp'||data.created_by!==ownerId)throw new HttpError(400,'Ảnh chưa thuộc tài khoản của bạn.');
    urls.push(source);continue;
   }
   const image=await encodeWebp(await importImageBytes(source));
   const id=randomUUID(),path=join(MEDIA_ROOT,id+'.webp');
   await mkdir(MEDIA_ROOT,{recursive:true,mode:0o750});
   await writeFile(path,image.data,{mode:0o640,flag:'wx'});created.push({id,path});
   const {error}=await db.from('media_assets').insert({id,filename:id+'.webp',mime:'image/webp',width:image.info.width,height:image.info.height,bytes:image.data.length,purpose,created_by:ownerId});
   if(error)throw new HttpError(503,'Chưa lưu được ảnh sản phẩm.');
   urls.push('/api/media/'+id);
  }
  return {urls,rollback};
 }catch(error){await rollback();throw error;}
}
