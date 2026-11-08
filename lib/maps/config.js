const blocked=host=>host==='tile.openstreetmap.org'||host.endsWith('.tile.openstreetmap.org')||host==='nominatim.openstreetmap.org'||host==='router.project-osrm.org'||host==='demotiles.maplibre.org';
export function resourceUrl(raw,env=process.env){
 const url=new URL(raw),hosts=(env.RELOO_MAP_RESOURCE_HOSTS||'').split(',').map(h=>h.trim()).filter(Boolean);
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||url.hash||url.href.length>3000||blocked(url.hostname)||!hosts.includes(url.hostname))throw Error('MAP_PROVIDER_URL_INVALID');
 return url;
}
export function mapConfiguration(env=process.env){
 const approved=env.RELOO_MAP_PROVIDER_APPROVED==='1';let available=false;
 try{available=approved&&(env.RELOO_MAP_MODE!=='self-hosted'||env.RELOO_MAP_SELF_HOSTED_READY==='1')&&!!resourceUrl(env.RELOO_MAP_STYLE_URL,env)&&typeof env.RELOO_MAP_ATTRIBUTION==='string'&&env.RELOO_MAP_ATTRIBUTION.trim().length>0;}catch{}
 return {enabled:available,provider:available?(env.RELOO_MAP_PROVIDER_NAME||'Configured vector provider'):'unconfigured',attribution:available?env.RELOO_MAP_ATTRIBUTION.slice(0,300):'',style:available?'/api/maps/style':null,geocoding:approved&&!!env.RELOO_MAP_GEOCODE_URL,routing:approved&&!!env.RELOO_MAP_ROUTE_URL,localFonts:env.RELOO_MAP_MODE==='self-hosted',domains:{marketplace:'AVAILABLE',stays:'BLOCKED_LIVE_BOOKING',jobs:'BLOCKED_LIVE_JOBS',neighborhood:'REQUIRES_REVIEWED_PROJECTION',services:'SANDBOX_ONLY'},approximationMeters:1600};
}
