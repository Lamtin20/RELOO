const KEY=Symbol.for('reloo.listing-assist-usage.v1');
function state(){return globalThis[KEY]||(globalThis[KEY]={day:'',count:0,scopes:new Map(),requests:new Map(),active:0,metrics:{completed:0,failed:0,durationMs:0,idempotentHits:0}});}
const bound=(value,fallback,max)=>Number.isSafeInteger(Number(value))&&Number(value)>0?Math.min(Number(value),max):fallback;
export async function runListingAssist({requestId,fingerprint,scope,env=process.env,now=Date.now()},work){
 const store=state(),day=new Date(now).toISOString().slice(0,10);
 if(store.day!==day){store.day=day;store.count=0;store.scopes.clear();}
 for(const [id,entry] of store.requests)if(entry.until<=now)store.requests.delete(id);
 const id=scope+'\0'+requestId,old=store.requests.get(id);
 if(old){if(old.fingerprint!==fingerprint)throw Error('IDEMPOTENCY_CONFLICT');store.metrics.idempotentHits++;return old.promise;}
 if(store.active>=1)throw Error('AI_BUSY');
 if(store.count>=bound(env.RELOO_LISTING_AI_DAILY_LIMIT,100,1000)||(store.scopes.get(scope)||0)>=bound(env.RELOO_LISTING_AI_USER_DAILY_LIMIT,20,100))throw Error('AI_DAILY_LIMIT');
 store.count++;store.scopes.set(scope,(store.scopes.get(scope)||0)+1);store.active++;
 const start=Date.now();
 const promise=Promise.resolve().then(work).then(result=>{store.metrics.completed++;return result;},error=>{store.metrics.failed++;store.requests.delete(id);throw error;}).finally(()=>{store.active--;store.metrics.durationMs+=Date.now()-start;});
 if(store.requests.size>=128)store.requests.delete(store.requests.keys().next().value);
 store.requests.set(id,{fingerprint,promise,until:now+120000});
 return promise;
}
export function listingAssistMetrics(){const s=state();return {day:s.day,attempts:s.count,active:s.active,...s.metrics,scope:'process-local; not billing totals or recognition accuracy'};}
