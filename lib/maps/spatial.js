export const MAP_DOMAINS=['marketplace','stays','jobs','neighborhood','services'];
export function coordinate(value){
 if(!value||typeof value!=='object'||!Number.isFinite(value.lat)||!Number.isFinite(value.lng)||Math.abs(value.lat)>85||Math.abs(value.lng)>180)throw Error('MAP_COORDINATE_INVALID');
 return {lat:value.lat,lng:value.lng};
}
// Stable kilometre-scale cells; never use decimal rounding as a precision label.
export function approximatePoint(value){const p=coordinate(value);return {lat:Math.min(84.995,Math.max(-84.995,Math.floor(p.lat*100)/100+.005)),lng:Math.min(179.995,Math.max(-179.995,Math.floor(p.lng*100)/100+.005)),accuracyMeters:1600,approximate:true};}
export function bounds(value){
 const b=typeof value==='string'?value.split(',').map(Number):value;
 if(!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[0]<-180||b[2]>180||b[1]<-85||b[3]>85||b[0]>=b[2]||b[1]>=b[3]||b[2]-b[0]>5||b[3]-b[1]>5)throw Error('MAP_BOUNDS_INVALID');
 return b;
}
export function mapQuery(params){
 const b=bounds(params.get('bbox')),domain=params.get('domain')||'marketplace',mode=params.get('transaction')||'ALL';
 if(!MAP_DOMAINS.includes(domain)||!['ALL','RENT','SALE','BOTH'].includes(mode))throw Error('MAP_FILTER_INVALID');
 const category=params.get('category')||'',q=(params.get('q')||'').trim(),limit=Number(params.get('limit')||100),offset=Number(params.get('offset')||0),min=Number(params.get('min')||0),max=Number(params.get('max')||1000000000);
 if(category&&!/^[a-z0-9-]{1,60}$/.test(category)||q.length>100||!Number.isInteger(limit)||limit<1||limit>200||!Number.isInteger(offset)||offset<0||offset>2000||!Number.isSafeInteger(min)||min<0||!Number.isSafeInteger(max)||max<min||max>1000000000)throw Error('MAP_FILTER_INVALID');
 let origin=null,radius=null;
 if(params.has('lat')||params.has('lng')||params.has('radius')){if(!params.get('lat')||!params.get('lng')||!params.get('radius'))throw Error('MAP_RADIUS_INVALID');origin=coordinate({lat:Number(params.get('lat')),lng:Number(params.get('lng'))});radius=Number(params.get('radius'));if(!Number.isFinite(radius)||radius<100||radius>50000)throw Error('MAP_RADIUS_INVALID');}
 let polygon=null;
 if(params.has('polygon')){try{polygon=JSON.parse(params.get('polygon'));}catch{throw Error('MAP_POLYGON_INVALID');}if(!Array.isArray(polygon)||polygon.length<4||polygon.length>100||polygon.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||!insideBounds({lng:p[0],lat:p[1]},b))||polygon[0][0]!==polygon.at(-1)[0]||polygon[0][1]!==polygon.at(-1)[1])throw Error('MAP_POLYGON_INVALID');}
 let ids=null;if(params.has('ids')){try{ids=JSON.parse(params.get('ids'));}catch{throw Error('MAP_IDS_INVALID');}if(!Array.isArray(ids)||ids.length>200||ids.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id)))throw Error('MAP_IDS_INVALID');ids=[...new Set(ids)];}
 return {bbox:b,domain,mode,category,q,limit,offset,min,max,origin,radius,polygon,ids};
}
export function distanceMeters(a,b){a=coordinate(a);b=coordinate(b);const r=Math.PI/180,x=(b.lat-a.lat)*r,y=(b.lng-a.lng)*r,h=Math.sin(x/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)**2;return 6371008.8*2*Math.asin(Math.sqrt(Math.min(1,h)));}
export function insideBounds(point,b){return point.lng>=b[0]&&point.lng<=b[2]&&point.lat>=b[1]&&point.lat<=b[3];}
export function publicFeature(row){
 const p=coordinate({lat:Number(row.latitude),lng:Number(row.longitude)});
 // Only the dedicated approximate projection is accepted, never asset.coords.
 if(row.approximate!==true||!Number.isFinite(Number(row.accuracy_meters))||Number(row.accuracy_meters)<1000||typeof row.id!=='string'||!MAP_DOMAINS.includes(row.domain))throw Error('MAP_PROJECTION_INVALID');
 return {type:'Feature',id:row.id,geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{id:row.id,domain:row.domain,title:String(row.title||'').slice(0,160),category:String(row.category||'').slice(0,60),price:Number(row.price)||0,unit:String(row.price_unit||'').slice(0,20),image:typeof row.image==='string'&&/^\/(?:api\/media|images)\//.test(row.image)?row.image:null,area:String(row.area||'').slice(0,250),approximate:true,accuracyMeters:Number(row.accuracy_meters),version:String(row.version||'0'),href:featureHref(row)}};
}
export function featureHref(row){const id=encodeURIComponent(row.entity_id||row.id);return row.domain==='marketplace'?'/product/'+id:row.domain==='stays'?'/dat-phong':row.domain==='jobs'?'/viec-lam':row.domain==='services'?'/viec-lam/dich-vu':'/noi-khu';}
export function mapListingHref(feature,query=''){
 const base=feature.properties.href;if(feature.properties.domain!=='marketplace')return base;
 const params=new URLSearchParams(query),safe=new URLSearchParams();
 for(const key of ['start','end','pickupTime','returnTime'])if(params.has(key)&&params.get(key).length<=20)safe.set(key,params.get(key));
 if(params.get('transaction')==='SALE')safe.set('intent','SALE');
 return base+(safe.size?'?'+safe:'');
}
export function applyMapDelta(collection,events){
 const next=new Map((collection.features||[]).map(f=>[String(f.id),f]));
 const versions=new Map(Object.entries(collection.revisions||{}));
 for(const event of events){if(!/^\d{1,19}$/.test(String(event.version)))continue;const id=String(event.id),old=next.get(id),version=versions.get(id)||old?.properties.version||'0';if(BigInt(version)>=BigInt(event.version))continue;versions.set(id,String(event.version));if(event.op==='remove')next.delete(id);else if(event.feature){next.set(id,event.feature);}}
 // Bounded retained tombstones prevent replay resurrection between reconciliations.
 while(versions.size>2000)versions.delete(versions.keys().next().value);
 return {type:'FeatureCollection',features:[...next.values()],revisions:Object.fromEntries(versions)};
}
