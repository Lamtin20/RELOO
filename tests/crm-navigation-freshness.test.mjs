import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {crmNavigation,CRM_NAV_GROUPS} from '../lib/operations/navigation.js';
import {sourceIsFresh,newestSourceFirst} from '../lib/news-autopilot/policy.js';
import {dmcaCertificate} from '../lib/content/dmca.js';
test('navigation groups every permitted view once, supports accent-free search and hides unauthorized tools',()=>{
 const keys=CRM_NAV_GROUPS.flatMap(g=>g.views),views=Object.fromEntries(keys.map(k=>[k,[k,null]]));views.finance=['Đối soát & hóa đơn',null];views.custom=['Bổ sung',null];
 const allowed=['finance','news','tasks','custom'],groups=crmNavigation(views,allowed);assert.deepEqual(groups.flatMap(g=>g.items.map(v=>v.id)).sort(),allowed.sort());assert.equal(new Set(keys).size,keys.length);assert.deepEqual(crmNavigation(views,allowed,'doi soat').flatMap(g=>g.items.map(i=>i.id)),['finance']);assert.deepEqual(crmNavigation(views,[]),[]);
});
test('freshness always caps at seven days, rejects missing/future dates and keeps stricter limits',()=>{
 const now=Date.parse('2026-10-16T12:00:00Z');assert.equal(sourceIsFresh('2026-10-09T12:00:00Z',168,now),true);assert.equal(sourceIsFresh('2026-10-09T11:59:59Z',9999,now),false);assert.equal(sourceIsFresh('2026-10-12T12:00:00Z',72,now),false);assert.equal(sourceIsFresh(null,168,now),false);assert.equal(sourceIsFresh('2026-10-18T12:00:00Z',168,now),false);assert.equal(sourceIsFresh('2026-10-15T12:00:00Z',NaN,now),false);
 const candidates=[{id:'older-ready',status:'READY',source_published_at:'2026-10-10T12:00:00Z'},{id:'newest',status:'NEW',source_published_at:'2026-10-16T12:00:00Z'}];assert.equal(candidates.sort(newestSourceFirst)[0].id,'newest');
});
test('DMCA link stays hidden without confirmed registration and cannot point to another host',()=>{
 const id='11111111-1111-4111-8111-111111111111';assert.equal(dmcaCertificate(id,'false'),null);assert.equal(dmcaCertificate('', 'true'),null);assert.equal(dmcaCertificate('https://evil.test','true'),null);assert.equal(new URL(dmcaCertificate(id,'true')).hostname,'www.dmca.com');
});
test('database freshness guard expires queue and blocks stale publication without removing history',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create table news_autopilot_settings(id boolean primary key,source_max_age_hours integer default 72,updated_at timestamptz);insert into news_autopilot_settings values(true,72,now());create table news_autopilot_candidates(id text primary key,status text,reason text,updated_at timestamptz,source_published_at timestamptz);insert into news_autopilot_candidates values('old','READY',null,now(),now()-interval '8 days'),('history','PUBLISHED',null,now(),now()-interval '30 days'),('fresh','READY',null,now(),now()-interval '6 days');`);
 await db.exec(await readFile('deploy/vietnam/news-freshness-week.sql','utf8'));
 assert.equal((await db.query("select source_max_age_hours from news_autopilot_settings")).rows[0].source_max_age_hours,168);
 assert.equal((await db.query("select status from news_autopilot_candidates where id='old'")).rows[0].status,'EXPIRED');
 assert.equal((await db.query("select status from news_autopilot_candidates where id='history'")).rows[0].status,'PUBLISHED');
 await assert.rejects(db.exec("update news_autopilot_candidates set status='PUBLISHED' where id='old'"),/NEWS_SOURCE_STALE/);
 await db.exec("update news_autopilot_candidates set status='PUBLISHED' where id='fresh'");
 }finally{await db.close();}
});
