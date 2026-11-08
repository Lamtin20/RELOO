// Downloads only public regional artifacts into an ignored local directory.
// It never starts services, modifies production or imports into an existing index.
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createWriteStream,createReadStream} from 'node:fs';
const root=resolve(process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'output/free-maps/photon');
await mkdir(root,{recursive:true});
const artifacts=[
 {name:'photon-1.3.0.jar',url:'https://github.com/komoot/photon/releases/download/1.3.0/photon-1.3.0.jar',sha256:'a89707c0045e4807b2a1180e132e68e108d998709f48b6c94b98a6e281f571a5'},
 {name:'vietnam-261101.jsonl.zst',url:'https://download1.graphhopper.com/public/asia/vietnam/photon-dump-vietnam-release-261101.jsonl.zst',sha256:'8250eb02f84a9bf024259f2c5016d69b3e9e50c64e227d029c253991836be726'}
];
for(const item of artifacts){
 const path=join(root,item.name);
 if(!await stat(path).catch(()=>null)){
  const r=await fetch(item.url,{signal:AbortSignal.timeout(300000)});if(!r.ok||Number(r.headers.get('content-length'))>120000000)throw Error('ARTIFACT_DOWNLOAD_FAILED');
  await pipeline(Readable.fromWeb(r.body),createWriteStream(path,{flags:'wx'}));
 }
 const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);if(hash.digest('hex')!==item.sha256)throw Error('CHECKSUM_MISMATCH: '+item.name);
 console.log(item.name+': verified');
}
await writeFile(join(root,'artifact-manifest.json'),JSON.stringify({artifacts,license:'Photon Apache-2.0; regional OSM data ODbL-1.0, OpenStreetMap contributors',activation:'NOT_STARTED'},null,2));
console.log('Artifacts only. A fresh isolated index and resource preflight are required before import.');
