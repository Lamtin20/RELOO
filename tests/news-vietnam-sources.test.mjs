import test from'node:test';import assert from'node:assert/strict';
import{VIETNAM_SOURCES}from'../lib/news-autopilot/vietnam-sources.js';
import{articlePublishedDate,vietnamPublishedDate,discoverVietnamLinks,collectVietnamSource}from'../lib/news-autopilot/sources.js';
import{editorialImagePrompt}from'../lib/news-autopilot/image-direction.js';
import{PGlite}from'@electric-sql/pglite';import{readFile}from'node:fs/promises';
import{writeNews,sourceEvidenceSegments}from'../lib/news-autopilot/ai.js';
test('Vietnam registry includes banks, wallets and conservation publishers',()=>{
 assert.ok(VIETNAM_SOURCES.every(s=>s.region==='VN'&&new URL(s.feed_url).protocol==='https:'&&s.allowed_hosts.includes(new URL(s.feed_url).hostname)));
 assert.ok(VIETNAM_SOURCES.some(s=>s.id==='vn-momo-finance'));assert.ok(VIETNAM_SOURCES.some(s=>s.id==='vn-vietcombank'));assert.ok(VIETNAM_SOURCES.some(s=>s.id==='vn-greenviet'));
});
test('AI selects immutable source evidence rather than rewriting quotations',async()=>{
 const text='Đây là đoạn nguồn chính xác để kiểm tra thông tin.\nMột đoạn nguồn khác có chi tiết rõ ràng về nhu cầu.';
 const segments=sourceEvidenceSegments(text);assert.equal(segments.length,2);
 const generated=await writeNews({title:'Nguồn',text},async()=>({title:'Bài thử',facts:[{statement:'Diễn giải',evidenceId:1},{statement:'Không có đoạn',evidenceId:999}]}));
 assert.equal(generated.facts[0].evidence,segments[0].quote);assert.equal(generated.facts[1].evidence,'');assert.equal('evidenceId'in generated.facts[0],false);
});
test('publication dates are explicit, Vietnam-local when no zone, and cannot be inferred from modified time',()=>{
 assert.equal(vietnamPublishedDate('16/10/2026 09:30'),'2026-10-16T02:30:00.000Z');
 assert.equal(vietnamPublishedDate('2026-10-16 09:30:00'),'2026-10-16T02:30:00.000Z');
 assert.equal(vietnamPublishedDate('31/02/2026'),null);assert.equal(vietnamPublishedDate('2026-02-30'),null);
 assert.equal(articlePublishedDate('<meta property="article:modified_time" content="2026-10-16T08:00:00Z">'),null);
 const json={category:{title:'Chuyên mục',published_at:'2022-01-01T00:00:00Z'},article:{title:'Quản lý chi tiêu',published_at:'2026-10-15T10:00:00Z'}};
 assert.equal(articlePublishedDate('<h1>Quản lý chi tiêu</h1><script id="__NEXT_DATA__">'+JSON.stringify(json)+'</script>'),'2026-10-15T10:00:00.000Z');
});
test('discovery stays within verified HTTPS publishers and reads bounded documents without promoting old guides',async()=>{
 const source={id:'vn-test',source_kind:'HTML',feed_url:'https://example.vn/list',allowed_hosts:['example.vn'],link_pattern:'^/articles/',topic:'PERSONAL_FINANCE'};
 const listing='<a href="/articles/current">Current</a><a href="https://evil.invalid/articles/a">Bad</a><a href="/articles/old">Old</a>';
 assert.deepEqual(discoverVietnamLinks(listing,source),['https://example.vn/articles/current','https://example.vn/articles/old']);
 const article=date=>'<h1>Kiến thức quản lý chi tiêu</h1><script type="application/ld+json">'+JSON.stringify({'@type':'Article',datePublished:date})+'</script><article><p>'+('Nội dung có thông tin để tham khảo. '.repeat(45))+'</p></article>';
 const read=async url=>url.endsWith('/list')?listing:article(url.endsWith('/current')?'2026-10-16T01:00:00+07:00':'2026-05-01T08:00:00+07:00');
 const result=await collectVietnamSource(source,{read,now:Date.parse('2026-10-16T08:00:00+07:00')});
 assert.equal(result.documents.length,2);assert.equal(result.candidates.length,1);assert.equal(result.documents[1].reference_only,true);
});
test('new image direction requests everyday conceptual editorial photos without forced mascots',()=>{
 const prompt=editorialImagePrompt({title:'Chi tiêu có kế hoạch',topic:'Tài chính cá nhân'});assert.match(prompt,/Distinct visual direction/);assert.notEqual(prompt,editorialImagePrompt({title:"Khác",topic:"Môi trường",variant:2}));assert.match(prompt,/No mascots/);assert.match(prompt,/conceptual editorial/);assert.match(prompt,/No mascots.*logos/);
});
test('Vietnam collection schema stays backend-only and disables legacy foreign sources without deleting history',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create table news_autopilot_settings(id boolean primary key);insert into news_autopilot_settings values(true);create table news_autopilot_sources(id text primary key,enabled boolean default true);insert into news_autopilot_sources(id)values('apple-newsroom');`);
  await db.exec(await readFile('deploy/vietnam/news-vietnam-sources.sql','utf8'));
  assert.equal((await db.query('select collection_enabled from news_autopilot_settings')).rows[0].collection_enabled,true);
  assert.equal((await db.query('select enabled from news_autopilot_sources')).rows[0].enabled,false);
  assert.equal((await db.query(`select has_table_privilege('anon','news_autopilot_documents','SELECT') as allowed`)).rows[0].allowed,false);
  assert.equal((await db.query(`select has_table_privilege('authenticated','news_autopilot_documents','SELECT') as allowed`)).rows[0].allowed,false);
  assert.equal((await db.query(`select has_table_privilege('service_role','news_autopilot_documents','SELECT') as allowed`)).rows[0].allowed,true);
 }finally{await db.close();}
});
