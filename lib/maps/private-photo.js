import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {readdir,lstat,unlink,rmdir} from 'node:fs/promises';
export function privatePhotoDirectory(ownerId){return join(process.env.RELOO_PRIVATE_LOCATION_MEDIA_DIR||join(process.cwd(),'data','private-location-media'),createHash('sha256').update(ownerId).digest('hex'));}
export function privatePhotoPath(ownerId,id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('PHOTO_INVALID');return join(privatePhotoDirectory(ownerId),id+'.webp');}
export async function deletePrivateLocationPhotos(ownerId){
 const dir=privatePhotoDirectory(ownerId);let info;try{info=await lstat(dir)}catch(e){if(e.code==='ENOENT')return;throw e}
 if(info.isSymbolicLink()||!info.isDirectory())throw Error('PRIVATE_PHOTO_DIRECTORY_INVALID');
 for(const name of await readdir(dir)){if(!/^[a-f0-9-]{36}\.webp$/.test(name))throw Error('PRIVATE_PHOTO_FILENAME_INVALID');await unlink(join(dir,name));}
 await rmdir(dir);
}
