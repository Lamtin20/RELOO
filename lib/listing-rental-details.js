export const RENTAL_DETAIL_TEXT_FIELDS=['pickupNote','deliveryNote','accessories','usageGuide','requirements','depositNote','cancellationNote','lateReturnNote','damageNote','rules'];
export const RENTAL_PRICE_UNITS=['once','day','hour','km'];
export function normalizeRentalDetails(input,category){
 if(input==null)return null;
 if(typeof input!=='object'||Array.isArray(input)||(input.version!=null&&input.version!==1)||Object.keys(input).some(k=>!['version','depositAmount','pickupAvailable','deliveryAvailable','deliveryFee','billingUnit','periodPrice','longTermDiscountPercent','fees','extras',...RENTAL_DETAIL_TEXT_FIELDS].includes(k)))throw Error('RENTAL_DETAILS_INVALID');
 const result={version:1};
 for(const key of RENTAL_DETAIL_TEXT_FIELDS){const value=input[key]??'';if(typeof value!=='string'||value.length>1200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw Error('RENTAL_DETAILS_TEXT');result[key]=value.trim();}
 for(const key of ['pickupAvailable','deliveryAvailable']){if(input[key]!=null&&typeof input[key]!=='boolean')throw Error('RENTAL_DETAILS_HANDOVER');result[key]=input[key]??null;}
 const money=value=>{if(value==null||value==='')return null;if(typeof value!=='number'&&typeof value!=='string'||typeof value==='string'&&!/^\d+$/.test(value))throw Error('RENTAL_DETAILS_PRICE');const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>1000000000)throw Error('RENTAL_DETAILS_PRICE');return n;};
 result.depositAmount=money(input.depositAmount);
 result.deliveryFee=money(input.deliveryFee);result.longTermDiscountPercent=input.longTermDiscountPercent==null||input.longTermDiscountPercent===''?0:Number(input.longTermDiscountPercent);if(!Number.isInteger(result.longTermDiscountPercent)||result.longTermDiscountPercent<0||result.longTermDiscountPercent>90)throw Error('RENTAL_DETAILS_DISCOUNT');result.billingUnit=input.billingUnit||'DAY';if(!['DAY','WEEK','MONTH'].includes(result.billingUnit))throw Error('RENTAL_DETAILS_UNIT');result.periodPrice=money(input.periodPrice);if(result.billingUnit!=='DAY'&&!(result.periodPrice>0))throw Error('RENTAL_DETAILS_PRICE');
 for(const key of ['fees','extras']){const rows=input[key]??[];if(!Array.isArray(rows)||rows.length>6)throw Error('RENTAL_DETAILS_ROWS');result[key]=rows.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['name','description','amount','unit'].includes(k)))throw Error('RENTAL_DETAILS_ROW');
  if(typeof row.name!=='string'||!row.name.trim()||row.name.length>100||typeof (row.description??'')!=='string'||(row.description??'').length>500)throw Error('RENTAL_DETAILS_ROW');
  const unit=row.unit||'once';if(!RENTAL_PRICE_UNITS.includes(unit)||unit==='km'&&!['o-to','xe-may','xe-tai','xe-dap'].includes(category))throw Error('RENTAL_DETAILS_UNIT');
  return {name:row.name.trim(),description:(row.description||'').trim(),amount:money(row.amount),unit};
 });}
 return result;
}
export function readRentalDetails(listing){try{return normalizeRentalDetails(listing?.rentalDetails,listing?.category);}catch{return null;}}
