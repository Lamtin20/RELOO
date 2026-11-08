import test from'node:test';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';import{readFile}from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';
import{billVnd,verifyVibiPrices}from'../lib/news-autopilot/billing.js';
test('billing must advance in the same day, conservatively includes concurrent key usage',()=>{
 const before={day:'2026-10-16',requests:2,cost:.1};
 assert.throws(()=>billVnd(before,{...before}),/NOT_SETTLED/);
 assert.throws(()=>billVnd(before,{day:'2026-10-17',requests:3,cost:.11}),/NOT_SETTLED/);
 assert.throws(()=>billVnd(before,{day:before.day,requests:3,cost:.09}),/NOT_SETTLED/);
 const settled=billVnd(before,{day:before.day,requests:4,cost:.15});assert.ok(settled>=2000&&settled<=2003);
});
test('unexpected price sheet blocks inference rather than silently spending at new rates',async()=>{
 await assert.rejects(verifyVibiPrices(async()=>({ok:true,json:async()=>({data:[],group_ratio:{}})})),/PRICE_CHANGED/);
});
test('atomic monetary reservations, settled costs and unknown outcomes stay inside the daily ledger',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create table news_autopilot_settings(id bool primary key,paid_api_enabled bool,paid_image_enabled bool,provider text,daily_budget_vnd int,daily_api_call_limit int);
   insert into news_autopilot_settings values(true,true,true,'VIBI',50000,120);
   create table news_autopilot_lease(id bool,owner uuid,expires_at timestamptz);
   create table news_autopilot_candidates(id uuid primary key,status text);
   create table news_autopilot_api_calls(id uuid primary key,run_id uuid,candidate_id uuid,kind text,model text,status text default 'RESERVED',created_at timestamptz default now());`);
  await db.exec(await readFile('deploy/vietnam/news-metered-budget.sql','utf8'));
  const owner=randomUUID(),candidate=randomUUID();
  await db.query("insert into news_autopilot_lease values(true,$1,now()+interval '20 minutes')",[owner]);await db.query("insert into news_autopilot_candidates values($1,'GENERATING')",[candidate]);
  const reserve=kind=>db.query('select reloo_news_reserve_api_call($1,$2,$3,$4,$5)',[randomUUID(),owner,candidate,kind,kind==='TEXT'?'claude-sonnet-4-6':'gpt-image-2']);
  await assert.rejects(reserve('TEXT'),/PAID_NOT_ENABLED/);
  await db.exec('update news_autopilot_settings set metered_budget_enabled=true');
  await reserve('TEXT');await reserve('TEXT');await reserve('IMAGE');
  await assert.rejects(reserve('IMAGE'),/BUDGET_WAIT/);assert.equal((await db.query('select sum(reserved_vnd)::int as amount from news_autopilot_api_calls')).rows[0].amount,42000);
  await db.exec("update news_autopilot_api_calls set settled_vnd=1000,status='SUCCEEDED' where kind='TEXT'");await reserve('IMAGE');
  await db.exec("update news_autopilot_api_calls set status='UNCERTAIN' where kind='TEXT'");await assert.rejects(reserve('TEXT'),/BILLING_UNCERTAIN/);
  assert.equal((await db.query("select has_table_privilege('anon','news_autopilot_budget_adjustments','SELECT') as allowed")).rows[0].allowed,false);
 }finally{await db.close();}
});
