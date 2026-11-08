import test from 'node:test';
import assert from 'node:assert/strict';
import {rentalDateEstimate} from '../lib/product-dates.js';
test('detail estimates match inclusive rental-request days without inventing fees',()=>{
 assert.deepEqual(rentalDateEstimate('2026-10-17','2026-10-17','2026-10-17',80000),{days:1,rent:80000});
 assert.deepEqual(rentalDateEstimate('2026-10-17','2026-10-19','2026-10-17',80000),{days:3,rent:240000});
 for(const [a,b] of [['2026-02-30','2026-03-02'],['2026-10-16','2026-10-19'],['2026-10-19','2026-10-17'],['','2026-10-19']])assert.equal(rentalDateEstimate(a,b,'2026-10-17',80000),null);
 assert.equal(rentalDateEstimate('2026-10-17','2026-10-19','2026-10-17','invalid').rent,null);
});
