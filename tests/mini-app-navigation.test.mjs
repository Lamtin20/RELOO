import test from 'node:test';
import assert from 'node:assert/strict';
import {miniAppContext,miniAppTabs,miniAppHref,safeMiniAppReturn} from '../lib/product/mini-app-navigation.js';
import {createMiniAppDraftStore} from '../lib/product/mini-app-drafts.js';
test('mini apps have explicit route context, never persistent role/permission inference',()=>{
 assert.equal(miniAppContext('/dat-phong/chu-nha'),'stays');assert.equal(miniAppContext('/viec-lam'),'jobs');
 assert.equal(miniAppContext('/explore','transaction=RENT'),'rentals');assert.equal(miniAppContext('/explore','transaction=SALE'),'used');
 for(const path of ['/admin','/account','/','/explore','/product/123'])assert.equal(miniAppContext(path),null);
});
test('private draft memory isolates actors, expires, copies values and clears after completion',()=>{
 let now=0;const s=createMiniAppDraftStore({ttl:100,max:2,now:()=>now}),key='guest:purchase:item';
 s.write(key,{address:'SYNTHETIC meeting area'});assert.equal(s.read('other:purchase:item'),null);
 const copy=s.read(key);copy.address='changed';assert.equal(s.read(key).address,'SYNTHETIC meeting area');now=100;assert.equal(s.read(key),null);
 s.write('a',{});s.write('b',{});s.write('c',{});assert.equal(s.read('a'),null);s.clear('b');assert.equal(s.read('b'),null);
});
test('explicit context survives detail checkout account and sign-in continuation without crossing domains',()=>{
 const back='/explore?transaction=RENT&q=may+anh&category=camera&sort=nearest';
 for(const path of ['/product/fixture?start=2026-10-24','/rent/fixture?review=1','/checkout/fixture','/account','/dashboard/orders','/lend?intent=RENT']){
  const next=new URL(miniAppHref(path,'rentals',back),'https://reloo.invalid');assert.equal(miniAppContext(next.pathname,next.search),'rentals');assert.equal(next.searchParams.get('returnTo'),back);
 }
 const auth=new URL(miniAppHref('/auth?next='+encodeURIComponent('/rent/fixture?review=1'),'rentals',back),'https://reloo.invalid'),next=new URL(auth.searchParams.get('next'),'https://reloo.invalid');assert.equal(next.pathname,'/rent/fixture');assert.equal(next.searchParams.get('app'),'rentals');assert.equal(next.searchParams.get('review'),'1');
 assert.equal(miniAppHref('/','rentals',back),'/');assert.equal(miniAppHref('/admin','rentals',back),'/admin');assert.equal(miniAppHref('https://evil.invalid/account','rentals',back),'https://evil.invalid/account');
 for(const bad of ['//evil.invalid/explore','/admin','/explore?transaction=SALE','https://evil.invalid'])assert.equal(safeMiniAppReturn(bad,'rentals'),null);
 assert.equal(new URL(miniAppHref('/explore?category=audio','used',null),'https://reloo.invalid').searchParams.get('transaction'),'SALE');
});
test('world navigation keeps commercial domains separate and labels both languages',()=>{
 for(const id of ['stays','jobs','rentals','used'])for(const en of [true,false])for(const [href,label,key] of miniAppTabs(id,en)){assert.ok(href.startsWith('/'));assert.ok(label);assert.ok(key)}
 assert.ok(miniAppTabs('rentals').some(t=>t[0]==='/lend?intent=RENT'));
 assert.ok(miniAppTabs('used').some(t=>t[0]==='/lend?intent=SALE'));
 assert.equal(miniAppTabs('invalid').length,0);
});
