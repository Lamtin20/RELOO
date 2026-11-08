import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverNearbyBatch} from '../lib/nearby-requests/worker.js';
const config={sender:'sender@example.test',GMAIL_CLIENT_ID:'test',GMAIL_CLIENT_SECRET:'test',GMAIL_REFRESH_TOKEN:'test'};
function fixture({optedIn=true,status='QUEUED'}={}){
 const delivery={request_id:'request',profile_id:'member',distance_km:2,kind:'COMMUNITY',status},c={sent:0,delivery};
 c.db={rpc(name){if(name==='reloo_claim_nearby_email'){const claimed=delivery.status==='QUEUED';if(claimed)delivery.status='SENDING';return Promise.resolve({data:claimed,error:null});}return {eq:async()=>({data:[{distance_km:2}],error:null})};},from(table){let patch,conditions=[];const q={select(){return q;},eq(k,v){conditions.push([k,v]);return q;},order(){return q;},limit(){return q;},update(v){patch=v;return q;},maybeSingle(){return Promise.resolve({data:{email_enabled:optedIn,province_code:79},error:null});},single(){return Promise.resolve({data:table==='nearby_requests'?{id:'request',profile_id:'sender',status:'OPEN',expires_at:'2099-01-01',province_code:79,mode:'RENT',description:'Request'}:{email:'member@example.test',name:'Member',activation_status:'ACTIVE'},error:null});},then(resolve,reject){let data=[];if(table==='nearby_request_deliveries'&&conditions.every(([k,v])=>delivery[k]===v)){if(patch){Object.assign(delivery,patch);data=[{request_id:'request'}];}else data=[{...delivery}];}return Promise.resolve({data,error:null}).then(resolve,reject);}};return q;}};return c;
}
test('email queue rechecks consent, claims once, retains uncertain send without automatic retry',async()=>{
 let c=fixture();let sender=async()=>{c.sent++;return {providerId:'sent'};};await deliverNearbyBatch(c.db,{configLoader:async()=>config,sender});await deliverNearbyBatch(c.db,{configLoader:async()=>config,sender});assert.equal(c.sent,1);assert.equal(c.delivery.status,'SENT');
 c=fixture({optedIn:false});await deliverNearbyBatch(c.db,{configLoader:async()=>config,sender});assert.equal(c.sent,0);assert.equal(c.delivery.status,'SKIPPED');
 c=fixture();await deliverNearbyBatch(c.db,{configLoader:async()=>({}),sender});assert.equal(c.delivery.status,'QUEUED');assert.equal(c.sent,0);
 c=fixture();sender=async()=>{c.sent++;throw Error('TIMEOUT');};await deliverNearbyBatch(c.db,{configLoader:async()=>config,sender});await deliverNearbyBatch(c.db,{configLoader:async()=>config,sender});assert.equal(c.sent,1);assert.equal(c.delivery.status,'FAILED');
});
