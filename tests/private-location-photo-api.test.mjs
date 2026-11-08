import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import sharp from 'sharp';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdtemp,mkdir,writeFile,unlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {privatePhotoDirectory,privatePhotoPath} from '../lib/maps/private-photo.js';
const root=process.cwd(),http=JSON.stringify(resolve('lib/server/http.js').replaceAll('\\','/'));
async function load(entry){const result=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',packages:'external',write:false,alias:{'@':root},plugins:[{name:'owner-fixture',setup(b){b.onResolve({filter:/security\/authorization$/},()=>({path:'account',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`import {HttpError} from ${http};export async function requireAccount(){if(!globalThis.__privatePhotoOwner)throw new HttpError(401,'Sign in');return {profile:{id:globalThis.__privatePhotoOwner}}}`,resolveDir:root}));}}]});await mkdir('output/test-cache',{recursive:true});const path=resolve('output/test-cache/photo-'+Math.random().toString(16).slice(2)+'.mjs');await writeFile(path,result.outputFiles[0].text);const loaded=await import(pathToFileURL(path));await unlink(path);return loaded;}
const upload=await load('app/api/profile/location-photo/route.js'),asset=await load('app/api/profile/location-photo/[id]/route.js');
test('retired upload returns410 while legacy photos remain owner-only and deletable',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'reloo-photo-api-')),previous=process.env.RELOO_PRIVATE_LOCATION_MEDIA_DIR;process.env.RELOO_PRIVATE_LOCATION_MEDIA_DIR=dir;
 try{
  assert.equal((await upload.POST()).status,410);
  globalThis.__privatePhotoOwner='alice';const id='11111111-1111-4111-8111-111111111111';
  await mkdir(privatePhotoDirectory('alice'),{recursive:true});const bytes=await sharp({create:{width:24,height:24,channels:3,background:'#008050'}}).webp().toBuffer();await writeFile(privatePhotoPath('alice',id),bytes);
  const url='/api/profile/location-photo/'+id,params={params:Promise.resolve({id})};
  const own=await asset.GET(new Request('https://reloo.vn'+url),params);assert.equal(own.status,200);assert.equal(own.headers.get('cache-control'),'private,no-store');
  globalThis.__privatePhotoOwner='bob';assert.equal((await asset.GET(new Request('https://reloo.vn'+url),params)).status,404);
  globalThis.__privatePhotoOwner='alice';assert.equal((await asset.DELETE(new Request('https://reloo.vn'+url,{method:'DELETE',headers:{origin:'https://reloo.vn'}}),params)).status,200);assert.equal((await asset.GET(new Request('https://reloo.vn'+url),params)).status,404);
 }finally{delete globalThis.__privatePhotoOwner;if(previous===undefined)delete process.env.RELOO_PRIVATE_LOCATION_MEDIA_DIR;else process.env.RELOO_PRIVATE_LOCATION_MEDIA_DIR=previous;await rm(dir,{recursive:true,force:true})}
});
