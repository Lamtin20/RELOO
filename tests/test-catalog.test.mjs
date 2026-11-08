import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTestCatalog,TEST_CATALOG_BATCH} from '../lib/catalog/test-catalog-20261021.js';
import {validateListing} from '../lib/db/listing-write.js';
import {getSpecFieldsForCategory} from '../lib/category-specs.js';
import {RENTAL_DETAIL_TEXT_FIELDS} from '../lib/listing-rental-details.js';
import {rentalSelectionQuote} from '../lib/rental-selection.js';
const products=buildTestCatalog({ownerId:'fixture-owner'});
test('twenty explicit test products pass the real create-listing contract, with complete specs and terms',()=>{
 assert.equal(products.length,20);assert.equal(new Set(products.map(p=>p.id)).size,20);
 for(const p of products){assert.doesNotThrow(()=>validateListing(p),p.title);assert(p.title.startsWith('[TEST]'));assert(p.description.includes('không phải lời chào giao dịch thực'));assert.equal(p.testCatalogBatch,TEST_CATALOG_BATCH);for(const field of getSpecFieldsForCategory(p.category).fields.filter(f=>f.required))assert(String(p.specs[field.id]||'').trim(),p.id+':'+field.id);for(const key of RENTAL_DETAIL_TEXT_FIELDS)assert(p.rentalDetails[key].trim(),p.id+':'+key);assert.equal(p.images.length,3);assert(p.images.every(src=>src.endsWith('.webp')));}
});
test('fixtures cannot fabricate published ownership, identity, reviews, or trust claims',()=>{
 for(const p of buildTestCatalog()){assert.equal(p.ownerId,null);assert.equal(p.status,'paused');assert.equal(p.rating,null);assert.equal(p.reviewCount,0);assert.deepEqual(p.trustBadges,[]);assert.equal(p.identityVerified,undefined);assert(p.rentalDetails.rules.includes('Không chuyển tiền thật'));}
});
test('fixture coverage includes all commerce/billing modes and zero/paid/unsupported handover cases',()=>{
 assert.deepEqual([...new Set(products.map(p=>p.transactionMode))].sort(),['BOTH','RENT','SALE']);assert.deepEqual([...new Set(products.map(p=>p.rentalDetails.billingUnit))].sort(),['DAY','MONTH','WEEK']);assert(products.some(p=>p.rentalDetails.depositAmount===0));assert(products.some(p=>p.rentalDetails.deliveryAvailable&&p.rentalDetails.deliveryFee===0));assert(products.some(p=>!p.rentalDetails.pickupAvailable));assert(products.some(p=>!p.rentalDetails.deliveryAvailable));
});
test('rental fixtures produce consistent backend-equivalent quotes without treating unknown costs as zero',()=>{
 const now=Date.parse('2026-10-21T00:00:00+07:00');
 for(const p of products.filter(p=>p.transactionMode!=='SALE')){const month=p.rentalDetails.billingUnit==='MONTH',selection={startDate:'2026-11-01',endDate:month?'2026-12-01':'2026-11-02',startTime:'10:00',endTime:'10:00',delivery:p.rentalDetails.pickupAvailable?'meet':'deliver'},q=rentalSelectionQuote(p,selection,now);assert.equal(q.units,1,p.id);assert.equal(q.totalKnown,true,p.id);assert.equal(q.rent,p.rentalDetails.billingUnit==='DAY'?p.dailyPrice:p.rentalDetails.periodPrice);assert.equal(q.knownTotal,q.rent+p.rentalDetails.depositAmount+(selection.delivery==='meet'?0:p.rentalDetails.deliveryFee));}
});
