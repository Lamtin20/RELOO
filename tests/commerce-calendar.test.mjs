import test from 'node:test';import assert from 'node:assert/strict';
import {calendarPricing} from '../lib/rental-calendar-pricing.js';
import {homeDiscoveryHref} from '../lib/search/home-discovery.js';
import {suggestedRentalTimes} from '../lib/rental-window.js';
import {profileContact} from '../lib/auth/profile-contact.js';
const now=Date.parse('2026-10-19T10:00:00+07:00');
test('contact verification belongs to the matching authenticated contact, not simply a profile field',()=>{
 const auth={email:'TEST@example.invalid',email_confirmed_at:'2026-01-01',phone:'+84831234567',phone_confirmed_at:'2026-01-01',identities:[{provider:'google'}]};
 assert.deepEqual(profileContact(auth,{email:'test@example.invalid',phone:'0831234567'}),{emailVerified:true,phoneVerified:true,googleLinked:true,joinedAt:null});
 const mismatch=profileContact(auth,{email:'other@example.invalid',phone:'0931234567'});assert.equal(mismatch.emailVerified,false);assert.equal(mismatch.phoneVerified,false);
 assert.equal(profileContact({},{email:'test@example.invalid',phone:'0831234567'}).emailVerified,false);
});
test('search calendar minimum excludes inactive, sale-only, locked and invalid prices',()=>{
 const listings=[{status:'available',dailyPrice:80000},{status:'available',dailyPrice:100000},{status:'draft',dailyPrice:1},{status:'available',transactionMode:'SALE',dailyPrice:1},{status:'available',isLocked:true,dailyPrice:1},{status:'available',dailyPrice:-1}];
 assert.deepEqual(calendarPricing({listings,days:3}),{from:true,daily:80000,equivalent:false,rent:240000});assert.equal(calendarPricing({listings:[]}),null);
});
test('weekly equivalent never turns into a fictional daily booking charge',()=>{
 const listing={dailyPrice:200000,rentalDetails:{billingUnit:'WEEK',periodPrice:700000}};
 assert.deepEqual(calendarPricing({listing,days:8}),{from:false,daily:100000,equivalent:true,rent:1400000});
});
test('minimum daily rate and minimum total are computed independently across billing units',()=>{
 const listings=[{status:'available',dailyPrice:120000},{status:'available',rentalDetails:{billingUnit:'WEEK',periodPrice:700000}}];
 assert.deepEqual(calendarPricing({listings,days:1}),{from:true,daily:100000,equivalent:true,rent:120000});
});
test('long-term search is a shared rental route, requires 30 days when dates are supplied, preserves category',()=>{
 const dates={startDate:'2026-10-20',endDate:'2026-11-19',startTime:'17:00',endTime:'17:00'};
 const u=new URL(homeDiscoveryHref({intent:'LONG_RENT',dates,category:'camera',now}),'https://test.invalid');assert.equal(u.pathname,'/explore');assert.equal(u.searchParams.get('transaction'),'RENT');assert.equal(u.searchParams.get('rentalPlan'),'LONG');assert.equal(u.searchParams.get('days'),'30');assert.equal(u.searchParams.get('group'),'camera');
 assert.throws(()=>homeDiscoveryHref({intent:'LONG_RENT',dates:{...dates,endDate:'2026-10-21'},now}),/INVALID_HOME_DATES/);
 assert.equal(new URL(homeDiscoveryHref({intent:'SALE',dates,now}),'https://test.invalid').searchParams.has('start'),false);
 assert.equal(suggestedRentalTimes(now,7).endDate,'2026-10-26');assert.equal(suggestedRentalTimes(now,7).startTime,'12:00');assert.equal(suggestedRentalTimes(now,7).endTime,'11:30');
});
