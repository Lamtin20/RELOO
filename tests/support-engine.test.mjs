import test from 'node:test';
import assert from 'node:assert/strict';
import {generateAdvice} from '../lib/chat-control/advisor-engine.js';
import {DEFAULT_BRAIN} from '../lib/chat-control/policy.js';
const rows=[{id:'camera',title:'Máy ảnh DEMO',category:'may-anh',daily_price:150000,status:'available',is_locked:false,location:'TP. Hồ Chí Minh',owner_id:'private-owner',listing_data:{rentalDetails:{depositAmount:500000}}},{id:'tent',title:'Lều DEMO',category:'camping',daily_price:90000,status:'available',is_locked:false,location:'TP. Hà Nội',listing_data:{}}];
function database(data=rows,error=null){return {from(){return {select(){return this},in(){return this},eq(k,v){if(k==='id')this.id=v;return this},order(){return this},async limit(){return {data:this.id?data.filter(r=>r.id===this.id):data,error}}}}}}
const brain={id:null,config:{...DEFAULT_BRAIN,modelEnabled:false},knowledge:[]};
const ask=(message,options={})=>generateAdvice(database(),{message,context:{path:'/',listingId:null},brain,...options});
test('actual advisor engine progresses and keeps category across budget follow-up',async()=>{
 assert.match((await ask('Thuê đồ')).answer,/dịp nào/);
 const matching=await ask('Máy ảnh');assert.deepEqual(matching.products.map(p=>p.id),['camera']);assert.ok(!Object.hasOwn(matching.products[0],'owner_id'));
 const refined=await ask('Ngân sách dưới 200k',{history:[{role:'USER',body:'Thuê máy ảnh'}]});assert.deepEqual(refined.products.map(p=>p.id),['camera']);
 const cheaper=await ask('Ngân sách dưới 100k',{history:[{role:'USER',body:'Thuê máy ảnh'}]});assert.deepEqual(cheaper.products,[]);assert.match(cheaper.answer,/chưa tìm thấy/);
});
test('selected public listing returns canonical deposit and real rental review action',async()=>{
 const result=await ask('Tiền cọc',{context:{path:'/product/camera',listingId:'camera'}});assert.match(result.answer,/500.000/);assert.equal(result.context.listingId,'camera');assert.equal(result.actions[0].href,'/rent/camera');assert.equal(result.trace.requiresCustomerConfirmation,true);
 const privateId=await ask('Chọn món này',{context:{path:'/product/private',listingId:'private'}});assert.deepEqual(privateId.products,[]);assert.equal(privateId.selectedListingId,null);
});
test('catalog failures never become fake stock; paused bot never calls catalog',async()=>{
 await assert.rejects(generateAdvice(database([],true),{message:'thuê máy ảnh',context:{path:'/'},brain}),/Catalog unavailable/);
 const paused=await generateAdvice({from(){throw Error('must not query')}},{message:'thuê',context:{path:'/'},brain:{...brain,config:{...brain.config,enabled:false}}});assert.equal(paused.paused,true);assert.equal(paused.intent,'handoff');
});
test('public area filtering and explicit model bypass preserve fast grounded answers',async()=>{
 const result=await ask('ở Hà Nội',{history:[{role:'USER',body:'Thuê máy ảnh'}]});assert.deepEqual(result.products,[]);
 const policy=await ask('Trả trễ');assert.equal(policy.model,'RELOO_RULES');assert.match(policy.answer,/dưới 1 giờ/);
});
