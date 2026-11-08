import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createNeighborhoodFixture,IDS} from './neighborhood-fixture.mjs';
import {boundedCameraLocation,neighborhoodDestination,detectNeighborhoodLocale,EXPERIENCE_COPY} from '../lib/neighborhood/experience.js';
import {mobileRentalDestination} from '../lib/mobile/routes.js';
test('routes migrate old functions into common tools without arbitrary destinations',()=>{assert.equal(neighborhoodDestination('orders',{order:'a'}),'/dashboard/orders?order=a');assert.equal(neighborhoodDestination('unexpected'),'/noi-khu');assert.equal(mobileRentalDestination('javascript:alert(1)'),null);assert.equal(mobileRentalDestination('https://evil.example/noi-khu'),null);assert.equal(mobileRentalDestination('https://reloo.vn/noi-khu?area=a&token=SECRET'),'/noi-khu?area=a');assert.equal(mobileRentalDestination('reloo://rental/10000000-0000-4000-8000-000000000001'),'/dashboard/orders?order=10000000-0000-4000-8000-000000000001');});
test('GPS quality and language never infer residency or widen the radius',()=>{assert.equal(boundedCameraLocation({accuracy:501}),false);assert.equal(boundedCameraLocation({accuracy:25}),true);assert.equal(boundedCameraLocation({accuracy:-1}),false);assert.equal(detectNeighborhoodLocale(null,['fr-FR']),'vi-VN');assert.equal(detectNeighborhoodLocale(null,['en-GB']),'en-US');assert.deepEqual(Object.keys(EXPERIENCE_COPY['vi-VN']).sort(),Object.keys(EXPERIENCE_COPY['en-US']).sort());});
test('durable self-declaration, review, idempotency, deletion and authorization (PGlite)',async()=>{
 const db=await createNeighborhoodFixture();const actor='nk-test-visitor';
 const save=async(data,key=randomUUID(),user=actor)=>(await db.query('select reloo_home_preference($1,$2,$3) result',[user,key,data])).rows[0].result;
 try{
  assert.deepEqual((await db.query('select reloo_home_preference($1) r',[actor])).rows[0].r,{});
  const data={choice:'YES',area:IDS.area,building:'',buildingText:'TEST · Tower to review',visible:false},key=randomUUID(),home=await save(data,key);
  assert.equal(home.choice,'YES');assert(home.pending_building_id);assert.equal(home.public_building,false);assert.deepEqual(await save(data,key),home);
  await assert.rejects(save({...data,visible:true},key),/REQUEST_CONFLICT/);
  let membership=(await db.query('select status,verified_until from nk_memberships where profile_id=$1',[actor])).rows[0];assert.equal(membership.status,'SELECTED');assert.equal(membership.verified_until,null);
  const pending=(await db.query('select status,parent_id from nk_places where id=$1',[home.pending_building_id])).rows[0];assert.equal(pending.status,'PENDING');assert.equal(pending.parent_id,IDS.area);
  await save({choice:'NO'});membership=(await db.query('select status from nk_memberships where profile_id=$1',[actor])).rows[0];assert.equal(membership.status,'REVOKED');
  const h=await save({choice:'YES',area:IDS.area,building:IDS.building,visible:false});assert.equal(h.building_id,IDS.building);assert.equal((await db.query('select status from nk_memberships where profile_id=$1',[actor])).rows[0].status,'SELECTED');
  const another=(await db.query('select reloo_home_preference($1) r',['nk-test-renter'])).rows[0].r;assert.deepEqual(another,{});
  await assert.rejects(save({choice:'YES',area:IDS.area,building:IDS.point}),/INVALID_INPUT/);
  await assert.rejects(save({}),/INVALID_INPUT/);await assert.rejects(save({choice:'LATER'},randomUUID(),'not-a-user'),/FORBIDDEN/);
  const q=(await db.query('select reloo_neighborhood_quote_context($1,$2) r',['nk-test-renter','nk-test-drill'])).rows[0].r;assert.equal(q.instant,false);assert.equal(q.ownerName,'Test owner');
  const grants=(await db.query("select has_table_privilege('anon','nk_home_preferences','select') a,has_function_privilege('authenticated','reloo_home_preference(text,uuid,jsonb)','execute') b")).rows[0];assert.deepEqual(grants,{a:false,b:false});
 }finally{await db.close();}
});
