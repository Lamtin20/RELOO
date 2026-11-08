import {validateProductEvent} from './dictionary.js';
export function classifyVisit({userAgent='',purpose='',actor=null,owner=null,test=false}){
 if(test)return 'INTERNAL_TEST';if(/preview|prefetch/i.test(purpose))return 'PREVIEW';if(/bot|crawler|spider|headless|facebookexternalhit|gptbot|claudebot/i.test(userAgent))return 'KNOWN_AUTOMATION';if(actor&&owner&&actor===owner)return 'OWNER_SELF';return null;
}
export async function collectProductEvent(request,data,{db,hash,actor=null,test=false}){
 const d=validateProductEvent(data),asset=await db.from('assets').select('id,owner_id,status,listing_data').eq('id',d.assetId).maybeSingle();
 if(asset.error)throw Error('ANALYTICS_STORAGE_UNAVAILABLE');if(!asset.data)throw Error('ASSET_NOT_FOUND');
 const reason=classifyVisit({userAgent:request.headers.get('user-agent')||'',purpose:request.headers.get('purpose')||request.headers.get('sec-purpose')||'',actor,owner:asset.data.owner_id,test});
 const record={event_id:d.eventId,event:d.event,asset_id:d.assetId,schema_version:2,observed_at:d.observedAt,visitor_hash:hash('VISITOR',d.visitorId),session_hash:hash('JOURNEY_SESSION',d.sessionId),actor_hash:actor?hash('MEASUREMENT_ACTOR',actor):null,path:'/product/:id',placement:d.placement,duration_ms:d.durationMs,device:d.device,touch:d.touch,exclusion_reason:reason};
 const r=await db.rpc('reloo_product_event',{p_event:record});if(r.error)throw Error('ANALYTICS_STORAGE_UNAVAILABLE');return r.data;
}
