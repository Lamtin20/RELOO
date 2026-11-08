import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {auditNews} from '../lib/content/news-quality.js';import {analyticsConsent,eventPayload,trafficSource,publicAnalyticsPath} from '../lib/content/news-measurement.js';
const article='11111111-1111-4111-8111-111111111111',view='22222222-2222-4222-8222-222222222222';
test('consent expires, metadata is minimized and sources never store URLs',()=>{
 const cookie=c=>'reloo-cookie-consent='+encodeURIComponent(JSON.stringify(c));
 assert.equal(analyticsConsent(cookie({version:1,analytics:true,savedAt:Date.now()})),true);assert.equal(analyticsConsent(cookie({version:1,analytics:false,savedAt:Date.now()})),false);assert.equal(analyticsConsent(cookie({version:1,analytics:true,savedAt:0})),false);
 assert.equal(publicAnalyticsPath('/dashboard/messages/private'),null);assert.equal(publicAnalyticsPath('/auth/callback'),null);assert.equal(publicAnalyticsPath('/product/private-id'),'/product/:id');assert.equal(trafficSource('https://www.google.com/search?q=private'), 'search');assert.equal(trafficSource('https://evil.test/email@example.test'), 'referral');
 const input={id:article,viewId:view,articleId:article,visitorId:article,sessionId:view,event:'VIEW',email:'private@example.test',referrer:'https://private.test',campaign:'email@example.test'};const parsed=eventPayload(input);assert.equal(parsed.email,undefined);assert.equal(parsed.referrer,undefined);assert.equal(parsed.campaign,null);assert.throws(()=>eventPayload({...input,event:'KEYSTROKE'}));
});
test('quality checks are explainable source checks, not factual approval',()=>{
 const result=auditNews({title:'Kinh nghiệm thuê máy ảnh cho chuyến đi cuối tuần',slug:'kinh-nghiem-thue-may-anh',seo_description:'Một hướng dẫn về cách kiểm tra thiết bị, thỏa thuận lịch thuê và đối chiếu thông tin trước chuyến đi của bạn.',body:'## Chuẩn bị\n'+('Thông tin cần kiểm tra trước khi thuê. '.repeat(30))+'\n### Nguồn\n[Xem sản phẩm](/explore) [Nguồn](https://example.test/source)',cover_id:article,cover_alt:'Máy ảnh',author_name:'RELOO',excerpt:'Cách kiểm tra trước khi thuê.'});
 assert.equal(result.score,100);assert.equal(result.sourceLinks,1);assert.equal(result.approved,undefined);
 const bad=auditNews({body:'# Tiêu đề trùng\n#### Nhảy cấp\n![ ](/api/media/x)',title:'Ngắn'});assert.ok(bad.issues.some(i=>i.code==='h1'));assert.ok(bad.issues.some(i=>i.code==='heading_order'));assert.ok(bad.score<50);
});
test('event storage deduplicates, excludes drafts, joins views, aggregates accurately and versions review',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id text primary key);insert into profiles values('editor');
 create table news_articles(id uuid primary key,title text,status text,publish_at timestamptz,version integer);
 create table automation_jobs(id serial primary key,kind text,payload jsonb,status text default 'QUEUED');
 create table security_audit(actor_id text,action text,details jsonb);
 create table journey_events(id uuid primary key,visitor_hash text,session_hash text,event text,path text,created_at timestamptz default now());
 insert into news_articles values('${article}','Article','PUBLISHED',now(),1),('33333333-3333-4333-8333-333333333333','Draft','DRAFT',null,1);`);
 await db.exec(await readFile('deploy/vietnam/news-measurement.sql','utf8'));
 let serial=1;const record=(event,overrides={})=>db.query('select reloo_record_news_event($1::jsonb,$2,$3)',[JSON.stringify({id:`aaaaaaaa-aaaa-4aaa-8aaa-${String(serial++).padStart(12,'0')}`,viewId:view,articleId:article,event,source:'social',device:'mobile',language:'vi',slot:'footer',target:'explore',...overrides}),'visitor-hash','session-hash']);
 await record('CTA_CLICK');await record('VIEW');await record('VIEW');await record('ENGAGED_30S');await record('ENGAGED_30S');await record('SCROLL_50');await record('CTA_CLICK');await record('CTA_CLICK');await record('VIEW',{viewId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',articleId:'33333333-3333-4333-8333-333333333333'});
 const metrics=(await db.query('select reloo_news_metrics(7) as m')).rows[0].m;assert.equal(metrics.totals.views,1);assert.equal(metrics.totals.browsers,1);assert.equal(metrics.totals.engaged_views,1);assert.equal(metrics.totals.cta_views,1);assert.equal(metrics.clicks[0].clicks,2);assert.equal(metrics.comparisonComplete,false);
 await db.query('select reloo_review_news_quality($1,$2,$3,$4,$5,$6)',['editor',article,1,'APPROVED','Đã đối chiếu đầy đủ nguồn',true]);
 await db.exec(`update news_articles set version=2 where id='${article}'`);await assert.rejects(db.query('select reloo_review_news_quality($1,$2,$3,$4,$5,$6)',['editor',article,1,'APPROVED','Đã đối chiếu đầy đủ nguồn',true]),/ARTICLE_CHANGED/);
 assert.equal((await db.query("select has_table_privilege('anon','news_engagement_events','SELECT') as allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select has_function_privilege('authenticated','reloo_news_metrics(integer)','EXECUTE') as allowed")).rows[0].allowed,false);
 }finally{await db.close();}
});
