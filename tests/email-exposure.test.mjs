import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEmailExposure} from '../lib/security/email-exposure.js';
test('email exposure requires matching own query and complete source cards; it never returns a fraud status',()=>{
  const input={status:200,values:['owner@example.invalid'],emailData:{hasResultHeading:true,hasBreachSection:true,source:'HIBP_VIA_CLD',reportedCount:1,breaches:[{name:'Fixture incident',date:'01/01/2026',types:['Địa chỉ email'],logo:'https://logos.haveibeenpwned.com/Example.png'}]}};
  assert.equal(parseEmailExposure(input,'owner@example.invalid').status,'EXPOSED');assert.equal(parseEmailExposure(input,'another@example.invalid').status,'UNAVAILABLE');assert.equal(parseEmailExposure({...input,status:403},'owner@example.invalid').status,'UNAVAILABLE');assert.equal(parseEmailExposure({...input,emailData:{...input.emailData,reportedCount:2}},'owner@example.invalid').status,'UNAVAILABLE');
  const cleared={...input,emailData:{...input.emailData,reportedCount:0,breaches:[]}};assert.equal(parseEmailExposure(cleared,'owner@example.invalid').status,'NO_EXPOSURE_REPORTED');
});
