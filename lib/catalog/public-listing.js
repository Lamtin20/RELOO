import {mapAssetRow} from '../db/map-from-db.js';
const publicKeys=['id','ownerId','title','description','category','images','dailyPrice','marketValue','condition','status','createdAt','updatedAt','labels','rating','reviewCount','isBoosted','viewCount','specs','trustBadges','nftPassport','transactionMode','salePrice','deposit','localBrandId','localBrandName','rentalDetails','isLocked','disputeStatus','saleStatus','neighborhoodOnly'];
export function isPublicMarketplaceAsset(row){return !!row&&['available','rented'].includes(row.status)&&!row.is_locked&&!['OPEN','DISPUTED','ACTIVE','PENDING'].includes(String(row.dispute_status||'').toUpperCase())&&!row.listing_data?.neighborhoodOnly&&row.listing_data?.saleStatus!=='SOLD';}
function area(value){if(!value||typeof value!=='object'||typeof value.name!=='string')return null;return {code:typeof value.code==='number'&&Number.isSafeInteger(value.code)?value.code:String(value.code??'').slice(0,30),name:value.name.replace(/[\u0000-\u001f]/g,'').slice(0,120)};}
export function publicAreaLabel(raw=''){return String(raw).split(',').map(s=>s.trim()).filter(s=>/^(?:Phường\s|P\.\s|Xã\s|Quận\s|Huyện\s|Tỉnh\s|Thành phố\s|TP\.?\s?)/iu.test(s)&&!/(?:đường|căn hộ|số nhà|\b(?:apt|room)\b)/iu.test(s)).join(', ').slice(0,300);}
export function publicListingProjection(mapped,{canModerate=false}={}){
 if(!mapped)return null;if(!canModerate&&!isPublicMarketplaceAsset({status:mapped.status,is_locked:mapped.isLocked,dispute_status:mapped.disputeStatus,listing_data:mapped}))return null;
 const province=area(mapped.locationDetails?.province),ward=area(mapped.locationDetails?.ward),label=[ward?.name,province?.name].filter(Boolean).join(', ')||publicAreaLabel(mapped.location);
 return {...Object.fromEntries(publicKeys.filter(k=>mapped[k]!==undefined).map(k=>[k,mapped[k]])),location:label,locationDetails:{province,ward},ownerDetailsAvailable:false};
}
export function marketplaceAsset(row,passport,{viewerId=null,canModerate=false,canViewRelated=false}={}){
 if(!row)return null;const owner=typeof viewerId==='string'&&viewerId.length>0&&row.owner_id===viewerId;if(!owner&&!canModerate&&!canViewRelated&&!isPublicMarketplaceAsset(row))return null;
 const mapped=mapAssetRow(row,passport);return owner?{...mapped,ownerDetailsAvailable:true}:publicListingProjection(mapped,{canModerate:canModerate||canViewRelated});
}
export function publicActorState(state){const keys=['id','name','avatar','role','kycLevel','trustScore','joinedAt','rating','reviewCount','responseRate'];return {listings:(state.listings||[]).map(x=>publicListingProjection(x)).filter(Boolean),users:(state.users||[]).map(p=>Object.fromEntries(keys.filter(k=>p[k]!==undefined).map(k=>[k,k==='role'&&p[k]==='admin'?'renter':p[k]]))),orders:[],chatThreads:[],dbSynced:false,dbError:null};}
export function bootstrapMatchesActor(payload,actor){const id=actor||null;if(Object.hasOwn(payload,'requestActorId')&&(payload.requestActorId||null)!==id)return false;return !Object.hasOwn(payload,'viewerId')||payload.viewerId==null||payload.viewerId===id;}
