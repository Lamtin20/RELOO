import {buildEmptySpecs} from '../category-specs.js';
export const PHOTO_ASSIST_NOTICE='listing-photo-assist-v2';
export const TECH_CATEGORIES=['am-thanh','may-anh','may-quay','livestream','dien-tu','laptop-pc','dien-thoai','gaming','may-chieu'];
export const PRODUCT_BRANDS=['Marshall','Apple','Samsung','Sony','Canon','Nikon','DJI','Fujifilm','Panasonic','Olympus','OM System','GoPro','Insta360','Dell','HP','Lenovo','ASUS','Acer','MSI','Microsoft','LG','Xiaomi','OPPO','Vivo','Google','Nothing','OnePlus','Bose','JBL','Epson','BenQ','Anker','Logitech','Razer','Nintendo','Valve'];
const normalize=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/α/g,'alpha').replace(/[^a-z0-9]/g,'');
const evidenceText=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
export function exactProductModel(model,value){const clean=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/α/g,'alpha'),tokens=clean(model).match(/[a-z0-9]+/g);return !!tokens?.length&&new RegExp('(?:^|[^a-z0-9])'+tokens.join('[^a-z0-9]*')+'(?=$|[^a-z0-9])').test(clean(value));}
export const MANUFACTURER_HOSTS=['marshall.com','apple.com','samsung.com','sony.com','sony.com.vn','sony.co.uk','sony-asia.com','canon.com','canon.com.vn','canon-europe.com','nikon.com','nikonusa.com','dji.com','fujifilm.com','panasonic.com','explore.omsystem.com','gopro.com','insta360.com','dell.com','hp.com','lenovo.com','asus.com','acer.com','msi.com','microsoft.com','lg.com','mi.com','oppo.com','vivo.com','store.google.com','support.google.com','nothing.tech','oneplus.com','bose.com','jbl.com','epson.com','epson.com.vn','benq.com','anker.com','logitech.com','razer.com','nintendo.com','steampowered.com'];
export const BRAND_HOSTS={Marshall:['marshall.com'],Apple:['apple.com'],Samsung:['samsung.com'],Sony:['sony.com','sony.com.vn','sony.co.uk','sony-asia.com'],Canon:['canon.com','canon.com.vn','canon-europe.com'],Nikon:['nikon.com','nikonusa.com'],DJI:['dji.com'],Fujifilm:['fujifilm.com'],Panasonic:['panasonic.com'],Olympus:['explore.omsystem.com'],'OM System':['explore.omsystem.com'],GoPro:['gopro.com'],Insta360:['insta360.com'],Dell:['dell.com'],HP:['hp.com'],Lenovo:['lenovo.com'],ASUS:['asus.com'],Acer:['acer.com'],MSI:['msi.com'],Microsoft:['microsoft.com'],LG:['lg.com'],Xiaomi:['mi.com'],OPPO:['oppo.com'],Vivo:['vivo.com'],Google:['store.google.com','support.google.com'],Nothing:['nothing.tech'],OnePlus:['oneplus.com'],Bose:['bose.com'],JBL:['jbl.com'],Epson:['epson.com','epson.com.vn'],BenQ:['benq.com'],Anker:['anker.com'],Logitech:['logitech.com'],Razer:['razer.com'],Nintendo:['nintendo.com'],Valve:['steampowered.com']};
export function officialProductUrl(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||u.href.length>1000||!MANUFACTURER_HOSTS.some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))return null;u.hash='';return u.href;}catch{return null}}
export function productIdentity(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('IDENTITY_INVALID');
 const brand=PRODUCT_BRANDS.find(b=>normalize(b)===normalize(value.brand));let model=typeof value.model==='string'?value.model.trim():'';
 if(PRODUCT_BRANDS.some(other=>other!==brand&&new RegExp('(?:^|[^\\p{L}\\p{N}])'+other.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^\\p{L}\\p{N}])','iu').test(model)))throw Error('IDENTITY_CONFLICT');
 model=model.replace(/^(?:loa|speaker|headphones?|máy ảnh|camera)\s+/i,'');
 if(brand&&model.toLowerCase().startsWith(brand.toLowerCase()+' '))model=model.slice(brand.length).trim();
 if(brand==='Marshall')model=model.replace(/^(Acton|Stanmore|Woburn|Kilburn|Stockwell)\s+2$/i,'$1 II').replace(/^(Acton|Stanmore|Woburn|Kilburn|Stockwell)\s+3$/i,'$1 III');
 if(['Marshall','Bose','JBL'].includes(brand)&&!['am-thanh','dien-tu'].includes(value.category))throw Error('IDENTITY_CONFLICT');
 if(/^(?:Acton|Stanmore|Woburn|Kilburn|Stockwell|Emberton|Middleton|Tufton)(?:\s|$)/i.test(model)&&brand!=='Marshall')throw Error('IDENTITY_CONFLICT');
 if(!brand||!TECH_CATEGORIES.includes(value.category)||model.length>80||/[\u0000-\u001f<>@]|https?:|www\.|\b(?:tokens?|password|otp)\b|(?:\d[ .-]?){9}/i.test(model)||model&&(!/^[\p{L}\p{N} ._()+/−-]+$/u.test(model)||!/[0-9]/.test(model)&&!/^(?:(?:Acton|Stanmore|Woburn|Kilburn|Stockwell|Emberton|Willen|Middleton|Tufton|Major|Minor|Monitor|Motif)(?: [IVX]+)?|switch(?: oled| lite)?|steam deck(?: oled)?|xbox series [xs])$/i.test(model)))throw Error('IDENTITY_INVALID');
 return {brand,model,category:value.category};
}
export const visionSchema={type:'object',additionalProperties:false,required:['brand','model','category','confidence','visibleModel','candidates'],properties:{brand:{type:'string',maxLength:40},model:{type:'string',maxLength:80},category:{type:'string',enum:['',...TECH_CATEGORIES]},confidence:{type:'number',minimum:0,maximum:1},visibleModel:{type:'boolean'},candidates:{type:'array',maxItems:3,items:{type:'string',maxLength:80}}}};
export function visualSuggestion(value){
 const empty={status:'NEEDS_DETAIL',identity:null,candidates:[],patch:{},sources:[],reviewRequired:true};
 let identity;try{const model=String(value?.model||'');let category=value?.category;
  if(value?.brand==='Sony'&&/^(?:ILCE[- ]|DSC[- ]|Alpha\s*\d|A[679]\s*(?:I|V|\d))/i.test(model))category='may-anh';
  if(value?.brand==='Apple'&&/^iPhone\s*\d/i.test(model))category='dien-thoai';
  if(value?.brand==='Apple'&&/^(?:MacBook|iMac|Mac Mini|Mac Studio)/i.test(model))category='laptop-pc';
  identity=productIdentity({...value,category});}catch{return empty}
 const confident=Number.isFinite(value.confidence)&&value.confidence>=.85&&value.visibleModel===true&&identity.model;
 const candidates=[...new Set((Array.isArray(value.candidates)?value.candidates:[]).map(model=>{try{return productIdentity({...identity,model}).model}catch{return ''}}).filter(Boolean))].slice(0,3);
 // Identification is a proposal, not an instruction to mutate the listing.
 return {...empty,status:confident?'IDENTIFIED':'NEEDS_DETAIL',identity:confident?identity:{...identity,model:''},candidates:confident?[]:candidates,patch:{}};
}
export function factSchema(){return {type:'object',additionalProperties:false,required:['facts'],properties:{facts:{type:'array',maxItems:6,items:{type:'object',additionalProperties:false,required:['field','value','evidence','sourceIndex'],properties:{field:{type:'string',enum:['sensor','specs']},value:{type:'string',maxLength:120},evidence:{type:'string',maxLength:200},sourceIndex:{type:'integer',minimum:0,maximum:2}}}}}}}
export function verifiedProductPatch(identity,input,sources,locale='vi-VN'){
 const known=productIdentity(identity),safeSources=(Array.isArray(sources)?sources:[]).slice(0,3).map((s,index)=>({...s,index,url:officialProductUrl(s.url)})).filter(s=>s.url&&BRAND_HOSTS[known.brand]?.some(h=>new URL(s.url).hostname===h||new URL(s.url).hostname.endsWith('.'+h))&&typeof s.text==='string'&&known.model&&exactProductModel(known.model,s.text+' '+s.title));
 let facts=[];for(const fact of Array.isArray(input?.facts)?input.facts:[]){
  if(!['sensor','specs','power'].includes(fact.field)||!Object.hasOwn(buildEmptySpecs(known.category),fact.field)||typeof fact.value!=='string'||fact.value.length>120||typeof fact.evidence!=='string'||fact.evidence.length>200||!Number.isInteger(fact.sourceIndex))continue;
  if(/\b(?:RAM|SSD|DDR\d*|storage|\d+(?:[.,]\d+)?\s*(?:GB|TB))\b|dung lượng|bộ nhớ/i.test(fact.value))continue;
  if(/[₫$€]|USD|VND|price|warranty|authentic|shutter count|battery health|bảo hành|giá bán|tình trạng|phụ kiện/i.test(fact.value))continue;
  const source=safeSources.find(s=>s.index===fact.sourceIndex);if(!source||!evidenceText(source.text).includes(evidenceText(fact.evidence))||!evidenceText(fact.evidence).includes(evidenceText(fact.value))||evidenceText(fact.value).length<2)continue;
  facts.push({...fact,value:fact.value.trim(),url:source.url});if(facts.length===6)break;
 }
 const unresolvedFields=[...new Set(facts.map(f=>f.field))].filter(field=>new Set(facts.filter(f=>f.field===field).map(f=>evidenceText(f.value))).size>1);
 facts=facts.filter(f=>!unresolvedFields.includes(f.field));
 const fields=buildEmptySpecs(known.category),specs={brand:known.brand,...(Object.hasOwn(fields,'model')?{model:known.model}:{}),...(known.category==='am-thanh'?{type:'Loa / '+known.model}:{})};for(const f of facts)if(Object.hasOwn(fields,f.field)&&!specs[f.field])specs[f.field]=f.value;
 const names=locale==='en-US'?{'am-thanh':'Audio equipment','may-anh':'Camera','may-quay':'Video camera',livestream:'Livestream equipment','dien-tu':'Electronics','laptop-pc':'Computer','dien-thoai':'Phone',gaming:'Game console','may-chieu':'Projector'}:{'am-thanh':'Thiết bị âm thanh','may-anh':'Máy ảnh','may-quay':'Máy quay',livestream:'Thiết bị livestream','dien-tu':'Thiết bị điện tử','laptop-pc':'Máy tính','dien-thoai':'Điện thoại',gaming:'Máy chơi game','may-chieu':'Máy chiếu'};
 const title=known.brand+' '+known.model,description=[names[known.category]+' '+title+'.',...Object.entries(specs).filter(([k])=>['sensor','specs','power'].includes(k)).map(([k,v])=>(locale==='en-US'?{sensor:'Sensor',specs:'Specifications',power:'Amplifier'}:{sensor:'Cảm biến',specs:'Thông số',power:'Bộ khuếch đại'})[k]+': '+v)].join('\n');
 return {status:facts.length?'SOURCED':'IDENTIFIED',identity:known,patch:{title,category:known.category,specs,...(description?{description}:{})},sources:[...new Set(facts.map(f=>f.url))].map(url=>({url,title:safeSources.find(s=>s.url===url)?.title||known.brand,retrievedAt:safeSources.find(s=>s.url===url)?.retrievedAt})),unresolvedFields,reviewRequired:true};
}
// Visual output stays a proposal until its exact label is supported. This helper
// permits automatic draft filling for that case; it never grants publication.
export function automaticPhotoSuggestion(value,locale='vi-VN'){
 if(value?.status!=='IDENTIFIED'||!value.identity?.model)return null;
 try{return {...verifiedProductPatch(value.identity,{facts:[]},[],locale),evidence:'PHOTO_LABEL'};}catch{return null;}
}
export function mergePhotoSuggestion(current,suggestion,protectedFields=[]){
 const blocked=new Set(protectedFields),next={form:{...current.form},specs:{...current.specs}},patch=suggestion?.patch||{};
 if((current.form.category||blocked.has('category'))&&current.form.category!==patch.category)return next;
 if(current.specs.brand&&normalize(current.specs.brand)!==normalize(patch.specs?.brand))return next;
 if(current.specs.model&&normalize(current.specs.model)!==normalize(patch.specs?.model))return next;
 if(blocked.has('specs.model')&&current.specs.model&&normalize(current.specs.model)!==normalize(patch.specs?.model))return next;
 const can=key=>!blocked.has(key)&&!String(current.form[key]||'').trim();
 let category=current.form.category;
 if(can('category')&&TECH_CATEGORIES.includes(patch.category)){category=patch.category;next.form.category=category;next.specs={...buildEmptySpecs(category),...current.specs};}
 for(const key of ['title','description'])if(can(key)&&typeof patch[key]==='string'&&patch[key].trim())next.form[key]=patch[key].slice(0,key==='title'?160:1200);
 if(category===patch.category){const fields=buildEmptySpecs(category);for(const key of ['brand','model','sensor','specs','type','power'])if(Object.hasOwn(fields,key)&&!blocked.has('specs.'+key)&&!String(current.specs[key]||'').trim()&&typeof patch.specs?.[key]==='string')next.specs[key]=patch.specs[key].slice(0,160);}
 return next;
}
