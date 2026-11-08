import test from 'node:test';import assert from 'node:assert/strict';
import {matchesListingQuery,normalizeListingQuery} from '../lib/search/listing-query.js';
import {publicTransactionMode} from '../lib/marketplace-channels.js';
test('search accepts Vietnamese without accents and ignores unavailable optional fields',()=>{
 assert.equal(normalizeListingQuery('  ĐẦM   MỚI '),'dam moi');
 assert(matchesListingQuery({title:'Máy khoan Bosch',description:null,location:undefined},'may Bosch khoan'));
 assert(matchesListingQuery({title:null,location:'HÀ NỘI'},'ha noi'));
 assert(!matchesListingQuery({title:null,description:{text:'private'},location:undefined},'private'));
 assert(!matchesListingQuery({title:'Máy khoan'},'máy ảnh'));
 assert(matchesListingQuery(null,''));
});
test('server-rendered product intent preserves BOTH without granting sale eligibility to rental-only data',()=>{
 assert.equal(publicTransactionMode('BOTH'),'BOTH');assert.equal(publicTransactionMode('SALE'),'SALE');assert.equal(publicTransactionMode('RENT'),'RENT');assert.equal(publicTransactionMode('unexpected'),'RENT');
});
