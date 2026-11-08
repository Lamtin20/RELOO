import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import sharp from 'sharp';
import {canonicalNewsUrl,sourceIsFresh,validateGenerated,vietnamDay} from '../lib/news-autopilot/policy.js';
import {parseNewsFeed,extractSource} from '../lib/news-autopilot/sources.js';
import {renderNewsCover} from '../lib/news-autopilot/cover.js';
import {financialFailures,EDITORIAL_TOPICS} from '../lib/news-autopilot/topics.js';
import {buildAutomaticArticle} from '../lib/news-autopilot/article.js';
import {boundEvidence} from '../lib/news-autopilot/ai.js';
test('long source quotes are shortened without rewriting the article or inventing evidence',()=>{
 const quote=Array.from({length:35},(_,i)=>'word'+i).join(' '),g={title:'Giữ nguyên tiêu đề',facts:[{statement:'Giữ nguyên nhận định',evidence:quote}]};
 const result=boundEvidence(g);assert.equal(result.facts[0].evidence.split(' ').length,24);assert.ok(quote.startsWith(result.facts[0].evidence));assert.equal(result.title,g.title);assert.equal(result.facts[0].statement,g.facts[0].statement);assert.equal(g.facts[0].evidence,quote);
});
test('six editorial topics include financial reporting without buy/sell recommendations',()=>{
 assert.equal(Object.keys(EDITORIAL_TOPICS).length,6);
 assert.deepEqual(financialFailures({context:'Thông báo này công bố lãi suất tại Hoa Kỳ.'}),[]);
 for(const text of ['Hãy mua cổ phiếu này','Khuyến nghị đầu tư ngay','Đảm bảo lợi nhuận','Điểm mua phù hợp'])assert.ok(financialFailures({context:text}).length);
 const article=buildAutomaticArticle({title:'Thông báo chính sách mới',excerpt:'Thông tin về cuộc họp mới nhất',context:'Bối cảnh',readerAdvice:'Kiểm tra nguồn',facts:[]},{date:'2026-10-15',publisher:'Fed',title:'Press release',url:'https://www.federalreserve.gov/a',topic:'INVESTMENT_NEWS',jurisdiction:'Hoa Kỳ'});
 assert.equal(article.category,EDITORIAL_TOPICS.INVESTMENT_NEWS);assert.ok(article.body.includes('không phải khuyến nghị đầu tư'));assert.ok(article.body.includes('**Phạm vi thông tin:** Hoa Kỳ'));
});
test('source URLs cannot escape allowlist or use local network schemes',()=>{
 assert.throws(()=>canonicalNewsUrl('http://www.apple.com/a',['www.apple.com']));
 assert.throws(()=>canonicalNewsUrl('https://evil.test/a',['www.apple.com']));
 assert.throws(()=>canonicalNewsUrl('https://user:pass@www.apple.com/a',['www.apple.com']));
 assert.equal(canonicalNewsUrl('https://www.apple.com/a?utm_source=x#fragment',['www.apple.com']),'https://www.apple.com/a');
});
test('freshness and Vietnamese daily quota boundary are deterministic',()=>{
 const now=Date.parse('2026-10-15T17:01:00Z');assert.equal(vietnamDay(new Date(now)).start,'2026-10-15T17:00:00.000Z');
 assert.equal(sourceIsFresh('2026-10-15T18:00:00Z',72,now),false);assert.equal(sourceIsFresh('2026-10-10T00:00:00Z',72,now),false);
});
test('RSS accepts only fresh relevant items and rejects untrusted links',()=>{
 const source={id:'x',allowed_hosts:['news.example.com'],keywords:['camera']};
 const xml='<rss><channel>'+['https://news.example.com/a','https://evil.test/b'].map(link=>`<item><title>Camera news</title><link>${link}</link><pubDate>2026-10-15T00:00:00Z</pubDate></item>`).join('')+'</channel></rss>';
 assert.equal(parseNewsFeed(xml,source,{now:Date.parse('2026-10-15T01:00:00Z')}).length,1);
});
test('fabricated numbers and missing evidence block publication',()=>{
 const g={title:'Máy ảnh mới có gì đáng chú ý',excerpt:'Thông tin được hãng công bố cần được kiểm tra theo từng phiên bản.',context:'Bối cảnh được mô tả trong thông báo của hãng. '.repeat(6),readerAdvice:'Bạn nên kiểm tra nhu cầu và hỏi chủ đồ trước khi quyết định thuê hoặc mua. '.repeat(3),facts:Array.from({length:3},()=>({statement:'Thông báo có đề cập đến thiết kế của thiết bị trong đợt giới thiệu này.',evidence:'the camera has a new design'}))};
 assert.deepEqual(validateGenerated(g,{title:'Camera',text:'the camera has a new design'}),[]);
 g.title+=' 999';assert.ok(validateGenerated(g,{text:'the camera has a new design'}).includes('UNSUPPORTED_NUMBER'));
 g.title='Máy ảnh mới có thông số 5';assert.ok(validateGenerated(g,{text:'the camera has a new design 50'}).includes('UNSUPPORTED_NUMBER'));
 g.facts[0].evidence='this quote is not in the source';assert.ok(validateGenerated(g,{text:'the camera has a new design'}).includes('UNSUPPORTED_FACT'));
});
test('article extraction removes scripts and navigation',()=>{
 const result=extractSource('<h1>Camera information</h1><nav><p>FORBIDDEN</p></nav><article><script>FORBIDDEN</script><p>'+('Camera description and details for readers. '.repeat(40))+'</p></article>');assert.ok(!result.text.includes('FORBIDDEN'));
});
test('cover is correctly sized WebP with opaque colors',async()=>{const b=await renderNewsCover('Thông tin thiết bị mới và những điều cần biết','Nguồn chính thức');const m=await sharp(b).metadata();assert.equal(m.format,'webp');assert.equal(m.width,1200);assert.equal(m.height,630);assert.ok(b.length<285000);});
test('database rejects missing verification, paused state, duplicate publication and daily overflow',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create table profiles(id text primary key);create table media_assets(id uuid primary key,filename text,mime text,width int,height int,bytes int,purpose text);create table news_articles(id uuid primary key default gen_random_uuid(),title text,slug text,excerpt text,body text,cover_id uuid,cover_alt text,seo_title text,seo_description text,author_name text,category text,tags text[],status text,publish_at timestamptz);create table security_audit(action text,details jsonb);`);
 await db.exec(`create table automation_jobs(kind text,payload jsonb,result jsonb);create function test_news_notice()returns trigger language plpgsql as $$begin insert into automation_jobs(kind,payload)values('NOTIFY_BROADCAST',jsonb_build_object('source','NEWS','id',new.id));return new;end$$;create trigger test_news_notice after insert on news_articles for each row execute function test_news_notice();`);
 await db.exec(await readFile('deploy/vietnam/news-autopilot.sql','utf8'));
 await db.exec(`create table integration_settings(provider text primary key constraint integration_settings_provider_check check(provider in('GMAIL')));`);
 await db.exec(await readFile('deploy/vietnam/news-paid-api.sql','utf8'));
 await db.exec(`insert into news_autopilot_sources(id,name,feed_url,allowed_hosts)values('s','Source','https://example.com',array['example.com']);insert into news_autopilot_candidates(id,source_id,canonical_url,title,source_published_at)values('11111111-1111-4111-8111-111111111111','s','https://example.com/a','Title',now());`);
 const owner='22222222-2222-4222-8222-222222222222',candidate='11111111-1111-4111-8111-111111111111';
 await db.query('select reloo_news_autopilot_lease($1)',[owner]);
 const reserve=()=>db.query('select reloo_news_reserve_api_call($1,$2,$3,$4,$5)',[crypto.randomUUID(),owner,candidate,'TEXT','claude-sonnet-4-6']);
 await assert.rejects(reserve(),/NEWS_PAID_NOT_ENABLED/);
 await db.exec(`update news_autopilot_settings set paid_api_enabled=true,provider='VIBI',daily_budget_vnd=100000,daily_api_call_limit=1;update news_autopilot_candidates set status='GENERATING';`);
 await reserve();await assert.rejects(reserve(),/NEWS_API_CALL_LIMIT/);
 await db.exec(`update news_autopilot_candidates set status='NEW';update news_autopilot_settings set provider='LOCAL',paid_api_enabled=false,daily_api_call_limit=0,daily_budget_vnd=null;`);
 const a={title:'Bản tin thiết bị mới',slug:'news-test',body:'https://example.com/a '+ 'Thông tin có nguồn. '.repeat(100),tags:[]},m={id:'33333333-3333-4333-8333-333333333333',filename:'test.webp',mime:'image/webp',width:1200,height:630,bytes:100};
 const publish=()=>db.query('select reloo_publish_automatic_news($1,$2,$3::jsonb,$4::jsonb,$5) as id',[owner,candidate,JSON.stringify(a),JSON.stringify(m),'hash']);
 await assert.rejects(publish(),/NEWS_AUTOPILOT_PAUSED/);
 await db.exec('update news_autopilot_settings set enabled=true,daily_target=1');
 await assert.rejects(publish(),/NEWS_NOT_VERIFIED/);
 await db.exec(`update news_autopilot_candidates set status='READY',content_hash='hash',review='{"decision":"PASS","vietnameseClear":true,"originalSummary":true,"unsupportedClaims":[]}'`);
 const first=await publish();assert.equal((await publish()).rows[0].id,first.rows[0].id);
 assert.equal((await db.query('select count(*)::int as count from automation_jobs')).rows[0].count,0);
 await db.exec(`insert into news_autopilot_candidates(id,source_id,canonical_url,title,source_published_at,status,content_hash,review)values('44444444-4444-4444-8444-444444444444','s','https://example.com/b','Next',now(),'READY','hash','{"decision":"PASS","vietnameseClear":true,"originalSummary":true,"unsupportedClaims":[]}');`);
 await assert.rejects(db.query('select reloo_publish_automatic_news($1,$2,$3::jsonb,$4::jsonb,$5)',[owner,'44444444-4444-4444-8444-444444444444',JSON.stringify(a),JSON.stringify(m),'hash']),/NEWS_DAILY_LIMIT/);
 assert.equal((await db.query(`select has_table_privilege('anon','news_autopilot_candidates','SELECT') as allowed`)).rows[0].allowed,false);
 }finally{await db.close();}
});
