// Read-only release gate. No credentials, cookies, writes or load generation.
import {createHash} from 'node:crypto';
const agents={
  iphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
  android:'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
  desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
};
const result={observedAt:new Date().toISOString(),origin:'https://reloo.vn',clients:[]};
for(const [client,agent] of Object.entries(agents)){
  const read=path=>fetch(result.origin+path,{headers:{'User-Agent':agent,'Cache-Control':'no-cache'},cache:'no-store',signal:AbortSignal.timeout(20000)});
  const page=await read('/'),html=await page.text(),runtime=await read('/api/mobile/runtime'),catalogResponse=await read('/api/db/bootstrap');
  const catalog=await catalogResponse.json(),listings=(catalog.listings||[]).map(({id,ownerId,title,description,category,images,specs,rentalDetails,transactionMode,dailyPrice,salePrice,marketValue,location,locationDetails,condition,status,isLocked,saleStatus,labels,trustBadges})=>({id,ownerId,title,description,category,images,specs,rentalDetails,transactionMode,dailyPrice,salePrice,marketValue,location,locationDetails,condition,status,isLocked,saleStatus,labels,trustBadges})).sort((a,b)=>a.id.localeCompare(b.id));
  const catalogHash=createHash('sha256').update(JSON.stringify(listings)).digest('hex');
  const data=await runtime.json(),build=html.match(/data-reloo-build="([a-zA-Z0-9_-]+)"/)?.[1];
  result.clients.push({client,pageStatus:page.status,runtimeStatus:runtime.status,renderedBuild:build,runtimeBuild:data.build,catalogStatus:catalogResponse.status,catalogCount:listings.length,catalogHash,pageCache:page.headers.get('cache-control'),runtimeCache:runtime.headers.get('cache-control'),cdnCache:page.headers.get('cf-cache-status'),match:page.ok&&runtime.ok&&catalogResponse.ok&&catalog.ok===true&&!!build&&build===data.build&&/no-store/.test(runtime.headers.get('cache-control')||'')});
}
result.passed=result.clients.every(c=>c.match)&&new Set(result.clients.map(c=>c.renderedBuild)).size===1&&new Set(result.clients.map(c=>c.catalogHash)).size===1;
console.log(JSON.stringify(result,null,2));
if(!result.passed)process.exitCode=1;
