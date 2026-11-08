import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRegistrationStorageReady} from '../lib/auth/provision.js';
function storage(results) {
 return {from(table){return {select(_columns,options){assert.equal(options.head,undefined);return {limit(value){assert.equal(value,0);return Promise.resolve(results[table] || {count:0,error:null});}};}};}};
}
test('registration does not trust an empty HEAD-style success for a missing table',async()=>{
 await assert.rejects(()=>assertRegistrationStorageReady(storage({risk_cases:{count:null,error:null}})),error=>error.status===503 && error.code==='REGISTRATION_STORAGE_UNAVAILABLE');
 await assert.rejects(()=>assertRegistrationStorageReady(storage({security_audit:{count:null,error:{code:'PGRST205'}}})),error=>error.status===503);
 await assertRegistrationStorageReady(storage({}));
});
