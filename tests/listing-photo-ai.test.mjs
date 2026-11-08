import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PRODUCT_BRANDS,TECH_CATEGORIES,MANUFACTURER_HOSTS,productIdentity,visualSuggestion,verifiedProductPatch,mergePhotoSuggestion,officialProductUrl,exactProductModel} from '../lib/listing-ai/policy.js';
import {advisorModel,localModelJson} from '../lib/ai/local-model.js';
import {extractInvariantFacts} from '../lib/listing-ai/facts.js';
import {advisorIndexSchema,selectionFromIndexes} from '../lib/chat-control/selection-schema.js';
test('photo identity cannot become a URL, contact/serial query or an invented price',()=>{
 const good={brand:'Sony',model:'ILCE-7M4',category:'may-anh'};assert.deepEqual(productIdentity(good),good);
 for(const model of ['https://169.254.169.254/latest','a@example.invalid','0912345678','Lâm Văn Tín','token=secret'])assert.throws(()=>productIdentity({...good,model}),/IDENTITY_INVALID/);
 const vague=visualSuggestion({...good,confidence:.99,visibleModel:false,candidates:['ILCE-7M4']});assert.equal(vague.status,'NEEDS_DETAIL');assert.deepEqual(vague.patch,{});
 const clear=visualSuggestion({...good,confidence:.94,visibleModel:true,price:1,condition:'NEW'});assert.equal(clear.identity.model,'ILCE-7M4');assert.deepEqual(clear.patch,{});
});
test('official source URL allowlist rejects suffix tricks, credentials and private destinations',()=>{
 assert.ok(officialProductUrl('https://www.sony.com/electronics/ilce-7m4'));for(const url of ['https://sony.com.evil.invalid/x','https://sony.com@127.0.0.1/','http://sony.com/a','https://sony.com:444/a','https://169.254.169.254/'])assert.equal(officialProductUrl(url),null);
});
test('facts require correct source index and exact evidence, preserving decimal values and variants',()=>{
 const identity={brand:'Sony',model:'ILCE-7M4',category:'may-anh'},sources=[{url:'https://evil.invalid',text:'ILCE-7M4 99 MP'},{url:'https://www.sony.com/electronics/ilce-7m4',title:'Sony ILCE-7M4',text:'ILCE-7M4 has a 33 MP sensor. Lens aperture 2.4. Storage 256 GB.',retrievedAt:'2026-10-25'}];
 const r=verifiedProductPatch(identity,{facts:[{field:'sensor',value:'33 MP',evidence:'ILCE-7M4 has a 33 MP sensor.',sourceIndex:1},{field:'specs',value:'24',evidence:'Lens aperture 2.4.',sourceIndex:1},{field:'specs',value:'256 GB',evidence:'Storage 256 GB.',sourceIndex:1},{field:'price',value:'1',evidence:'1',sourceIndex:1}]},sources);
 assert.equal(r.patch.specs.sensor,'33 MP');assert.equal(r.patch.specs.specs,undefined);assert.equal(r.sources.length,1);assert.equal(r.patch.price,undefined);
 assert.equal(verifiedProductPatch(identity,{facts:[{field:'sensor',value:'99 MP',evidence:'ILCE-7M4 99 MP',sourceIndex:0}]},sources).status,'IDENTIFIED');
});
test('draft merge fills only eligible empty fields and never overwrites manual edits or commercial terms',()=>{
 const current={form:{title:'',category:'',description:'',dailyPrice:'150000',salePrice:'900000',condition:'GOOD',rentalDetails:{depositAmount:500000}},specs:{}},suggestion={patch:{title:'Sony ILCE-7M4',category:'may-anh',description:'Camera',dailyPrice:'1',condition:'NEW',specs:{brand:'Sony',model:'ILCE-7M4',accessories:'Free lens'}}};
 const next=mergePhotoSuggestion(current,suggestion);assert.equal(next.form.title,'Sony ILCE-7M4');assert.equal(next.form.dailyPrice,'150000');assert.equal(next.form.rentalDetails.depositAmount,500000);assert.equal(next.form.condition,'GOOD');assert.equal(next.specs.accessories,'');
 const touched=mergePhotoSuggestion(current,suggestion,['title','specs.model']);assert.equal(touched.form.title,'');assert.equal(touched.specs.model,'');
 const other={...current,form:{...current.form,category:'camping',title:'My tent'}};assert.deepEqual(mergePhotoSuggestion(other,suggestion),other);
});
test('Qwen adapter is scoped, rejects arbitrary model names and leaves Qwen3.8 gated for future hardware',()=>{
 assert.equal(advisorModel({RELOO_AI_URL:'http://old',RELOO_AI_MODEL:'qwen2.5:1.5b',RELOO_ADVISOR_AI_MODEL:'qwen3.5:4b',RELOO_ADVISOR_AI_URL:'http://new'}).model,'qwen3.5:4b');assert.equal(advisorModel({RELOO_ADVISOR_AI_MODEL:'arbitrary-untrusted'}).model,null);assert.equal(advisorModel({RELOO_ADVISOR_AI_MODEL:'qwen3.8:27b'}).model,null);assert.equal(advisorModel({RELOO_ADVISOR_AI_MODEL:'qwen3.8:27b',RELOO_QWEN38_READY:'1'}).model,'qwen3.8:27b');
});
test('local model has one slot and releases it after provider failure without a fake result',async()=>{
 const original=globalThis.fetch;let release;globalThis.fetch=()=>new Promise(resolve=>{release=resolve});try{const env={RELOO_ADVISOR_AI_URL:'http://test',RELOO_ADVISOR_AI_MODEL:'qwen3.5:4b'},first=localModelJson([],{},{env});await assert.rejects(localModelJson([],{},{env}),/AI_BUSY/);release({ok:false});await assert.rejects(first,/AI_UNAVAILABLE/);globalThis.fetch=async()=>({ok:true,json:async()=>({message:{content:'{"ok":true}'}})});assert.equal((await localModelJson([],{},{env})).data.ok,true);}finally{globalThis.fetch=original}
});
test('Python research and JS validators share the pinned manufacturer policy',async()=>{const policy=JSON.parse(await readFile('deploy/listing-ai/manufacturer-policy.json','utf8'));assert.deepEqual(policy.brands,PRODUCT_BRANDS);assert.deepEqual(policy.hosts,MANUFACTURER_HOSTS);assert.deepEqual(policy.categories,TECH_CATEGORIES);assert.equal(policy.commit,'14c213405669414492bda0f8d52cc6531d062c45');});
test('factual extraction retains context instead of confusing total/effective pixels or variants',()=>{const camera={brand:'Sony',model:'ILCE-7M4',category:'may-anh'},sources=[{text:'ILCE-7M4\n35 mm full frame, Exmor R CMOS sensor\nApprox. 34.1 megapixels\nApprox. 33.0 megapixels'}];const found=extractInvariantFacts(camera,sources);assert.match(found[0].value,/full frame.*CMOS/);assert.equal(extractInvariantFacts(camera,[{text:'34.1 megapixels; 33.0 megapixels'}]).length,0);assert.equal(extractInvariantFacts({category:'laptop-pc'},[{text:'Optional Bluetooth 5.3, varies by configuration.'}]).length,0);});
test('index decoding maps only validated public choices and cannot escape the candidate set',()=>{const products=[{id:'first'},{id:'second'}];assert.deepEqual(advisorIndexSchema(products).properties.productIndexes.items.enum,[0,1]);assert.deepEqual(selectionFromIndexes({intent:'rent',productIndexes:[1,1]},products),{intent:'rent',productIds:['second']});for(const indexes of [[-1],[2],[.5],['0'],[0,1,0,1]])assert.equal(selectionFromIndexes({intent:'rent',productIndexes:indexes},products),null);});
test('speaker mismatch from the reported screenshot is rejected instead of becoming a camera listing',()=>{
 for(const model of ['Loa Marshall Acton 2','Marshall Acton II','Acton II'])assert.throws(()=>productIdentity({brand:'Fujifilm',model,category:'may-anh'}),/IDENTITY_CONFLICT/);
 assert.equal(visualSuggestion({brand:'Fujifilm',model:'Loa Marshall Acton 2',category:'may-anh',confidence:1,visibleModel:true}).identity,null);
 const speaker=productIdentity({brand:'Marshall',model:'Loa Marshall Acton 2',category:'am-thanh'});assert.equal(speaker.model,'Acton II');assert.equal(speaker.category,'am-thanh');
 for(const brand of ['Marshall','Bose','JBL'])assert.throws(()=>productIdentity({brand,model:'Acton 2',category:'may-anh'}),/IDENTITY_CONFLICT/);
});
test('even confident visual recognition never fills unconfirmed identity fields',()=>{
 for(const raw of [{brand:'Marshall',model:'Acton II',category:'am-thanh'},{brand:'Sony',model:'ILCE-7M4',category:'may-anh'},{brand:'UnsupportedBrand',model:'X100',category:'dien-tu'}])assert.deepEqual(visualSuggestion({...raw,visibleModel:true,confidence:1}).patch,{});
});
test('manual brand/model conflicts cannot be combined with a second AI identity',()=>{
 const current={form:{category:'may-anh',title:'',description:''},specs:{brand:'Canon',model:'R6'}},value={patch:{category:'may-anh',title:'Sony ILCE-7M4',specs:{brand:'Sony',model:'ILCE-7M4'}}};assert.deepEqual(mergePhotoSuggestion(current,value),current);
});
test('speaker facts must match usable audio fields and manufacturer brand scope',()=>{
 const identity={brand:'Marshall',model:'Acton II',category:'am-thanh'},sources=[{url:'https://www.marshall.com/support/acton-ii',title:'Acton II',text:'Acton II\nOne 30 Watt Class D amplifier for the woofer Two 15 Watt Class D amplifiers\nBluetooth 5.0',retrievedAt:'2026-10-26'}],facts=extractInvariantFacts(identity,sources),result=verifiedProductPatch(identity,{facts},sources);
 assert.equal(result.patch.specs.power,'One 30 Watt Class D amplifier for the woofer');
 assert.equal(result.patch.category,'am-thanh');assert.equal(result.patch.specs.brand,'Marshall');assert.match(result.patch.specs.type,/Acton II/);assert.match(result.patch.specs.power,/30 Watt.*amplifier/);assert.equal(result.patch.specs.sensor,undefined);assert.equal(result.status,'SOURCED');
 assert.equal(verifiedProductPatch(identity,{facts:[{field:'specs',value:'Bluetooth 5.0',evidence:'Bluetooth 5.0',sourceIndex:0}]},sources).status,'IDENTIFIED');
});
test('model evidence distinguishes Acton II from III and numeric-prefix camera variants',()=>{
 assert.equal(exactProductModel('Acton II','Marshall ACTON II Bluetooth'),true);assert.equal(exactProductModel('Acton II','Marshall ACTON III'),false);assert.equal(exactProductModel('ILCE-7M4','Sony ILCE7M4'),true);assert.equal(exactProductModel('ILCE-7M4','Sony ILCE-7M4A'),false);
 const result=verifiedProductPatch({brand:'Marshall',model:'Acton II',category:'am-thanh'},{facts:[{field:'power',value:'30 Watt amplifier',evidence:'30 Watt amplifier',sourceIndex:0}]},[{url:'https://www.marshall.com/',title:'Acton III',text:'Acton III\n30 Watt amplifier'}]);assert.equal(result.status,'IDENTIFIED');assert.equal(result.patch.specs.power,undefined);
});
