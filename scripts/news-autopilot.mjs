import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {createSupabaseAdminClient} from '../lib/supabase/admin.js';
import {MEDIA_ROOT} from '../lib/content/media.js';
import {DEFAULT_SOURCES,fetchPublicText,fetchArticleText,parseNewsFeed,extractSource,collectVietnamSource,articlePublishedDate} from '../lib/news-autopilot/sources.js';
import {sourceHash,sourceIsFresh,titleSimilarity,validateGenerated,vietnamDay,newestSourceFirst} from '../lib/news-autopilot/policy.js';
import {writeNews,reviewNews} from '../lib/news-autopilot/ai.js';
import {buildAutomaticArticle} from '../lib/news-autopilot/article.js';
import {renderNewsCover} from '../lib/news-autopilot/cover.js';
import {paidNewsSession} from '../lib/news-autopilot/paid.js';
import {automationReadiness} from '../lib/news-autopilot/status.js';
const db=createSupabaseAdminClient();
if(!db)throw Error('NEWS_DATABASE_NOT_CONFIGURED');
const checked=async query=>{const {data,error}=await query;if(error)throw Error(error.code||'NEWS_DATABASE_ERROR');return data;};
const runId=randomUUID();let candidateId=null,readyForPublish=false;
const dryRun=process.argv.includes('--preview');
const collectOnly=process.argv.includes('--collect-only');
async function main(){
 if(!await checked(db.rpc('reloo_news_autopilot_lease',{p_owner:runId})))return;
 await checked(db.from('news_autopilot_runs').insert({id:runId}));
 try{
  const settings=await checked(db.from('news_autopilot_settings').select('*').eq('id',true).single());
  if(!settings.enabled&&!dryRun&&!settings.collection_enabled&&!collectOnly)return await finish('PAUSED');
  if(!['LOCAL','VIBI'].includes(settings.provider))throw Error('NEWS_PROVIDER_INVALID');
  for(const source of DEFAULT_SOURCES)await checked(db.from('news_autopilot_sources').upsert({...source,topic:source.topic||'CATALOG'},{onConflict:'id',ignoreDuplicates:true}));
  const sources=await checked(db.from('news_autopilot_sources').select('*').eq('enabled',true).eq('region','VN'));
  let scanned=0,discovered=0,eligible=0;
  const due=sources.filter(s=>!s.last_checked_at||Date.now()-Date.parse(s.last_checked_at)>=900000).sort((a,b)=>(Date.parse(a.last_checked_at)||0)-(Date.parse(b.last_checked_at)||0)).slice(0,process.argv.includes('--collect-all')?12:2);
  for(const source of due){
   try{
    const known=source.source_kind==='RSS'?[]:await checked(db.from('news_autopilot_documents').select('canonical_url').eq('source_id',source.id).order('verified_at',{ascending:false}).limit(1000));
    const collection=source.source_kind==='RSS'?null:await collectVietnamSource(source,{maxAgeHours:settings.source_max_age_hours,knownUrls:known.map(d=>d.canonical_url)});
    const entries=collection?collection.candidates:parseNewsFeed(await fetchPublicText(source.feed_url,source.allowed_hosts),source,{maxAgeHours:settings.source_max_age_hours});
    if(collection?.documents.length)await checked(db.from('news_autopilot_documents').upsert(collection.documents,{onConflict:'canonical_url'}));
    if(entries.length)await checked(db.from('news_autopilot_candidates').upsert(entries,{onConflict:'canonical_url',ignoreDuplicates:true}));
    scanned++;discovered+=collection?.documents.length||entries.length;eligible+=entries.length;
    await checked(db.from('news_autopilot_sources').update({last_checked_at:new Date().toISOString(),last_error:collection&&!collection.discovered?'NO_READABLE_DOCUMENTS':null,last_discovered_count:collection?.discovered??entries.length,last_eligible_count:entries.length}).eq('id',source.id));
   }catch{await checked(db.from('news_autopilot_sources').update({last_checked_at:new Date().toISOString(),last_error:'SOURCE_FETCH_FAILED',last_discovered_count:0,last_eligible_count:0}).eq('id',source.id));}
  }
  if(collectOnly||(!settings.enabled&&!dryRun))return await finish('COLLECTED',{scanned,documents:discovered,eligible});
  const readiness=automationReadiness(settings);
  if(!readiness.ready)return await finish('BLOCKED',{code:'NEWS_PAID_BUDGET_OR_PERMISSION_REQUIRED',blockers:readiness.blockers.map(b=>b.code)});
  // An interrupted model request is never retried automatically.
  await checked(db.from('news_autopilot_candidates').update({status:'UNCERTAIN',reason:'INTERRUPTED_REQUEST_REVIEW_REQUIRED'}).eq('status','GENERATING').lt('attempt_at',new Date(Date.now()-20*60000).toISOString()));
  const {start,end}=vietnamDay();
  const attempts=await checked(db.from('news_autopilot_candidates').select('id').gte('attempt_at',start).lt('attempt_at',end));
  if(attempts.length>=settings.max_attempts_per_day)return await finish('ATTEMPT_LIMIT');
  const published=await checked(db.from('news_autopilot_candidates').select('updated_at,generated').eq('status','PUBLISHED').gte('updated_at',start).order('updated_at',{ascending:false}));
  if(published.length>=settings.daily_target)return await finish('DAILY_LIMIT');
  if(published[0]&&Date.now()-Date.parse(published[0].updated_at)<settings.min_interval_minutes*60000)return await finish('INTERVAL_WAIT');
  const candidates=await checked(db.from('news_autopilot_candidates').select('*').in('status',['NEW','READY','HELD']).order('source_published_at',{ascending:false}).limit(60));
  candidates.sort(newestSourceFirst);
  const candidate=candidates.find(c=>(c.status!=='HELD'||c.reason==='NEWS_API_BUDGET_WAIT')&&sources.some(s=>s.id===c.source_id&&settings.enabled_topics.includes(s.topic))&&sourceIsFresh(c.source_published_at,settings.source_max_age_hours));
  if(!candidate)return await finish('NO_FRESH_SOURCE');
  candidateId=candidate.id;
  const sourceConfig=sources.find(s=>s.id===candidate.source_id);
  const sourceHtml=await fetchArticleText(candidate.canonical_url,sourceConfig.allowed_hosts),verifiedDate=articlePublishedDate(sourceHtml,sourceConfig);
  if(!verifiedDate)return await hold('SOURCE_PUBLICATION_DATE_MISSING');
  const publicationDate=new Date(Math.min(Date.parse(candidate.source_published_at),Date.parse(verifiedDate))).toISOString();
  if(!sourceIsFresh(publicationDate,settings.source_max_age_hours))return await hold('NEWS_SOURCE_STALE');
  await checked(db.from('news_autopilot_candidates').update({source_published_at:publicationDate}).eq('id',candidate.id));
  const source={...extractSource(sourceHtml),url:candidate.canonical_url,date:publicationDate,publisher:sourceConfig.name,topic:sourceConfig.topic,jurisdiction:sourceConfig.jurisdiction};
  const hash=sourceHash(source.text);
  if(candidate.generated&&candidate.content_hash!==hash)return await hold('SOURCE_CHANGED_REVIEW_REQUIRED');
  const duplicate=await checked(db.from('news_autopilot_candidates').select('id').eq('content_hash',hash).neq('id',candidate.id).limit(1));
  if(duplicate.length)return await hold('DUPLICATE_SOURCE');
  await checked(db.from('news_autopilot_candidates').update({status:'GENERATING',reason:null,source_text:source.text,source_title:source.title,content_hash:hash,attempt_at:new Date().toISOString()}).eq('id',candidate.id).eq('status',candidate.status));
  const paid=settings.provider==='VIBI'?await paidNewsSession(db,runId,candidate.id):null;
  const generated=candidate.generated&&validateGenerated(candidate.generated,source).length===0?candidate.generated:await writeNews(source,paid?.json);
  await checked(db.from('news_autopilot_candidates').update({generated}).eq('id',candidate.id));
  const failures=validateGenerated(generated,source);
  if(published.some(c=>titleSimilarity(c.generated?.title,generated.title)>.65))failures.push('SIMILAR_TITLE');
  if(failures.length)return await hold(failures.join(','),{generated});
  const previous=candidate.review;
  const review=previous?.decision==='PASS'&&previous.vietnameseClear===true&&previous.originalSummary===true&&Array.isArray(previous.unsupportedClaims)&&!previous.unsupportedClaims.length?previous:await reviewNews(source,generated,paid?.json);
  if(review.decision!=='PASS'||review.vietnameseClear!==true||review.originalSummary!==true||!Array.isArray(review.unsupportedClaims)||review.unsupportedClaims.length)return await hold('AI_REVIEW_HOLD',{generated,review});
  await checked(db.from('news_autopilot_candidates').update({status:'READY',reason:null,generated,review}).eq('id',candidate.id));
  readyForPublish=true;
  if(dryRun)return await finish('PREVIEW_READY',{candidateId});
  if(!sourceIsFresh(source.date,settings.source_max_age_hours))return await hold('NEWS_SOURCE_STALE');
  const article=buildAutomaticArticle(generated,source),id=randomUUID(),filename=id+'.webp';
  const scene=paid&&settings.paid_image_enabled?await paid.image({title:article.title,topic:article.category}):null;
  const bytes=await renderNewsCover(article.title,source.publisher,article.category,scene?.data);
  await mkdir(MEDIA_ROOT,{recursive:true});await writeFile(join(MEDIA_ROOT,filename),bytes,{flag:'wx'});
  const result=await db.rpc('reloo_publish_automatic_news',{p_owner:runId,p_candidate:candidate.id,p_article:article,p_media:{id,filename,mime:'image/webp',width:1200,height:630,bytes:bytes.length},p_source_hash:hash});
  if(result.error){
   // Keep the image if the commit outcome is uncertain; never retry a publication blindly.
   const state=await db.from('news_autopilot_candidates').select('article_id').eq('id',candidate.id).single();
   if(!state.error&&!state.data.article_id){await unlink(join(MEDIA_ROOT,filename)).catch(()=>{});if(result.error.message?.includes('NEWS_SOURCE_STALE'))return await hold('NEWS_SOURCE_STALE');}
   throw Error('PUBLISH_OUTCOME_REVIEW_REQUIRED');
  }
  await finish('PUBLISHED',{articleId:result.data,candidateId});
 }catch(error){
  const code=/^[A-Z0-9_,]+$/.test(error.message)?error.message:'NEWS_AUTOPILOT_FAILED';
  if(code==='NEWS_API_BUDGET_WAIT'){
   if(candidateId)await checked(db.from('news_autopilot_candidates').update({status:readyForPublish?'READY':'HELD',reason:code}).eq('id',candidateId));
   return await finish('BUDGET_WAIT',{code,candidateId});
  }
  if(/^NEWS_(?:PRICE|BILLING)/.test(code))await checked(db.from('news_autopilot_settings').update({enabled:false,paid_api_enabled:false}).eq('id',true));
  if(candidateId)await checked(db.from('news_autopilot_candidates').update({status:'UNCERTAIN',reason:code}).eq('id',candidateId).neq('status','PUBLISHED'));
  await finish('ERROR',{code});process.exitCode=1;
 }finally{
  await checked(db.from('news_autopilot_lease').update({expires_at:new Date().toISOString()}).eq('owner',runId));
 }
}
async function finish(status,summary={}){await checked(db.from('news_autopilot_runs').update({status,summary,finished_at:new Date().toISOString()}).eq('id',runId));console.log(JSON.stringify({runId,status,...summary}));}
async function hold(reason,extra={}){await checked(db.from('news_autopilot_candidates').update({status:'HELD',reason,...extra}).eq('id',candidateId));await finish('HELD',{candidateId,reason});}
await main();
