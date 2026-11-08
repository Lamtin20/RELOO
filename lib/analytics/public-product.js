import {isPublicMarketplaceAsset} from '../catalog/public-listing.js';
import {publicTransactionMode} from '../marketplace-channels';
import {createSupabaseAdminClient} from '../supabase/admin';
import {listingImageSources} from '../listing-image-sources.js';
export async function publicSeoProduct(id){
 if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(id))return null;
 const db=createSupabaseAdminClient();if(!db)return null;
 const r=await db.from('assets').select('id,owner_id,title,description,category,images,daily_price,market_value,status,condition,is_locked,dispute_status,listing_data,created_at,updated_at').eq('id',id).maybeSingle();
 if(r.error||!isPublicMarketplaceAsset(r.data))return null;
 const a=r.data,c=a.listing_data||{};
 return {id:a.id,ownerId:a.owner_id,title:a.title,description:a.description||'',category:a.category,images:listingImageSources(a.images).map(src=>src.startsWith('/')?'https://reloo.vn'+src:src),dailyPrice:Number(a.daily_price),marketValue:Number(a.market_value),status:a.status,condition:a.condition,createdAt:a.created_at,updatedAt:a.updated_at,transactionMode:publicTransactionMode(c.transactionMode),salePrice:Number(c.salePrice||0),reviewCount:0,location:null,rentalDetails:c.rentalDetails||null};
}
