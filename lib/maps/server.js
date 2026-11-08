import {createSupabaseAdminClient} from '../supabase/admin.js';
import {publicFeature} from './spatial.js';
export async function searchMap(query,{db=createSupabaseAdminClient()}={}){
 if(query.domain!=='marketplace')return {ok:true,type:'FeatureCollection',features:[],cursor:'0',nextOffset:null,domain:query.domain,approximate:true,durationMs:0,state:'DOMAIN_NOT_LIVE'};
 if(!db)throw Error('MAP_DATABASE_UNAVAILABLE');
 const started=performance.now(),r=await db.rpc('reloo_map_search',{p_query:query});
 if(r.error)throw Error('MAP_DATABASE_UNAVAILABLE');
 const data=r.data||{},features=(data.rows||[]).map(publicFeature);
 return {ok:true,type:'FeatureCollection',features,cursor:String(data.cursor||'0'),nextOffset:data.more?query.offset+features.length:null,domain:query.domain,approximate:true,durationMs:Math.round(performance.now()-started),state:query.domain==='marketplace'?'LIVE':'DOMAIN_NOT_LIVE'};
}
