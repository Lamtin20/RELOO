import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStayFixture,stayCommand} from '../lib/stays/test-database.mjs';
import {DEMO_ACTOR,demoStays} from '../lib/stays/catalog.js';
const other='10000000-0000-4000-8000-000000000002',partner='10000000-0000-4000-8000-000000000003';
const dates={checkIn:'2027-01-15',checkOut:'2027-01-17',guests:2,roomTypeId:demoStays[0].roomTypeId};
test('booking SQL: availability, snapshots, retry, isolation, callbacks, cancellation and privileges',async t=>{
 const db=await createStayFixture();t.after(()=>db.close());
 const cmd=(op,input={},actor=DEMO_ACTOR,admin=false)=>stayCommand(db,actor,op,op==='hold'?{policyId:'DEMO_FLEX',...input}:input,admin);
 let q,hold;
 await t.test('invalid dates, guests and suspended sources rejected',async()=>{
  await assert.rejects(cmd('quote',{...dates,guests:3}),/INVALID_DATES_OR_GUESTS/);
  await assert.rejects(cmd('quote',{...dates,checkOut:dates.checkIn}),/INVALID_DATES_OR_GUESTS/);
  await assert.rejects(cmd('quote',{...dates,checkIn:'2027-02-30'}));
  await assert.rejects(cmd('quote',{...dates,checkIn:'2020-01-01'}),/INVALID_DATES_OR_GUESTS/);
 });
 await t.test('server price ignores tampered client amount; frozen policy snapshot',async()=>{
  q=await cmd('quote',{...dates,total:1});assert.equal(q.total,960000);assert.equal(q.snapshot.policy.id,'DEMO_FLEX');
  assert.equal(new Date(q.starts_at).toISOString(),'2027-01-15T07:00:00.000Z');assert.equal(new Date(q.ends_at).toISOString(),'2027-01-17T05:00:00.000Z');
 });
 await t.test('two customers contend for one room; retries produce one order',async()=>{
  const q2=await cmd('quote',dates,other);
  const outcomes=await Promise.allSettled([cmd('hold',{quoteId:q.id,key:'retry-key-1'}),cmd('hold',{quoteId:q2.id,key:'retry-key-2'},other)]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
  assert.match(outcomes.find(x=>x.status==='rejected').reason.message,/SOLD_OUT/);
  hold=outcomes[0].value;assert.ok(hold);
  assert.equal((await cmd('hold',{quoteId:q.id,key:'retry-key-1'})).id,hold.id);
  assert.equal((await db.query('select count(*)::int as n from stay_orders')).rows[0].n,1);
  await assert.rejects(cmd('hold',{quoteId:q2.id,key:'retry-key-1'}),/IDEMPOTENCY_CONFLICT/);
 });
 await t.test('cross-customer and unassigned partner access denied',async()=>{
  await assert.rejects(cmd('order',{orderId:hold.id},other),/FORBIDDEN/);
  assert.deepEqual(await cmd('mine',{},other),[]);assert.deepEqual(await cmd('manage',{},partner),[]);
  await assert.rejects(cmd('transition',{orderId:hold.id,target:'CHECKED_IN',reason:'test'},partner),/FORBIDDEN/);
  await db.query('insert into stay_memberships values($1,$2)',[demoStays[1].id,partner]);
  assert.deepEqual(await cmd('manage',{},partner),[]);
  assert.equal((await cmd('manage',{},other,true)).length,1);
 });
 await t.test('payment verification, duplicate event and second charge protection',async()=>{
  assert.equal((await cmd('pay-test',{orderId:hold.id,eventId:'payment-failed-1',amount:hold.total,outcome:'FAILED'})).payment_status,'FAILED');
  await assert.rejects(cmd('pay-test',{orderId:hold.id,eventId:'payment-event-1',amount:1}),/PAYMENT_INVALID/);
  const paid=await cmd('pay-test',{orderId:hold.id,eventId:'payment-event-1',amount:hold.total});assert.equal(paid.status,'CONFIRMED');
  assert.equal((await cmd('pay-test',{orderId:hold.id,eventId:'payment-event-1',amount:hold.total})).status,'CONFIRMED');
  await assert.rejects(cmd('pay-test',{orderId:hold.id,eventId:'payment-event-2',amount:hold.total}),/ALREADY_PAID/);
  assert.equal((await db.query('select count(*)::int as n from stay_payment_events')).rows[0].n,2);
 });
 await t.test('preview refund, cancel releases inventory, audit is immutable',async()=>{
  assert.equal((await cmd('cancel-preview',{orderId:hold.id})).refund,960000);
  const cancelled=await cmd('cancel',{orderId:hold.id});assert.equal(cancelled.refund_status,'REFUNDED');
  await assert.rejects(cmd('cancel',{orderId:hold.id}),/CANCEL_UNAVAILABLE/);
  assert.ok(await cmd('quote',dates));
  await assert.rejects(db.query('delete from stay_audit'),/APPEND_ONLY/);
 });
 await t.test('price changed and expired quotes cannot hold inventory',async()=>{
  const fresh=await cmd('quote',dates);await db.query('update stay_room_types set version=version+1 where id=$1',[dates.roomTypeId]);
  await assert.rejects(cmd('hold',{quoteId:fresh.id,key:'changed-price'}),/PRICE_CHANGED/);
  const expired=await cmd('quote',dates);await db.query("update stay_quotes set expires_at=now()-interval '1 second' where id=$1",[expired.id]);
  await assert.rejects(cmd('hold',{quoteId:expired.id,key:'expired-quote'}),/QUOTE_EXPIRED/);
 });
 await t.test('expired hold accepts late money only into reconciliation, not confirmed inventory',async()=>{
  const fresh=await cmd('quote',dates);const o=await cmd('hold',{quoteId:fresh.id,key:'late-pay-hold'});
  await db.query("update stay_orders set hold_until=now()-interval '1 second' where id=$1",[o.id]);
  const late=await cmd('pay-test',{orderId:o.id,eventId:'late-payment-1',amount:o.total});
  assert.equal(late.status,'EXPIRED');assert.equal(late.payment_status,'PAID');assert.equal(late.refund_status,'REVIEW_REQUIRED');
  assert.ok(await cmd('quote',dates));
  assert.equal((await db.query("select count(*)::int as n from stay_outbox where id=$1",[o.id+':EXPIRED'])).rows[0].n,1);
 });
 await t.test('maintenance blocks remove unit availability',async()=>{
  await db.query("insert into stay_blocks(unit_id,starts_at,ends_at,reason) values('40000000-0000-4000-8000-000000000001','2027-01-15T00:00Z','2027-01-18T00:00Z','maintenance')");
  await assert.rejects(cmd('quote',dates),/SOLD_OUT/);
 });
 await t.test('accepted policy required; check-in/out and no-show enforce role and time',async()=>{
  const params={...dates,roomTypeId:demoStays[1].roomTypeId};
  const fresh=await cmd('quote',params);
  await assert.rejects(cmd('hold',{quoteId:fresh.id,key:'policy-test-hold',policyId:'forged'}),/POLICY_CHANGED/);
  const o=await cmd('hold',{quoteId:fresh.id,key:'lifecycle-hold'});
  await cmd('pay-test',{orderId:o.id,eventId:'lifecycle-payment',amount:o.total});
  await assert.rejects(cmd('transition',{orderId:o.id,target:'CHECKED_IN',reason:'Early check-in'}),/INVALID_STATE/);
  await db.query("update stay_orders set starts_at=now()-interval '1 hour',ends_at=now()+interval '1 hour' where id=$1",[o.id]);
  await assert.rejects(cmd('cancel-preview',{orderId:o.id}),/CANCEL_UNAVAILABLE/);
  assert.equal((await cmd('transition',{orderId:o.id,target:'CHECKED_IN',reason:'Guest arrived'})).status,'CHECKED_IN');
  assert.equal((await cmd('transition',{orderId:o.id,target:'COMPLETED',reason:'Guest departed'})).status,'COMPLETED');
  const next=await cmd('quote',params);const noShow=await cmd('hold',{quoteId:next.id,key:'no-show-hold'});
  await cmd('pay-test',{orderId:noShow.id,eventId:'no-show-payment',amount:noShow.total});
  await db.query("update stay_orders set starts_at=now()-interval '1 hour' where id=$1",[noShow.id]);
  assert.equal((await cmd('transition',{orderId:noShow.id,target:'NO_SHOW',reason:'No arrival'})).status,'NO_SHOW');
 });
 await t.test('public roles have neither data nor RPC privileges',async()=>{
  for(const role of ['anon','authenticated']){
   assert.equal((await db.query("select has_table_privilege($1,'public.stay_orders','SELECT') as allowed",[role])).rows[0].allowed,false);
   assert.equal((await db.query("select has_function_privilege($1,'public.reloo_stay_command(uuid,boolean,text,jsonb)','EXECUTE') as allowed",[role])).rows[0].allowed,false);
  }
 });
});
