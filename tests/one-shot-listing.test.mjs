import test from 'node:test';
import assert from 'node:assert/strict';
import {automaticPhotoSuggestion,visualSuggestion,verifiedProductPatch,mergePhotoSuggestion} from '../lib/listing-ai/policy.js';
import {productSearchConfiguration,eligibleSearchRows,googleProductSearch,searchProductSources} from '../lib/listing-ai/search.js';
import {runListingAssist,listingAssistMetrics} from '../lib/listing-ai/usage.js';

const identity={brand:'Sony',model:'ILCE-7M4',category:'may-anh'};
const now=Date.parse('2026-11-07T10:00:00Z');
const googleEnv={PRIMARY_SEARCH_PROVIDER:'google',GOOGLE_CUSTOM_SEARCH_EXISTING_CUSTOMER:'1',GOOGLE_CUSTOM_SEARCH_API_KEY:'test-google-key',GOOGLE_CUSTOM_SEARCH_ENGINE_ID:'test-engine'};
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
test('primary research skips Google entirely, even with fallback disabled, and isolates cached provider results',async()=>{
 let googleCalls=0,researchCalls=0;
 const env={...googleEnv,PRIMARY_SEARCH_PROVIDER:'agent-reach',FALLBACK_SEARCH_ENABLED:'false',RELOO_PRODUCT_RESEARCH_URL:'http://primary-research',RELOO_PRODUCT_RESEARCH_TOKEN:'fixture-only'};
 const result=await searchProductSources(identity,{env,now,google:async()=>{googleCalls++;throw Error('must not call Google')},fetchImpl:async()=>{researchCalls++;return json({sources:[{url:'https://www.sony.com/primary',title:'ILCE-7M4',text:'ILCE-7M4 full-frame CMOS sensor'}]})}});
 assert.equal(googleCalls,0);assert.equal(researchCalls,1);assert.equal(result.provider,'agent-reach');assert.equal(result.fallbackReason,undefined);assert.equal(result.sources.length,1);
 const googleResult=await searchProductSources(identity,{env:{...env,PRIMARY_SEARCH_PROVIDER:'google'},now,google:async()=>({provider:'google',sources:[{url:'https://www.sony.com/other',text:'ILCE-7M4'}]})});
 assert.equal(googleResult.provider,'google');assert.equal(googleResult.cacheHit,false);
});
test('a clearly readable supported label can fill a draft but never item-specific commercial facts',()=>{
 const proposal=visualSuggestion({...identity,confidence:.98,visibleModel:true});
 assert.deepEqual(proposal.patch,{});
 const value=automaticPhotoSuggestion(proposal);
 assert.equal(value.patch.title,'Sony ILCE-7M4');assert.equal(value.patch.specs.model,'ILCE-7M4');assert.match(value.patch.description,/Máy ảnh Sony ILCE-7M4/);
 assert.equal(value.evidence,'PHOTO_LABEL');assert.equal(value.reviewRequired,true);
 for(const key of ['dailyPrice','salePrice','marketValue','condition','deposit','ownership','published'])assert.equal(value.patch[key],undefined);
 assert.equal(value.patch.specs.accessories,undefined);assert.equal(value.patch.specs.warranty,undefined);
});
test('blur, no label, multiple possible models and unsupported brands cannot pick an exact model',()=>{
 for(const input of [{...identity,visibleModel:false,confidence:.99,candidates:['ILCE-7M4','ILCE-7M3','ILCE-7M4A','ILCE-7M2']},{...identity,visibleModel:true,confidence:.4},{...identity,brand:'unknown',visibleModel:true,confidence:1},{}]){
  const proposal=visualSuggestion(input);assert.equal(automaticPhotoSuggestion(proposal),null);assert.ok(proposal.candidates.length<=3);
 }
});
test('natural descriptions use only supported identity/facts in both locales',()=>{
 const result=verifiedProductPatch(identity,{facts:[]},[],'en-US');assert.equal(result.patch.description,'Camera Sony ILCE-7M4.');
 assert.doesNotMatch(result.patch.description,/authentic|new condition|accessories|warranty|guarantee/i);
});
test('conflicting official specifications remain unresolved instead of taking the first result',()=>{
 const sources=[{url:'https://www.sony.com/product/a',title:'ILCE-7M4',text:'ILCE-7M4 Full-frame CMOS sensor'},{url:'https://www.sony.com/product/b',title:'ILCE-7M4',text:'ILCE-7M4 APS-C CMOS sensor'}];
 const result=verifiedProductPatch(identity,{facts:[{field:'sensor',value:'Full-frame CMOS sensor',evidence:sources[0].text,sourceIndex:0},{field:'sensor',value:'APS-C CMOS sensor',evidence:sources[1].text,sourceIndex:1}]},sources);
 assert.equal(result.patch.specs.sensor,undefined);assert.deepEqual(result.unresolvedFields,['sensor']);assert.equal(result.status,'IDENTIFIED');
});
test('late suggestions preserve typed content and intentionally cleared fields',()=>{
 const current={form:{title:'My item',description:'',category:'may-anh',dailyPrice:'123000',salePrice:'999000',transactionMode:'BOTH',condition:'fair'},specs:{brand:'Sony',model:'',sensor:'My sensor',accessories:'No accessories'}};
 const patch=automaticPhotoSuggestion(visualSuggestion({...identity,confidence:1,visibleModel:true}));
 const result=mergePhotoSuggestion(current,patch,['description','specs.model']);
 assert.equal(result.form.title,'My item');assert.equal(result.form.description,'');assert.equal(result.specs.model,'');assert.equal(result.specs.sensor,'My sensor');assert.equal(result.specs.accessories,'No accessories');
 for(const key of ['dailyPrice','salePrice','transactionMode','condition'])assert.equal(result.form[key],current.form[key]);
});
test('working research is the default and unavailable Google credentials never imply a live integration',()=>{
 assert.deepEqual(productSearchConfiguration({},now),{primary:'agent-reach',googleReady:false,fallbackEnabled:true,fallbackReady:false});
 assert.equal(productSearchConfiguration(googleEnv,now).googleReady,true);
 assert.equal(productSearchConfiguration({...googleEnv,GOOGLE_CUSTOM_SEARCH_EXISTING_CUSTOMER:'0'},now).googleReady,false);
 assert.equal(productSearchConfiguration(googleEnv,Date.parse('2027-01-01T00:00:00Z')).googleReady,false);
});
test('search candidates reject spoofed hosts, another brand and duplicate destinations',()=>{
 const rows=eligibleSearchRows([{link:'https://sony.com.evil.invalid/x'},{link:'http://sony.com/x'},{link:'https://apple.com/x'},{link:'https://www.sony.com/a',title:'A'},{link:'https://www.sony.com/a',title:'Duplicate'}],identity);
 assert.deepEqual(rows,[{url:'https://www.sony.com/a',title:'A'}]);
});
test('Google adapter sends only a bounded product query and verifies the manufacturer page',async()=>{
 let calls=0;
 const result=await googleProductSearch({...identity,image:'must-not-leave',email:'private@example.invalid'},{env:googleEnv,now,fetchImpl:async (url,options)=>{
  calls++;assert.equal(url.origin,'https://customsearch.googleapis.com');assert.equal(url.searchParams.get('q'),'Sony ILCE-7M4 official product specifications');assert.doesNotMatch(url.searchParams.get('q'),/private|must-not-leave/);assert.equal(options.redirect,'error');return json({items:[{link:'https://www.sony.com/a',title:'Sony ILCE-7M4'}]});
 },readPage:async (url,redirects,hosts)=>{assert.deepEqual(hosts,['www.sony.com']);return Buffer.from('<title>Sony ILCE-7M4</title><main>ILCE-7M4 Full-frame CMOS sensor<script>secret()</script></main>')}});
 assert.equal(calls,1);assert.equal(result.provider,'google');assert.equal(result.sources.length,1);assert.match(result.sources[0].text,/Full-frame CMOS/);assert.doesNotMatch(result.sources[0].text,/secret/);assert.equal(result.sources[0].retrievedAt,new Date(now).toISOString());
});
test('the first Google result is not trusted when its actual model variant differs',async()=>{
 const result=await googleProductSearch(identity,{env:googleEnv,now,fetchImpl:async()=>json({items:[{link:'https://www.sony.com/wrong',title:'ILCE-7M4'}]}),readPage:async()=>Buffer.from('<title>ILCE-7M4A</title><main>ILCE-7M4A CMOS sensor</main>')});
 assert.equal(result.sources.length,0);
});
test('a missing Google account returns an explicit unavailable reason and never calls the network',async()=>{
 const result=await searchProductSources(identity,{env:{PRIMARY_SEARCH_PROVIDER:'google',FALLBACK_SEARCH_ENABLED:'false'},now,fetchImpl:async()=>{throw Error('network must not run')}});
 assert.equal(result.provider,'none');assert.equal(result.unavailableReason,'GOOGLE_NOT_CONFIGURED');assert.deepEqual(result.sources,[]);
});
test('an expired legacy Google API is refused before sending credentials',async()=>{
 await assert.rejects(googleProductSearch(identity,{env:googleEnv,now:Date.parse('2027-01-01T00:00:00Z'),fetchImpl:async()=>{throw Error('must not run')}}),/GOOGLE_LEGACY_EXPIRED/);
});
test('explicit fallback is reported by its actual provider, and can be disabled',async()=>{
 const env={PRIMARY_SEARCH_PROVIDER:'google',FALLBACK_SEARCH_ENABLED:'true',RELOO_PRODUCT_RESEARCH_URL:'http://test-only',RELOO_PRODUCT_RESEARCH_TOKEN:'test-only-token'};
 const result=await searchProductSources(identity,{env,now,fetchImpl:async(url,options)=>{assert.equal(url,'http://test-only/lookup');assert.deepEqual(JSON.parse(options.body),identity);return json({sources:[{url:'https://www.sony.com/a',text:'ILCE-7M4'}]})}});
 assert.equal(result.provider,'agent-reach');assert.equal(result.fallbackReason,'GOOGLE_NOT_CONFIGURED');
 const disabled=await searchProductSources(identity,{env:{...env,FALLBACK_SEARCH_ENABLED:'false'},now,fetchImpl:async()=>{throw Error('must not run')}});assert.equal(disabled.provider,'none');
});
test('verified public product search cache avoids repeat calls and invalidates on provider configuration',async()=>{
 let calls=0;const google=async()=>{calls++;return {provider:'google',sources:[{url:'https://www.sony.com/cache',text:'ILCE-7M4'}]}};
 const env={...googleEnv,GOOGLE_CUSTOM_SEARCH_ENGINE_ID:'cache-test-engine'};
 await searchProductSources(identity,{env,now,google});const second=await searchProductSources(identity,{env,now:now+1000,google});assert.equal(calls,1);assert.equal(second.cacheHit,true);
 await searchProductSources(identity,{env:{...env,GOOGLE_CUSTOM_SEARCH_ENGINE_ID:'different-cache-scope'},now,google});assert.equal(calls,2);
});
test('cancellation never starts the fallback provider',async()=>{
 const controller=new AbortController();controller.abort();let fallback=0;
 await assert.rejects(searchProductSources(identity,{env:{PRIMARY_SEARCH_PROVIDER:'google',RELOO_PRODUCT_RESEARCH_URL:'http://cancel-only',RELOO_PRODUCT_RESEARCH_TOKEN:'test-token'},now,signal:controller.signal,google:async()=>{throw Error('ABORTED')},fetchImpl:async()=>{fallback++}}),/ABORTED/);assert.equal(fallback,0);
});
test('idempotent simultaneous requests run once; reused IDs with different input fail closed',async()=>{
 delete globalThis[Symbol.for('reloo.listing-assist-usage.v1')];let release,calls=0;
 const options={requestId:'test-request',fingerprint:'one',scope:'test-scope',now};
 const first=runListingAssist(options,()=>{calls++;return new Promise(resolve=>release=resolve)});
 const second=runListingAssist(options,()=>{calls++;return {}});
 await assert.rejects(runListingAssist({...options,fingerprint:'different'},async()=>({})),/IDEMPOTENCY_CONFLICT/);
 release({status:'IDENTIFIED'});assert.deepEqual(await first,await second);assert.equal(calls,1);assert.equal(listingAssistMetrics().idempotentHits,1);
});
test('busy slots, user/day budgets, failure retry and next-day reset are enforced',async()=>{
 delete globalThis[Symbol.for('reloo.listing-assist-usage.v1')];let release;
 const options={requestId:'one',fingerprint:'same',scope:'one',now,env:{RELOO_LISTING_AI_DAILY_LIMIT:'3',RELOO_LISTING_AI_USER_DAILY_LIMIT:'1'}};
 const first=runListingAssist(options,()=>new Promise(resolve=>release=resolve));await Promise.resolve();
 await assert.rejects(runListingAssist({...options,requestId:'busy',scope:'two'},async()=>({})),/AI_BUSY/);release({});await first;
 await assert.rejects(runListingAssist({...options,requestId:'two'},async()=>({})),/AI_DAILY_LIMIT/);
 await assert.rejects(runListingAssist({...options,requestId:'failure',scope:'two'},async()=>{throw Error('timeout')}),/timeout/);
 assert.equal(listingAssistMetrics().active,0);
 await runListingAssist({...options,requestId:'failure',scope:'three'},async()=>({}));
 await assert.rejects(runListingAssist({...options,requestId:'total',scope:'four'},async()=>({})),/AI_DAILY_LIMIT/);
 await runListingAssist({...options,requestId:'next-day',now:now+86400000},async()=>({}));assert.equal(listingAssistMetrics().attempts,1);
});

