import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {encodeWebp} from '../lib/images/webp.js';
import {importImageBytes,publicImageAddress} from '../lib/images/import-source.js';
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('JPEG, transparent PNG and existing WebP become real bounded WebP images without metadata',async()=>{
 for(const format of ['jpeg','png','webp']){
  const bytes=await sharp({create:{width:2600,height:1300,channels:4,background:{r:32,g:180,b:99,alpha:.4}}})[format]().toBuffer();
  const output=await encodeWebp(bytes);
  const metadata=await sharp(output.data).metadata();
  assert.equal(metadata.format,'webp');assert.equal(metadata.width,1920);assert.equal(metadata.height,960);
  assert.ok(output.data.length<=285000);assert.equal(metadata.exif,undefined);
  if(format==='png')assert.equal(metadata.hasAlpha,true);
 }
});
test('real content is checked; forged image data and SVG are rejected',async()=>{
 await assert.rejects(encodeWebp(Buffer.from('not an image')),error=>error.status===400);
 await assert.rejects(encodeWebp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="5" height="5"/>')),error=>error.status===400);
 await assert.rejects(importImageBytes('data:image/png;base64,!!!!'),error=>error.status===400);
 await assert.rejects(importImageBytes('/images/../../.env.local'),error=>error.status===400);
});
test('remote image imports reject private, loopback, reserved and IPv4-mapped private addresses',()=>{
 for(const address of ['127.0.0.1','10.0.0.1','192.168.1.1','169.254.169.254','::1','fc00::1','::ffff:127.0.0.1','0.0.0.0'])assert.equal(publicImageAddress(address),false,address);
 assert.equal(publicImageAddress('8.8.8.8'),true);assert.equal(publicImageAddress('2606:4700:4700::1111'),true);
});
test('listing import stores cacheable WebP files and cleans them up if saving the listing fails',async()=>{
 const root=await mkdtemp(join(tmpdir(),'reloo-webp-test-'));
 process.env.RELOO_MEDIA_DIR=root;
 const {prepareListingImages}=await import('../lib/images/listing-media.js');
 const records=new Map();
 const db={from:()=>({insert:async row=>{records.set(row.id,row);return {error:null};},delete:()=>({eq:async(_key,id)=>{records.delete(id);return {error:null};}})})};
 try{
  const png=await sharp({create:{width:120,height:80,channels:4,background:'#12345680'}}).png().toBuffer();
  const result=await prepareListingImages(['data:image/png;base64,'+png.toString('base64')],{db,ownerId:'owner'});
  assert.match(result.urls[0],/^\/api\/media\/[a-f0-9-]{36}$/);
  const row=[...records.values()][0];assert.equal(row.mime,'image/webp');assert.equal(row.created_by,'owner');
  assert.equal((await sharp(await readFile(join(root,row.filename))).metadata()).format,'webp');
  await result.rollback();assert.equal(records.size,0);assert.deepEqual(await readdir(root),[]);
  await assert.rejects(prepareListingImages(['data:image/png;base64,'+png.toString('base64'),'data:image/png;base64,bm90YW5pbWFnZQ=='],{db,ownerId:'owner'}));
  assert.equal(records.size,0);assert.deepEqual(await readdir(root),[]);
 }finally{delete process.env.RELOO_MEDIA_DIR;await rm(root,{recursive:true,force:true});}
});
