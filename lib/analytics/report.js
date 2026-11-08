import {MEASUREMENT,EXTERNAL_SOURCES,productAdvice,comparison} from './dictionary.js';
import {auditProductSeo,campaignLink} from './seo.js';
export function reportPeriod(params,now=Date.now()){
 const days=Number(params.get('days')||30),to=params.get('to'),from=params.get('from');
 const end=to?Date.parse(to+'T00:00:00+07:00')+86400000:Math.floor((now+7*3600000)/86400000)*86400000-7*3600000+86400000;
 const start=from?Date.parse(from+'T00:00:00+07:00'):end-days*86400000;
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>93*86400000||end>now+86400000)throw Error('INVALID_PERIOD');
 return {start:new Date(start).toISOString(),end:new Date(end).toISOString()};
}
export async function productReport(db,actor,params,{admin=false}={}){
 const period=reportPeriod(params),asset=params.get('asset')||null,source=params.get('source')||null;if(source&&!EXTERNAL_SOURCES.includes(source))throw Error('INVALID_SOURCE');
 const r=await db.rpc('reloo_product_metrics',{p_actor:actor,p_admin:admin,p_start:period.start,p_end:period.end,p_asset:asset,p_source:source});if(r.error)throw Error(r.error.message?.includes('NOT_FOUND')?'NOT_FOUND':'REPORT_UNAVAILABLE');if(r.data.capped)throw Error('REPORT_TOO_LARGE');
 let rows=r.data.rows||[];const ids=rows.map(row=>row.id);const statuses=params.get('status'),category=params.get('category');rows=rows.filter(row=>(!statuses||row.status===statuses)&&(!category||row.category===category));
 // Read only authoritative persisted orders. No client event can create revenue or an order.
 let financial=null,coverage={legacy:false,neighborhood:false};
 if(ids.length){
  const [legacy,nk]=await Promise.all([
   db.from('transactions').select('id,asset_id,status,created_at').in('asset_id',ids).gte('created_at',period.start).lt('created_at',period.end).limit(5001),
   db.from('nk_orders').select('id,asset_id,status,payment_status,refund_status,snapshot,created_at').in('asset_id',ids).gte('created_at',period.start).lt('created_at',period.end).limit(5001)
  ]);
  if(legacy.data?.length>5000||nk.data?.length>5000)throw Error('ORDER_REPORT_TOO_LARGE');
  coverage={legacy:!legacy.error,neighborhood:!nk.error};
  for(const row of rows){const l=(legacy.data||[]).filter(o=>o.asset_id===row.id),n=(nk.data||[]).filter(o=>o.asset_id===row.id);row.requested=l.length+n.filter(o=>o.status!=='DRAFT').length;row.accepted=n.filter(o=>!['DRAFT','PENDING_OWNER','CANCELLED','EXPIRED'].includes(o.status)).length;row.completed=l.filter(o=>o.status==='completed').length+n.filter(o=>o.status==='COMPLETED').length;row.cancelled=l.filter(o=>o.status==='cancelled').length+n.filter(o=>o.status==='CANCELLED').length;
   row.grossRentDirect=n.filter(o=>o.payment_status==='PAID').reduce((s,o)=>s+Number(o.snapshot?.rent||0),0);row.refundedRentDirect=n.filter(o=>o.payment_status==='PAID'&&o.refund_status==='REFUNDED').reduce((s,o)=>s+Number(o.snapshot?.rent||0),0);row.feesSnapshot=n.filter(o=>o.payment_status==='PAID').reduce((s,o)=>s+Number(o.snapshot?.fee||0),0);row.netSettlement=null;
  }
  financial={scope:'neighborhood-direct-acknowledgements-only',depositExcluded:true,netSettlementAvailable:false,bankVerified:false};
 }
 for(const row of rows){if(!coverage.legacy||!coverage.neighborhood){row.requested=null;row.accepted=null;row.completed=null;row.cancelled=null;}if(!coverage.neighborhood){row.grossRentDirect=null;row.refundedRentDirect=null;row.feesSnapshot=null;}row.ctr=row.impressions?row.clicks/row.impressions:null;row.comparison=comparison(row.views,row.previous_views);row.advice=productAdvice(row);row.viewers=Number(row.viewers)>=MEASUREMENT.minimumCohort?Number(row.viewers):null;row.privacySuppressed=row.viewers===null;}
 return {ok:true,...r.data,rows,coverage,financial,generatedAt:new Date().toISOString(),timezone:'Asia/Ho_Chi_Minh',dictionaryVersion:2,searchConsole:{connected:false,impressions:null,clicks:null,averagePosition:null},funnel:{linked:false,rates:null,reason:'No verified cross-surface order/session attribution link; transaction totals are not a linked funnel.'},sourceFilteredTransactions:source?'all-channels-unattributed':null};
}
export async function inspectProduct(db,actor,asset,{admin=false}={}){const r=await db.from('assets').select('id,owner_id,title,description,status,category,images,listing_data,updated_at').eq('id',asset).maybeSingle();if(r.error)throw Error('REPORT_UNAVAILABLE');if(!r.data||!admin&&r.data.owner_id!==actor)throw Error('NOT_FOUND');return {asset:r.data,audit:auditProductSeo(r.data)};}
export {campaignLink};
