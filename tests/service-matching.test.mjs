import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {clarifyNeed,serviceInput,serviceMatches,publicServiceOffer} from '../lib/services/domain.js';
import {advisorIntent,advisorContext} from '../lib/support/advisor.js';
test('need preparation is explicit, minimal, bilingual and does not dispatch or infer sensitive attributes',()=>{
 assert.deepEqual(clarifyNeed('Lắp bàn ở TP. Hồ Chí Minh').category,'assembly');assert.equal(clarifyNeed('photo in Hanoi','en-US').city,'HN');
 assert.equal(clarifyNeed('Bạn có thể chuyển bàn giúp tôi không?').category,'moving');assert.equal(clarifyNeed('Bạn giúp tôi nhé').category,null);
 assert.equal(advisorIntent('thuê máy ảnh để chụp ảnh'),'rent');assert.equal(advisorIntent('cần người chụp ảnh'),'jobs');assert.equal(advisorIntent('thuê xe chuyển đồ'),'rent');
 assert.equal(advisorIntent('giá chụp ảnh',[],advisorContext('/viec-lam/dich-vu')),'jobs');assert.equal(advisorIntent('thuê người hỗ trợ'),'jobs');assert.equal(advisorIntent('thuê máy ảnh',[],advisorContext('/viec-lam/dich-vu')),'rent');
 assert.equal(clarifyNeed('dịch vụ điều dưỡng').unsupported,true);assert.equal(clarifyNeed('massage').category,null);
 const now=Date.now(),n=serviceInput({category:'photo',city:'HCM',start:new Date(now+7200000).toISOString(),hours:2,details:'otp:123456 email@example.invalid'},now);
 assert.ok(!n.details.includes('123456'));assert.ok(!n.details.includes('@'));assert.equal(Date.parse(n.end)-Date.parse(n.start),7200000);
 assert.throws(()=>serviceInput({...n,start:new Date(now).toISOString()},now),/SCHEDULE/);
 assert.throws(()=>serviceInput({...n,city:'exact street'},now),/SERVICE/);
 const offer={id:'1',status:'APPROVED',is_demo:true,title:'DEMO',category:'photo',city:'HCM',rate:100000,owner_id:'private'};
 assert.equal(publicServiceOffer({...offer,status:'PENDING'}),null);assert.ok(!JSON.stringify(publicServiceOffer(offer)).includes('private'));
 assert.equal(serviceMatches([offer],{...n,budget:199999}).length,0);assert.equal(serviceMatches([offer],{...n,budget:200000}).length,1);
});
test('real SQL enforces ownership, approval, idempotency, price snapshot, lifecycle and provider-wide calendar conflicts',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create role service_role;create table profiles(id text primary key);create table crm_staff(profile_id text,enabled boolean);insert into profiles values('customer'),('customer2'),('provider'),('stranger'),('staff');insert into crm_staff values('staff',true);");
 await db.exec(await readFile('supabase/migrations/20261024120000_service_matching_sandbox.sql','utf8'));
 const call=async(actor,action,data={},id=randomUUID(),hash)=>{const digest=hash||createHash('sha256').update(JSON.stringify({action,data})).digest('hex');return (await db.query('select reloo_service_action($1,$2,$3,$4,$5) result',[actor,id,digest,action,JSON.stringify(data)])).rows[0].result};
 const created=await call('provider','offer',{title:'DEMO assembly',category:'assembly',city:'HCM',rate:100000}),offer=created.id;
 await assert.rejects(call('stranger','submit',{id:offer}),/DENIED/);await call('provider','submit',{id:offer});
 await assert.rejects(call('stranger','edit',{id:offer,title:'Changed',category:'photo',city:'HN',rate:1000}),/DENIED/);
 await assert.rejects(call('provider','approve',{id:offer}),/DENIED/);await call('staff','approve',{id:offer});
 const now=Date.now(),need=serviceInput({category:'assembly',city:'HCM',start:new Date(now+86400000).toISOString(),hours:2});
 await assert.rejects(call('customer','send',{offerId:offer,need,accepted:true,expectedRate:1}),/PRICE_CHANGED/);
 await assert.rejects(call('customer','send',{offerId:offer,need:{...need,budget:1000},accepted:true,expectedRate:100000}),/BUDGET_EXCEEDED/);
 const send={offerId:offer,need,accepted:true,expectedRate:100000},key=randomUUID();const first=await call('customer','send',send,key);assert.deepEqual(await call('customer','send',send,key),first);
 await assert.rejects(call('stranger','send',send,key),/CONFLICT/);assert.equal((await db.query('select count(*)::int n from service_requests')).rows[0].n,1);
 await assert.rejects(call('stranger','accept',{id:first.id}),/DENIED/);await assert.rejects(call('customer','accept',{id:first.id}),/STATE/);
 await call('provider','accept',{id:first.id});await call('provider','quote',{id:first.id});
 const quote=(await db.query('select quote from service_requests where id=$1',[first.id])).rows[0].quote;assert.equal(quote.amount,200000);assert.equal(quote.payment,'NOT_SUPPORTED');
 await assert.rejects(call('customer','confirm',{id:first.id,accepted:false}),/STATE/);await call('customer','confirm',{id:first.id,accepted:true});
 const secondOffer=(await call('provider','offer',{title:'DEMO another package',category:'assembly',city:'HCM',rate:120000})).id;await call('provider','submit',{id:secondOffer});await call('staff','approve',{id:secondOffer});
 const other=await call('customer2','send',{offerId:secondOffer,need,accepted:true,expectedRate:120000});await call('provider','accept',{id:other.id});await call('provider','quote',{id:other.id});await assert.rejects(call('customer2','confirm',{id:other.id,accepted:true}),/CONFLICT/);
 await assert.rejects(call('provider','block',{id:secondOffer,start:need.start,end:need.end}),/CONFLICT/);
 await call('provider','begin',{id:first.id});await assert.rejects(call('provider','complete',{id:first.id}),/STATE/);await call('customer','complete',{id:first.id});
 await assert.rejects(call('customer','cancel',{id:first.id}),/STATE/);await call('customer','dispute',{id:first.id});
 await call('customer','note',{id:first.id,body:'DEMO issue'});await assert.rejects(call('stranger','note',{id:first.id,body:'private'}),/DENIED/);
 const exp=await call('customer','send',send);await db.query("update service_requests set expires_at=now()-interval '1 second' where id=$1",[exp.id]);assert.equal((await call('provider','accept',{id:exp.id})).status,'EXPIRED');
 const publicGrant=await db.query("select has_table_privilege('anon','service_requests','select') yes,has_function_privilege('authenticated','reloo_service_action(text,uuid,text,text,jsonb)','execute') rpc");assert.equal(publicGrant.rows[0].yes,false);assert.equal(publicGrant.rows[0].rpc,false);
 await db.exec("update service_requests set created_at=now()-interval '31 days';select reloo_service_purge()");assert.equal((await db.query('select count(*)::int n from service_requests')).rows[0].n,0);
 await db.query("delete from profiles where id='provider'");assert.equal((await db.query('select count(*)::int n from service_offers')).rows[0].n,0);assert.equal((await db.query("select count(*)::int n from service_receipts where actor_id='provider'")).rows[0].n,0);
 }finally{await db.close()}
});
