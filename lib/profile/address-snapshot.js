import {readFile,stat} from 'node:fs/promises';
export function validateAddressSnapshot(data,{now=Date.now()}={}){
 if(data?.schemaVersion!==1||data.source!=='https://provinces.open-api.vn/api/v2')throw Error('ADDRESS_SNAPSHOT_INVALID');
 const at=Date.parse(data.fetchedAt);if(!Number.isFinite(at)||at>now+60000||now-at>7*86400000)throw Error('ADDRESS_SNAPSHOT_EXPIRED');
 const valid=rows=>Array.isArray(rows)&&rows.length>0&&rows.length<=4000&&rows.every(r=>Number.isInteger(r.code)&&typeof r.name==='string'&&r.name.trim()&&r.name.length<=200)&&new Set(rows.map(r=>r.code)).size===rows.length;
 if(!valid(data.provinces)||!data.wardsByProvince||typeof data.wardsByProvince!=='object')throw Error('ADDRESS_SNAPSHOT_INVALID');
 for(const p of data.provinces)if(!valid(data.wardsByProvince[p.code]))throw Error('ADDRESS_SNAPSHOT_INVALID');
 return data;
}
export async function snapshotAddressCatalog(file,path){
 const info=await stat(file);if(!info.isFile()||info.size>5000000)throw Error('ADDRESS_SNAPSHOT_INVALID');
 const data=validateAddressSnapshot(JSON.parse(await readFile(file,'utf8')));
 if(path==='p/')return data.provinces;
 const match=path.match(/^w\/\?province=(\d+)$/);if(!match||!Object.hasOwn(data.wardsByProvince,match[1]))throw Error('ADDRESS_SNAPSHOT_INVALID');
 return data.wardsByProvince[match[1]];
}
