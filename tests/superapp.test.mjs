import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MINI_APPS,moduleSearchHref,publicModuleReadiness,safeModuleIntent,postingMode} from '../lib/product/modules.js';
test('cross-domain search keeps query as data, sale/rental units separate, and unknown intent explicit',()=>{
 const q='https://evil.example/?next=/admin&phone=private';
 for(const m of MINI_APPS){const u=new URL(moduleSearchHref(m.id,q),'https://reloo.invalid');assert.equal(u.origin,'https://reloo.invalid');assert.equal(u.searchParams.get('q'),q);assert.equal(u.searchParams.has('next'),false)}
 assert.equal(new URL(moduleSearchHref('used'),'https://reloo.invalid').searchParams.get('transaction'),'SALE');
 assert.equal(new URL(moduleSearchHref('rentals'),'https://reloo.invalid').searchParams.get('transaction'),'RENT');
 assert.equal(safeModuleIntent('other'),null);assert.throws(()=>moduleSearchHref('other'),/UNKNOWN_MODULE/);
});
test('readiness never represents booking demo or jobs as live transactions; entry has bilingual labels',()=>{
 const states=publicModuleReadiness();assert.equal(states.find(m=>m.id==='stays').liveTransactions,false);assert.equal(states.find(m=>m.id==='jobs').status,'COMING_SOON');
 for(const m of MINI_APPS){assert.ok(m.label['vi-VN']);assert.ok(m.label['en-US']);assert.ok(m.postingHref.startsWith('/'));assert.ok(m.transactionsHref.startsWith('/'))}
});
test('explicit posting mode initializes new form but never overwrites an existing owner draft',()=>{
 assert.equal(postingMode(null,'SALE'),'SALE');assert.equal(postingMode('BOTH','SALE'),'BOTH');assert.equal(postingMode('RENT','SALE'),'RENT');assert.equal(postingMode(null,'invalid'),'RENT');
});
