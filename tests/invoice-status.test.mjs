import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyIssuedInvoice} from '../lib/finance/einvoice.js';
test('invoice tracking and mismatched amounts cannot become issued tax documents',()=>{
  const expected={referenceCode:'fixture',subtotal:'100000',tax:'10000',total:'110000'},valid={status:'Success',invoice:{status:'issued',reference_code:'fixture',total_before_tax:100000,tax_amount:10000,total_amount:110000,invoice_number:'1'}};
  assert.equal(verifyIssuedInvoice(valid,expected).invoice_number,'1');for(const value of [{status:'Pending',tracking_code:'fixture'},{...valid,status:'Failed'},{...valid,invoice:{...valid.invoice,total_amount:110001}},{...valid,invoice:{...valid.invoice,status:'draft'}},{...valid,invoice:{...valid.invoice,reference_code:'another'}}])assert.throws(()=>verifyIssuedInvoice(value,expected));
});
