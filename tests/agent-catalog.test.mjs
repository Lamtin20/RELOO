import test from 'node:test';
import assert from 'node:assert/strict';
import {agentListing,catalogInput,catalogPage} from '../lib/agent/catalog.js';
import {agentManifest,agentOpenApi} from '../lib/agent/contract.js';
const row={id:'public-1',title:'Camera',category:'may-anh',status:'available',is_locked:false,owner_id:'private-owner',daily_price:180000,location:'private street',location_details:{province:{name:'TP. HCM',code:79}},listing_data:{phone:'private-phone',email:'private-email',secret:'private-secret'}};
test('machine projection excludes hidden inventory and personal/internal fields',()=>{
 const result=agentListing(row),json=JSON.stringify(result);
 for(const secret of ['private-owner','private street','private-phone','private-email','private-secret'])assert.ok(!json.includes(secret));
 for(const patch of [{status:'draft'},{is_locked:true},{dispute_status:'OPEN'},{listing_data:{neighborhoodOnly:true}},{listing_data:{saleStatus:'SOLD'}}])assert.equal(agentListing({...row,...patch}),null);
 assert.equal(agentListing(null),null);assert.equal(result.referencePrice.amount,180000);assert.equal(result.finalTotal,null);assert.equal(result.availability,'REQUIRES_RECHECK');
 assert.equal(agentListing({...row,status:'rented'}).availability,'CURRENTLY_RENTED');
});
test('billing units, dual-mode sales and unknown prices are never misrepresented',()=>{
 const result=agentListing({...row,listing_data:{transactionMode:'BOTH',salePrice:750000,rentalDetails:{billingUnit:'WEEK',periodPrice:400000}}});
 assert.equal(result.mode,'BOTH');assert.equal(result.referencePrice.unit,'WEEK');assert.equal(result.referencePrice.amount,400000);assert.equal(result.saleReferencePrice.amount,750000);
 assert.equal(agentListing({...row,daily_price:NaN}).referencePrice,null);
 assert.equal(agentListing({...row,listing_data:{transactionMode:'SALE',salePrice:750000}}).referencePrice.unit,'ITEM');
});
test('bounded cursor scanning continues through hidden rows without private payloads',()=>{
 const page=catalogPage([{...row,is_locked:true},{...row,id:'next'}],1);
 assert.deepEqual(page.items,[]);assert.equal(page.nextCursor,row.id);assert.equal(catalogPage([row],1).nextCursor,null);
 for(const query of ['limit=0','limit=41','limit=1&limit=2','q=%25','q=a,b','after=x%2Fy','token=secret'])assert.throws(()=>catalogInput(new URLSearchParams(query)),/INVALID_QUERY/);
 assert.equal(catalogInput(new URLSearchParams('q=camera&limit=10')).limit,10);
});
test('discovery contract exposes reads only and grants no transaction or personalization authority',()=>{
 assert.equal(agentManifest.capabilities.pay,false);assert.equal(agentManifest.personalization,'NOT_EXPOSED');
 for(const endpoint of Object.values(agentOpenApi.paths))assert.deepEqual(Object.keys(endpoint),['get']);
 assert.ok(agentOpenApi.components.schemas.Money.properties.unit.enum.includes('WEEK'));
});
