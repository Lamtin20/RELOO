import { shortMetricTicket,shortPlaybackTicket } from './tickets.js';
export function shortDto(row,media,assets,viewerId=null,mine=false){
 const products=row.short_video_products.filter(p=>p.kind==='RENTAL').sort((a,b)=>a.position-b.position).map(p=>{const asset=assets.get(p.asset_id);return asset?.status==='available'&&!asset.is_locked?{id:p.id,kind:'RENTAL',asset_id:asset.id,title:asset.title,href:'/product/'+encodeURIComponent(asset.id),price:String(asset.daily_price),image:asset.images?.[0]}:null;}).filter(Boolean);
 const playback=row.status==='PUBLISHED'?shortPlaybackTicket(row,viewerId):null;
 const query=new URLSearchParams({v:String(media?.stream_version||1)});if(playback)query.set('ticket',playback.ticket);
 const base='/api/shorts/media/'+row.media_id;
 return {id:row.id,creatorId:row.profile_id,creator:row.profiles?.name||'Thành viên RELOO',caption:row.caption,status:row.status,version:row.version,
  reviewReason:mine?row.review_reason:undefined,autoRuleCodes:mine?row.auto_rule_codes:undefined,mediaStatus:media?.status||'PROCESSING',duration:Number(media?.duration||0),mediaUrl:base+'?'+query,
  hlsUrl:media?.hls_ready?base+'/master.m3u8?'+query:null,posterUrl:media?.poster_filename?base+(media.poster_filename.endsWith('.webp')?'/poster.webp?':'/poster.jpg?')+query:null,
  expiresAt:playback?.expiresAt||null,metricTicket:!mine&&row.status==='PUBLISHED'&&viewerId!==row.profile_id?shortMetricTicket(row,products):null,products,createdAt:row.created_at};
}
