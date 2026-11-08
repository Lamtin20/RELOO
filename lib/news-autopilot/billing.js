// Budget conversion ceiling, deliberately NOT a quoted market exchange rate.
export const BUDGET_VND_PER_USD=40000;
export const reservedVnd=kind=>kind==='TEXT'?16000:10000;
export function billVnd(before,after){
 if(before.day!==after.day||after.requests<=before.requests||after.cost<=before.cost)throw Error('NEWS_BILLING_NOT_SETTLED');
 return Math.ceil((after.cost-before.cost)*BUDGET_VND_PER_USD)+1;
}
export async function verifyVibiPrices(fetcher=fetch){
 const r=await fetcher('https://vibi.top/api/pricing',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('NEWS_PRICE_CHECK_FAILED');
 const p=await r.json(),text=p.data?.find(m=>m.model_name==='claude-sonnet-4-6'),image=p.data?.find(m=>m.model_name==='gpt-image-2');
 const expression=String(image?.billing_expr||'').replace(/\s+/g,'');
 if(!text||!(text.model_ratio>0&&text.model_ratio<=1.65)||!(text.completion_ratio>0&&text.completion_ratio<=5)||!Array.isArray(text.enable_groups)||!text.enable_groups.length||text.enable_groups.some(g=>g!=='claude')||!(p.group_ratio?.claude>0&&p.group_ratio.claude<=1.1)||!image||!Array.isArray(image.enable_groups)||!image.enable_groups.length||expression!=='tier("standard",p*5+cr*1.25+img*8+img_cr*2+c*30)'||image.enable_groups.some(g=>!(p.group_ratio?.[g]>0&&p.group_ratio[g]<=5.5)))throw Error('NEWS_PRICE_CHANGED');
 return{verifiedAt:new Date().toISOString(),currency:'USD',budgetVndPerUsd:BUDGET_VND_PER_USD,textReservation:16000,imageReservation:10000};
}
export async function vibiBillSnapshot(config,model,day){
 day=day||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const r=await fetch('https://vibi.top/docs-setup/api/usage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:config.VIBI_API_KEY,startDate:day,endDate:day}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('NEWS_BILLING_UNAVAILABLE');const b=await r.json();
 if(b.quota?.unit!=='USD'||!Array.isArray(b.model_stats))throw Error('NEWS_BILLING_UNIT_UNVERIFIED');
 const entries=b.model_stats.filter(m=>m.model===model);const cost=entries.reduce((s,m)=>s+Number(m.cost),0),requests=entries.reduce((s,m)=>s+Number(m.requests),0);
 if(entries.some(m=>typeof m.cost!=='number'||!Number.isFinite(m.cost)||m.cost<0||!Number.isSafeInteger(m.requests)))throw Error('NEWS_BILLING_INVALID');
 if(!Number.isFinite(cost)||cost<0||!Number.isSafeInteger(requests)||requests<0)throw Error('NEWS_BILLING_INVALID');
 return{day,model,cost,requests};
}
