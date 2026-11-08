// Ephemeral loopback PostgreSQL only. No production environment is loaded.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'node:net';
import {randomBytes,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import {createNeighborhoodFixture,IDS} from '../tests/neighborhood-fixture.mjs';
const run=promisify(execFile),binary=resolve('output/neighborhood-tools/postgres/pgsql/bin');
const directory=resolve('output/neighborhood-test','postgres-'+Date.now());await mkdir(directory,{recursive:true});
const data=join(directory,'data'),password=randomBytes(32).toString('hex'),pwfile=join(directory,'init-password.txt');await writeFile(pwfile,password,{mode:0o600});
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
let pool,one,two,started=false;const checks=[];
const args={host:'127.0.0.1',port,user:'postgres',password,database:'postgres',connectionTimeoutMillis:5000};
const start=new Date(Date.now()+3*86400000).toISOString(),end=new Date(Date.now()+4*86400000).toISOString();
async function action(client,actor,kind,payload,key=randomUUID()){return (await client.query('select reloo_neighborhood_action($1,$2,$3,$4::jsonb) r',[actor,key,kind,JSON.stringify(payload)])).rows[0].r;}
async function quote(actor,asset='nk-test-drill',promotion=''){return (await pool.query('select reloo_neighborhood_read($1,$2,$3::jsonb) r',[actor,'quote',JSON.stringify({area:IDS.area,asset,start,end,promotion})])).rows[0].r.quote;}
function booking(q,asset='nk-test-drill',promotion=''){return {asset,start,end,promotion,total:q.total,policyVersion:q.policyVersion,listingVersion:q.listingVersion,agreed:true};}
async function contend(name,first,second,expected){
 await one.query('begin');await two.query('begin');const firstResult=await first(one);
 const secondPid=(await two.query('select pg_backend_pid() pid')).rows[0].pid;
 const result=second(two).then(value=>({value}),error=>({error}));
 await new Promise(r=>setTimeout(r,250));
 const wait=(await pool.query('select wait_event_type,wait_event,state from pg_stat_activity where pid=$1',[secondPid])).rows[0];
 assert.equal(wait.wait_event_type,'Lock',name+' must actually wait on a PostgreSQL lock');
 await one.query('commit');const other=await result;
 if(expected==='SAME_ID'){assert.equal(other.value?.id,firstResult.id);await two.query('commit');}
 else {assert.ok(other.error?.message.includes(expected),name+': '+other.error?.message);await two.query('rollback');}
 checks.push({name,result:'PASS',separateConnections:true,observedWait:wait.wait_event});console.log('PASS',name);
 return firstResult;
}
try{
 await run(join(binary,'initdb.exe'),['-D',data,'--encoding=UTF8','--locale=C','--username=postgres','--auth=scram-sha-256','--pwfile='+pwfile],{windowsHide:true,timeout:20000});
 await run(join(binary,'pg_ctl.exe'),['-D',data,'-l',join(directory,'postgres.log'),'-o','-h 127.0.0.1 -p '+port+' -c max_connections=20 -c shared_buffers=32MB','-w','start'],{windowsHide:true,timeout:20000});started=true;
 pool=new pg.Pool({...args,max:3});one=new pg.Client(args);two=new pg.Client(args);await one.connect();await two.connect();
 await createNeighborhoodFixture(undefined,{exec:sql=>pool.query(sql),query:(sql,values)=>pool.query(sql,values)});
 assert.equal((await pool.query("select nk_normalize('ĐÈN PIN MÁY KHOAN') value")).rows[0].value,'den pin may khoan');
 const q=await quote('nk-test-renter');const payload=booking(q);
 const first=await contend('Two renters cannot hold the same slot',c=>action(c,'nk-test-renter','BOOK',payload),c=>action(c,'nk-test-renter2','BOOK',payload),'SLOT_CONFLICT');
 assert.equal((await pool.query("select count(*)::int n from nk_orders where status='PENDING_OWNER'")).rows[0].n,1);
 await action(pool,'nk-test-renter','CANCEL',{id:first.id,reason:'TEST release after contention'});
 const key=randomUUID();const same=await contend('Concurrent replay of one operation creates one rental',c=>action(c,'nk-test-renter','BOOK',payload,key),c=>action(c,'nk-test-renter','BOOK',payload,key),'SAME_ID');await action(pool,'nk-test-renter','CANCEL',{id:same.id,reason:'TEST release idempotency case'});
 await contend('Legacy rental blocks a simultaneous neighborhood booking',c=>c.query("insert into rental_agreements(listing_id,status,starts_at,ends_at) values('nk-test-drill','ACCEPTED',$1,$2) returning id",[start,end]),c=>action(c,'nk-test-renter2','BOOK',payload),'SLOT_CONFLICT');await pool.query("update rental_agreements set status='CANCELLED'");
 const cross=await contend('Neighborhood hold blocks simultaneous legacy checkout',c=>action(c,'nk-test-renter','BOOK',payload),c=>c.query("insert into rental_agreements(listing_id,status,starts_at,ends_at) values('nk-test-drill','ACCEPTED',$1,$2)",[start,end]),'SLOT_CONFLICT');await action(pool,'nk-test-renter','CANCEL',{id:cross.id,reason:'TEST release cross-channel case'});
 await contend('Owner calendar block wins against simultaneous booking',c=>action(c,'nk-test-owner','BLOCK',{asset:'nk-test-drill',start,end}),c=>action(c,'nk-test-renter2','BOOK',payload),'SLOT_CONFLICT');await pool.query('delete from nk_blocks');
 await action(pool,'nk-test-admin','ADMIN_POLICY',{area:IDS.area,terms:{'vi-VN':'TEST-only fee policy, never a real transaction.','en-US':'TEST-only fee policy, never a real transaction.'},feeBps:1000,holdMinutes:30,paymentMinutes:30,cancelBeforeHours:0,reason:'TEST concurrent promotion budget'});
 const promo=await action(pool,'nk-test-admin','ADMIN_PROMOTION',{area:IDS.area,title:{'vi-VN':'TEST fee waiver','en-US':'TEST fee waiver'},terms:{'vi-VN':'TEST-only waiver, not a real promotion.','en-US':'TEST-only waiver, not a real promotion.'},amount:1000,budget:1000,expires:new Date(Date.now()+86400000).toISOString(),enabled:true,reason:'TEST atomic budget'});
 await pool.query("insert into assets select (jsonb_populate_record(null::assets,to_jsonb(a)||jsonb_build_object('id','nk-test-drill-2'))).* from assets a where id='nk-test-drill'");
 await pool.query("insert into nk_listings select (jsonb_populate_record(null::nk_listings,to_jsonb(l)||jsonb_build_object('asset_id','nk-test-drill-2'))).* from nk_listings l where asset_id='nk-test-drill'");
 const q1=await quote('nk-test-renter','nk-test-drill',promo.id),q2=await quote('nk-test-renter2','nk-test-drill-2',promo.id);
 await contend('Two different products cannot overspend one promotion budget',c=>action(c,'nk-test-renter','BOOK',booking(q1,'nk-test-drill',promo.id)),c=>action(c,'nk-test-renter2','BOOK',booking(q2,'nk-test-drill-2',promo.id)),'PROMOTION_INELIGIBLE');
 assert.equal(Number((await pool.query('select used from nk_promotions where id=$1',[promo.id])).rows[0].used),1000);
 const version=(await pool.query('select version() v')).rows[0].v;
 await mkdir('output/neighborhood',{recursive:true});await writeFile('output/neighborhood/postgres-concurrency.json',JSON.stringify({checkedAt:new Date().toISOString(),mode:'ephemeral loopback cluster; synthetic accounts and items',version,checks,externalMessages:0,realPayments:0},null,2));
}finally{
 for(const c of [one,two])if(c){await c.query('rollback').catch(()=>{});await c.end().catch(()=>{});}if(pool)await pool.end();
 if(started)await run(join(binary,'pg_ctl.exe'),['-D',data,'-m','fast','-w','stop'],{windowsHide:true,timeout:15000});
}
