import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {vnd,balancedLines,invoiceTotals} from '../lib/finance/money.js';
import {verifySePaySignature,normalizeSePayWebhook,reconcileSePay} from '../lib/finance/sepay.js';
test('money remains integer VND, rejects fractions and balances every journal',()=>{
  assert.equal(vnd('9007199254740991'),9007199254740991n);for(const invalid of [1.1,-1,'1e5','1.00','9007199254740992',null])assert.throws(()=>vnd(invalid));
  assert.deepEqual(balancedLines([{account:'1121',side:'DEBIT',amount:'500000'},{account:'3388',side:'CREDIT',amount:'500000'}]),{debit:'500000',credit:'500000'});
  assert.throws(()=>balancedLines([{account:'1121',side:'DEBIT',amount:'500001'},{account:'3388',side:'CREDIT',amount:'500000'}]));
});
test('invoice discount and tax use exact arithmetic before totals',()=>{
  const totals=invoiceTotals([{name:'Fixture service',quantity:3,unitPrice:'100001',discount:'2',taxRate:8}]);assert.equal(totals.subtotal,'300001');assert.equal(totals.tax,'24000');assert.equal(totals.total,'324001');
  assert.throws(()=>invoiceTotals([{name:'Fixture',quantity:1,unitPrice:'100',discount:'101',taxRate:10}]));assert.throws(()=>invoiceTotals([{name:'Fixture',quantity:1.5,unitPrice:'100',taxRate:10}]));
});
test('SePay HMAC rejects modified raw bodies and expired delivery timestamps',()=>{
  const now=Date.now(),ts=String(Math.floor(now/1000)),body=Buffer.from('{"id":1}'),secret='fixture-only';
  const headers=new Headers({'x-sepay-timestamp':ts,'x-sepay-signature':'sha256='+createHmac('sha256',secret).update(ts+'.').update(body).digest('hex')});
  assert.equal(verifySePaySignature(body,headers,secret,now),true);assert.equal(verifySePaySignature(Buffer.from('{"id":2}'),headers,secret,now),false);assert.equal(verifySePaySignature(body,headers,secret,now+301000),false);
});
test('bank evidence must agree with signed webhook and configured bank before any credit',()=>{
  const input={id:123,gateway:'ACB',transactionDate:'2026-10-10 10:00:00',accountNumber:'0123456789',transferType:'in',transferAmount:500000,referenceCode:'FT_FIXTURE',content:'fixture',subAccount:'VA001'},hook=normalizeSePayWebhook(input),config={bankAccountId:'00000000-0000-4000-8000-000000000001',companyAccountNumber:'0123456789'},tx={id:'00000000-0000-4000-8000-000000000002',bank_account_id:config.bankAccountId,account_number:config.companyAccountNumber,transfer_type:'in',amount_in:500000,amount_out:0,reference_number:'FT_FIXTURE',transaction_content:'fixture',va:'VA001',bank_brand_name:'ACB'};
  tx.transaction_date=input.transactionDate;
  assert.equal(reconcileSePay(hook,tx,config).amount,'500000');for(const changed of [{amount_in:500001},{reference_number:'OTHER'},{account_number:'9999999999'},{transfer_type:'out'},{amount_out:1},{va:'OTHER'}])assert.throws(()=>reconcileSePay(hook,{...tx,...changed},config));assert.throws(()=>normalizeSePayWebhook({...input,transferAmount:100.1}));
});
