import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEntity,entityReady,publicBusiness} from '../lib/operations/settings.js';
import {legalDocument} from '../lib/legal/documents.js';
test('unknown company fields remain real null, never a fabricated company or literal null text',()=>{
 const empty=validateEntity({legalName:null,taxId:'  '});assert.ok(Object.values(empty).every(v=>v===null));assert.equal(entityReady(empty),false);
 const partial=validateEntity({legalName:'  SYNTHETIC company  ',supportEmail:'qa@example.invalid'});assert.equal(partial.legalName,'SYNTHETIC company');assert.equal(partial.representative,null);assert.equal(entityReady(partial),false);
 assert.throws(()=>validateEntity({legalName:42}));assert.throws(()=>validateEntity({unknown:'x'}));
});
test('public business reads use canonical CRM entity, normalize legacy blanks and retain version',async()=>{
 const db={from(table){assert.equal(table,'business_settings');return {select(){return this},eq(){return this},single:async()=>({data:{version:7,entity:{legalName:'SYNTHETIC operator',taxId:''},deposit:{enabled:false}},error:null})}}};
 const b=await publicBusiness(db);assert.equal(b.version,7);assert.equal(b.entity.taxId,null);assert.equal(b.entity.legalName,'SYNTHETIC operator');assert.equal(b.entityReady,false);
 const doc=legalDocument('terms',b);assert.equal(doc.operator,'SYNTHETIC operator');assert.equal(doc.entityVersion,7);assert.equal(doc.draft,true);
});
