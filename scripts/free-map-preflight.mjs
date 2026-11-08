// Run inside the backend network after preparing data/services in staging.
// Read-only: this does not set the provider-ready flag or deploy anything.
import {selfHostedBytes} from '../lib/maps/self-hosted.js';
const checks=[];
for(const [name,url,purpose] of [
 ['vector-tile','https://maps.reloo.internal/tiles/12/3262/1924.pbf','resource'],
 ['font','https://maps.reloo.internal/fonts/Noto%20Sans%20Regular/0-255.pbf','resource'],
 ['geocode','https://maps.reloo.internal/geocode?q=Ho%20Chi%20Minh&limit=1','geocoding'],
 ['reverse','https://maps.reloo.internal/reverse?lat=10.77&lon=106.7&limit=1','geocoding'],
 ['driving','https://maps.reloo.internal/route/v1/driving/106.7,10.77;106.71,10.78','routing']
]){
 const start=Date.now();try{const bytes=await selfHostedBytes(url,{purpose});const json=purpose!=='resource'?JSON.parse(bytes):null;checks.push({name,status:bytes.length>0&&(!json||json.type==='FeatureCollection'&&json.features?.length>0||json.code==='Ok')?'PASS':'FAIL',bytes:bytes.length,durationMs:Date.now()-start});}catch{checks.push({name,status:'NOT_READY',durationMs:Date.now()-start});}
}
console.log(JSON.stringify({scope:'Private self-hosted services only; not load/accuracy/legal approval',checks},null,2));if(checks.some(c=>c.status!=='PASS'))process.exitCode=1;
