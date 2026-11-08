import test from 'node:test';
import assert from 'node:assert/strict';
import {savePurchaseResume,readPurchaseResume,clearPurchaseResume} from '../lib/product/purchase-resume.js';
const token='00000000-0000-4000-8000-000000000001';
function storage(){const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i]||null,getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
test('explicit purchase sign-in resume stores only bounded draft fields and expires',()=>{
 const s=storage(),d={mode:'MEET',address:'SYNTHETIC meeting area',extra:'discard'};savePurchaseResume(s,token,'item',d,1000);
 assert.deepEqual(readPurchaseResume(s,token,'item',1001),{mode:'MEET',address:d.address});assert.ok(!s.getItem(s.key(0)).includes('discard'));
 assert.equal(readPurchaseResume(s,token,'other',1001),null);assert.equal(s.length,0);
 savePurchaseResume(s,token,'item',d,1000);assert.equal(readPurchaseResume(s,token,'item',1000+1200000),null);assert.equal(s.length,0);
 savePurchaseResume(s,token,'item',d,1000);assert.equal(readPurchaseResume(s,token,'item',999),null);
});
test('resume rejects malformed/oversize data, bounds entries and consumes explicitly',()=>{
 const s=storage();assert.throws(()=>savePurchaseResume(s,'https://evil.invalid','item',{mode:'MEET',address:''}),/INVALID/);
 assert.throws(()=>savePurchaseResume(s,token,'item',{mode:'MEET',address:'x'.repeat(1001)}),/INVALID/);
 for(let i=0;i<20;i++)savePurchaseResume(s,'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),'item',{mode:'DELIVER',address:''},1000);assert.equal(s.length,10);
 savePurchaseResume(s,token,'item',{mode:'MEET',address:''},1000);clearPurchaseResume(s,token);assert.equal(readPurchaseResume(s,token,'item',1001),null);
});
