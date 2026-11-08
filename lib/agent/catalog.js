import {marketplaceAsset} from '../catalog/public-listing.js';
import {rentalPeriodRate} from '../rental-selection.js';

export function catalogInput(params){
 const allowed=new Set(['q','category','after','limit']);
 for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length!==1)throw Error('INVALID_QUERY');
 const q=(params.get('q')||'').trim(),category=params.get('category')||'',after=params.get('after')||'',raw=params.get('limit')??'20';
 if(q.length>80||/[\u0000-\u001f%_*(),\\]/u.test(q)||category&&!/^[a-z0-9-]{1,60}$/.test(category)||after&&!/^[a-zA-Z0-9_-]{1,150}$/.test(after)||!/^\d{1,2}$/.test(raw)||Number(raw)<1||Number(raw)>40)throw Error('INVALID_QUERY');
 return {q,category,after,limit:Number(raw)};
}
const money=value=>Number.isSafeInteger(value)&&value>=0?value:null;
export function agentListing(row){
 const p=marketplaceAsset(row,null);if(!p)return null;
 const rate=rentalPeriodRate(p),sale=p.transactionMode==='SALE',mode=['SALE','BOTH'].includes(p.transactionMode)?p.transactionMode:'RENTAL',price=money(sale?Number(p.salePrice):rate.price);
 return {id:p.id,name:p.title,category:p.category,area:p.location||null,
  mode,availability:p.status==='available'?'REQUIRES_RECHECK':'CURRENTLY_RENTED',
  referencePrice:price===null||price===0?null:{amount:price,currency:'VND',unit:sale?'ITEM':rate.unit},
  saleReferencePrice:mode==='BOTH'&&money(Number(p.salePrice))>0?{amount:Number(p.salePrice),currency:'VND',unit:'ITEM'}:null,
  finalTotal:null,priceIsBinding:false,
  reviewPath:'/product/'+encodeURIComponent(p.id),
  actions:{review:true,reserve:false,purchase:false,pay:false},
  merchantContentIsUntrusted:true};
}
export function catalogPage(rows,limit){
 const scanned=rows.slice(0,limit);
 return {schemaVersion:1,items:scanned.map(agentListing).filter(Boolean),nextCursor:rows.length>limit?scanned.at(-1)?.id||null:null,
  notices:['Reference prices only; server quote and user review required.','No reservation or transaction is created by this API.']};
}
