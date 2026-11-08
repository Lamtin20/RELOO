import test from 'node:test';
import assert from 'node:assert/strict';
import {mapLocation,mapAppUrl} from '../lib/location-tools.js';
import {rentalDays} from '../lib/rental-estimate.js';
test('map URLs keep GPS and untrusted address input inside an encoded Google query',()=>{
 const point=mapLocation({coords:{lat:10.12345678,lng:106.98765432}});assert.equal(new URL(point.embed).searchParams.get('q'),'10.123457,106.987654');
 const address='Area &output=<script>alert(1)</script>',target=mapLocation({address}),url=new URL(target.embed);assert.equal(url.origin,'https://www.google.com');assert.equal(url.searchParams.get('q'),address);assert.equal(url.searchParams.get('output'),'embed');assert.equal([...url.searchParams.keys()].length,3);
});
test('missing and invalid map targets never invent a location',()=>{
 assert.equal(mapLocation(),null);assert.equal(mapLocation({coords:{lat:91,lng:1}}),null);assert.equal(mapLocation({address:'   '}),null);assert.equal(new URL(mapLocation({coords:{lat:Infinity,lng:1},address:'Chosen area'}).embed).searchParams.get('q'),'Chosen area');
});
test('external map handoff uses Apple Maps on Apple devices and Google Maps otherwise',()=>{
 const target={address:'Phường Long Bình, TP. Hồ Chí Minh & test'};
 assert.equal(new URL(mapAppUrl(target,'apple')).origin,'https://maps.apple.com');
 assert.equal(new URL(mapAppUrl(target,'apple')).searchParams.get('q'),target.address);
 assert.equal(new URL(mapAppUrl(target,'google')).searchParams.get('query'),target.address);
 assert.equal(mapAppUrl({},'apple'),null);
});
test('long rental estimates cover the same 365-day horizon as the calendar',()=>{
 for(const n of [1,30,31,90,365])assert.equal(rentalDays(n),n);for(const n of [0,-1,366,'1.5','01','Infinity'])assert.equal(rentalDays(n),0);
});
