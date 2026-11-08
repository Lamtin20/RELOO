import test from'node:test';import assert from'node:assert/strict';
import{automationReadiness,automationReason}from'../lib/news-autopilot/status.js';
import{filterManagedNews,canPublishNow}from'../lib/content/news-management.js';
test('invalid paid configuration cannot be enabled just because a daily budget exists',()=>{
 const bad=automationReadiness({provider:'VIBI',daily_budget_vnd:50000,paid_api_enabled:false,daily_api_call_limit:0});
 assert.equal(bad.ready,false);assert.deepEqual(bad.blockers.map(b=>b.code),['PAID_DISABLED','CALL_LIMIT_ZERO','METERING_DISABLED']);
 assert.equal(automationReadiness({provider:'VIBI',daily_budget_vnd:50000,paid_api_enabled:true,daily_api_call_limit:10,metered_budget_enabled:true}).ready,true);
 assert.equal(automationReadiness({provider:'LOCAL'}).ready,true);assert.equal(automationReadiness({provider:'unknown'}).ready,false);
 assert.match(automationReason('NEWS_PAID_BUDGET_OR_PERMISSION_REQUIRED'),/hạn mức/);
});
test('status, category and accent-insensitive search combine without mutating rows',()=>{
 const rows=[{id:1,title:'Thuê máy ảnh',status:'DRAFT',category:'Thiết bị',updated_at:'2026-10-15'},{id:2,title:'Thuê máy ảnh',status:'PUBLISHED',category:'Thiết bị',updated_at:'2026-10-16'},{id:3,title:'Thuê đồ camping',status:'SCHEDULED',category:'Camping',updated_at:'2026-10-14'},{id:4,title:'Bài cũ',status:'ARCHIVED'}];
 assert.deepEqual(filterManagedNews(rows,{status:'UNPUBLISHED'}).map(r=>r.id),[1,3]);
 assert.deepEqual(filterManagedNews(rows,{query:'may anh',status:'DRAFT',category:'Thiết bị'}).map(r=>r.id),[1]);
 assert.equal(filterManagedNews(rows,{category:'none'}).length,0);assert.equal(rows[0].id,1);
 assert.equal(canPublishNow(rows[3]),false);assert.equal(canPublishNow(rows[1]),false);assert.equal(canPublishNow(rows[2]),true);
});
