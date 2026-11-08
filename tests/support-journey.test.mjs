import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationNeed,commerceReply} from '../lib/support/journey.js';
import {advisorIntent,composeAdvisor,rankAdvisorProducts} from '../lib/support/advisor.js';
const camera={id:'public-camera',title:'Máy ảnh DEMO',category:'may-anh',dailyPrice:150000,unit:'DAY',images:[],location:'TP. Hồ Chí Minh'};
test('progressive assistance asks a need, shows grounded options and offers a real review action',()=>{
 const ask=commerceReply({intent:'rent',message:'Thuê đồ',products:[camera]});assert.match(ask.answer,/dịp nào/);assert.deepEqual(ask.products,[]);
 const choices=commerceReply({intent:'rent',message:'Máy ảnh',products:[camera]});assert.match(choices.answer,/lựa chọn/);assert.equal(choices.actions,undefined);
 const selected=commerceReply({intent:'rent',message:'Mình chọn máy ảnh',products:[camera],currentListing:true});assert.match(selected.answer,/150.000/);assert.equal(selected.actions[0].href,'/rent/public-camera');assert.doesNotMatch(selected.answer,/đã đặt|thanh toán thành công/);
 assert.equal(composeAdvisor({intent:'rent',products:[camera]}).products[0].location,camera.location);
});
test('category survives follow-ups; a new category and explicit restart replace old needs',()=>{
 const history=[{role:'USER',body:'Thuê máy ảnh'}];
 assert.equal(conversationNeed('Ngân sách dưới 200k',history).query,'Thuê máy ảnh');assert.equal(conversationNeed('Ngân sách dưới 200k',history).budget,200000);
 assert.equal(conversationNeed('Lều cắm trại',history).category,'camping');assert.equal(conversationNeed('Tìm món khác',history).category,null);
 assert.equal(advisorIntent('Máy ảnh',[{role:'USER',body:'Trả trễ'}]),'rent');assert.equal(advisorIntent('Hỗ trợ đơn hàng'),'handoff');
 assert.deepEqual(rankAdvisorProducts([camera,{...camera,id:'tent',title:'Lều',category:'camping'}],conversationNeed('ở TP HCM',history).query).map(p=>p.id),['public-camera']);
});
test('empty inventory and policy questions never invent stock, price, deposit or a sale',()=>{
 const empty=commerceReply({intent:'rent',message:'Máy ảnh',products:[]});assert.match(empty.answer,/chưa tìm thấy/);assert.deepEqual(empty.products,[]);assert.equal(empty.actions,undefined);
 const deposit=composeAdvisor({intent:'deposit',products:[camera]});assert.match(deposit.answer,/không tự hiểu là miễn cọc/);assert.deepEqual(deposit.products,[]);
 const late=composeAdvisor({intent:'late'});assert.match(late.answer,/dưới 1 giờ/);assert.match(late.answer,/không tự trừ tiền/);
 assert.equal(commerceReply({intent:'handoff',products:[camera],message:'Hoàn tiền'}),null);
});
test('English and sale journeys have distinct actions without overriding transaction authority',()=>{
 const sale=commerceReply({intent:'sale',products:[{...camera,unit:'SALE'}],message:'buy',currentListing:true,locale:'en-US'});assert.equal(sale.actions[0].href,'/purchase/public-camera');assert.match(sale.answer,/checkout terms/);
 assert.equal(conversationNeed('budget under 1.5m').budget,1500000);
});
