import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeLocalOrder,mergeRentalPage} from '../lib/dashboard/unified-orders.js';
import {legacyWorkspaceDestination} from '../lib/dashboard/legacy-route.js';
import {mobileRentalDestination} from '../lib/mobile/routes.js';
import {notificationKind} from '../lib/notification-kind.js';
test('shared labels preserve workflow state without claiming confirmation means payment',()=>{
 assert.equal(normalizeLocalOrder({status:'CONFIRMED'}).status,'CONFIRMED');
 assert.deepEqual(normalizeLocalOrder({nk_listings:{assets:{images:['/test.webp']}}}).listing.images,['/test.webp']);
 const late=normalizeLocalOrder({status:'ACTIVE',ends_at:'2020-01-01'});assert.equal(late.status,'ACTIVE');assert.equal(late.overdue,true);
 assert.equal(notificationKind({notification_type:'system',notification_data:{module:'neighborhood',event:'ORDER_CONFIRMED'}}),'order');
 assert.equal(notificationKind({notification_type:'system',notification_data:{module:'neighborhood',event:'RESIDENCY_UPDATED'}}),'account');
 assert.equal(notificationKind({notification_type:'system',notification_data:{module:'neighborhood',event:'UNKNOWN'}}),'system');
});
test('merged rentals keep each order exactly once across a shared page boundary',()=>{
 const standard=Array.from({length:32},(_,i)=>({id:'s'+i,source:'standard',createdAt:new Date(1700000000000-i*2000).toISOString()}));
 const scheduled=Array.from({length:32},(_,i)=>normalizeLocalOrder({id:'n'+i,owner_id:'owner',renter_id:'renter',asset_id:'drill',status:'PENDING_OWNER',created_at:new Date(1699999999000-i*2000).toISOString(),snapshot:{total:123,assetTitle:'Drill'}}));
 const first=mergeRentalPage(standard,scheduled,1),second=mergeRentalPage(standard,scheduled,2);
 assert.equal(first.orders.length,30);assert(first.hasMore);assert.equal(new Set([...first.orders,...second.orders].map(o=>o.id)).size,60);assert(first.orders.some(o=>o.source==='scheduled'&&o.status==='PENDING_OWNER'&&o.grandTotal===123));
});
test('legacy routes retain identifiers but return to shared workspaces',()=>{
 assert.equal(legacyWorkspaceDestination('orders',{order:'abc',secret:'bad'}),'/dashboard/orders?order=abc');
 assert.equal(legacyWorkspaceDestination('owner',{create:'1'}),'/dashboard/assets?create=1&setup=1');
 assert.equal(legacyWorkspaceDestination('needs',{need:'abc'}),'/needs?need=abc');
 assert.equal(mobileRentalDestination('https://reloo.vn/dashboard/orders/neighborhood?order=abc'),'/dashboard/orders?order=abc');
 assert.equal(mobileRentalDestination('https://reloo.vn/notifications/neighborhood'),'/?notifications=1');
 assert.equal(mobileRentalDestination('https://evil.example/notifications'),null);
});
