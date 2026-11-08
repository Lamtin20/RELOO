// Authorized, isolated production-image benchmark. Never targets public write APIs.
import {connect} from './laptop-ssh.mjs';
import net from 'node:net';
import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const output='output/capacity';await fs.mkdir(output,{recursive:true});
const c=await connect(process.env.RELOO_BUILD_PUBLISH_PASSWORD);
let server,aborted=false;
const report={startedAt:new Date().toISOString(),mode:'isolated production image, same host/shared PostgreSQL engine, synthetic-only database',thinkTimeMs:2000,stages:[],samples:[],slo:{p95Ms:3000,errorRate:0.01},exclusions:['browser JS/layout/image downloads','Socket.io fanout','payment','email/push','AI generation','public Cloudflare edge'],stopReason:null};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const percentile=(values,q)=>{const v=[...values].sort((a,b)=>a-b);return Math.round(v[Math.max(0,Math.ceil(q*v.length)-1)]||0);};
function summarize(rows,seconds){return {requests:rows.length,bytesReceived:rows.reduce((n,r)=>n+r.bytes,0),rps:+(rows.length/seconds).toFixed(2),p50:percentile(rows.map(r=>r.ms),.5),p95:percentile(rows.map(r=>r.ms),.95),p99:percentile(rows.map(r=>r.ms),.99),errors:rows.filter(r=>!r.ok).length,statuses:rows.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})};}
try{
 const users=JSON.parse((await c.read('/srv/reloo/capacity-test/users.json')).toString());
 const listing=JSON.parse(await fs.readFile(output+'/listing-payload.json','utf8'));
 const target=(await c.exec("docker inspect reloo-capacity-app --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'")).output.trim();
 if(!/^172\.\d+\.\d+\.\d+$/.test(target))throw Error('Private sandbox target required');
 server=net.createServer(s=>c.client.forwardOut('127.0.0.1',0,target,3000,(e,ch)=>{if(e)s.destroy();else{s.pipe(ch).pipe(s);s.on('error',()=>ch.destroy());ch.on('error',()=>s.destroy());}}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 async function observe(){const r=await c.exec("python3 - <<'PY'\nimport json,pathlib,time\nm={p[0].strip(':'):int(p[1]) for p in (x.split() for x in pathlib.Path('/proc/meminfo').read_text().splitlines())}\nprint(json.dumps({'at':time.time(),'load':pathlib.Path('/proc/loadavg').read_text().strip(),'availableMiB':m['MemAvailable']//1024,'swapFreeMiB':m['SwapFree']//1024,'cpu':pathlib.Path('/proc/stat').read_text().splitlines()[0]}))\nPY\ndocker stats --no-stream --format '{{json .}}' reloo-capacity-app reloo-capacity-rest reloo-capacity-auth reloo-vn-db-1 reloo-web-app-1",12000);report.samples.push({at:new Date().toISOString(),data:r.output});const line=r.output.split('\n').find(x=>x.startsWith('{"at"'));if(line&&JSON.parse(line).availableMiB<1800){aborted=true;report.stopReason='Available RAM below 1800 MiB';}return r.output;}
 async function request(kind,i,seq){let path,body;const asset='capacity-asset-'+(i%1000+1);if(kind==='home')path='/';if(kind==='explore')path='/explore';if(kind==='feed')path='/api/db/bootstrap';if(kind==='product')path='/product/'+asset;if(kind==='chat'){path='/api/chat/messages';body={threadId:'capacity-thread-'+(i%200+1),message:{type:'text',text:'CAPACITY TEST '+i+' '+seq}};}if(kind==='listing'){path='/api/listings';body={...listing,title:'CAPACITY TEST '+i+' '+seq};}
 const start=performance.now();let status='NETWORK',ok=false,bytes=0,error;
 try{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{origin:'http://localhost:4538',...(body?{'content-type':'application/json',authorization:'Bearer '+users[i%200+1].token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});status=r.status;const text=await r.text();bytes=Buffer.byteLength(text);ok=r.ok;if(r.ok&&(body||kind==='feed')){const json=JSON.parse(text);ok=json.ok!==false;if(kind==='listing')ok=!!json.listing?.id;if(kind==='chat')ok=!!json.message;}if(!ok)error=text.slice(0,150);}catch(e){error=e.name;}
 return {kind,status,ok,bytes,ms:performance.now()-start,...(error?{error}:{})};}
 // Deterministic 20-action mix: 10% home, 10% explore, 30% feed,
 // 30% product detail, 15% persisted chat, 5% image-encoded listing creation.
 const mix=['home','feed','product','chat','explore','feed','product','listing','feed','product','home','chat','product','feed','explore','product','feed','chat','product','feed'];
 const levels=(process.env.RELOO_CAPACITY_LEVELS||'1,5,10,25,50,100,150,200').split(',').map(Number);
 if(levels.some(n=>!Number.isInteger(n)||n<1||n>1000))throw Error('Levels must be 1..1000; at most 200 distinct test identities, reused across virtual sessions above 200');
 const secondsPerStage=Number(process.env.RELOO_CAPACITY_SECONDS||60);if(!Number.isFinite(secondsPerStage)||secondsPerStage<15||secondsPerStage>600)throw Error('Duration must be 15..600 seconds');
 for(const vus of levels){if(aborted)break;const rows=[],start=performance.now(),duration=Number(process.env.RELOO_CAPACITY_SECONDS||60)*1000;let done=false;console.log('START '+vus+' VU');await observe();const timer=setInterval(()=>observe().catch(()=>{aborted=true;report.stopReason='Monitoring connection failed';}),10000);
 await Promise.all(Array.from({length:vus},async(_,i)=>{let seq=0;await sleep(i*1000/vus);while(performance.now()-start<duration&&!aborted){rows.push(await request(mix[(seq+i)%mix.length],i,seq));seq++;await sleep(2000);}}));clearInterval(timer);const seconds=(performance.now()-start)/1000;const summary=summarize(rows,seconds);summary.startedAt=new Date(Date.now()-seconds*1000).toISOString();summary.vus=vus;summary.seconds=+seconds.toFixed(1);summary.byWorkflow=Object.fromEntries([...new Set(rows.map(x=>x.kind))].map(k=>[k,summarize(rows.filter(x=>x.kind===k),seconds)]));summary.errorExamples=rows.filter(x=>!x.ok).slice(0,5);summary.passed=summary.errors/Math.max(1,summary.requests)<=.01&&summary.p95<=3000&&Object.values(summary.byWorkflow).every(w=>w.p95<=3000&&w.errors/Math.max(1,w.requests)<=.01);report.stages.push(summary);console.log(JSON.stringify(summary));await fs.writeFile(output+'/results.json',JSON.stringify(report,null,2));if(!summary.passed){report.stopReason='SLO breached; did not increase load further';break;}await sleep(5000);
 }
 await observe();report.endedAt=new Date().toISOString();await fs.writeFile(output+'/results.json',JSON.stringify(report,null,2));
}finally{server?.close();c.close();}
