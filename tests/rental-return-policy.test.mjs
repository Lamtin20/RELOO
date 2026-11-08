import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRentalReturn} from '../lib/rental-window.js';
import {rentalLateReturnFee} from '../lib/rental-return-policy.js';
test('daily return suggestion handles 22:00, midnight, month and year boundaries',()=>{
 assert.deepEqual(defaultRentalReturn('2026-10-23','22:00'),{endDate:'2026-10-24',endTime:'21:30'});
 assert.deepEqual(defaultRentalReturn('2026-12-31','22:00'),{endDate:'2027-01-01',endTime:'21:30'});
 assert.deepEqual(defaultRentalReturn('2026-10-23','00:00'),{endDate:'2026-10-23',endTime:'23:30'});
 assert.deepEqual(defaultRentalReturn('2026-10-23','22:00',30),{endDate:'2026-11-22',endTime:'21:30'});
});
test('late return exact boundaries, hourly proration and one-day cap',()=>{
 const dueAt='2026-10-24T21:30:00+07:00',due=Date.parse(dueAt);
 const fee=minutes=>rentalLateReturnFee({dueAt,returnedAt:new Date(due+minutes*60000).toISOString(),rent:480000,rentalDays:2});
 for(const m of [-1,0,59,59.999])assert.equal(fee(m).amount,0);
 assert.equal(fee(60).amount,10000);assert.equal(fee(90).amount,15000);
 assert.equal(fee(360).amount,60000);assert.equal(fee(360.001).amount,240000);
 assert.equal(fee(1500).amount,240000);
 assert.throws(()=>rentalLateReturnFee({dueAt,returnedAt:dueAt,rent:100,rentalDays:0}),/INVALID/);
});
