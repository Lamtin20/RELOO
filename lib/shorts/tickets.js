import { createHmac,randomUUID,timingSafeEqual } from "node:crypto";
const LIFETIME=15*60*1000,METRIC_LIFETIME=2*60*60*1000;
function signature(body,purpose){const key=process.env.RELOO_PRIVATE_DATA_KEY;if(!/^[a-f0-9]{64}$/i.test(key||''))throw Error('SHORT_TICKET_KEY_REQUIRED');return createHmac('sha256',Buffer.from(key,'hex')).update('shorts:'+purpose+':'+body).digest('base64url');}
function seal(data,purpose){const body=Buffer.from(JSON.stringify(data)).toString('base64url');return body+'.'+signature(body,purpose);}
export function readShortTicket(token,purpose,now=Date.now()){
 try{if(typeof token!=='string'||token.length>3000)return null;const parts=token.split('.');if(parts.length!==2)return null;const a=Buffer.from(parts[1],'base64url'),b=Buffer.from(signature(parts[0],purpose),'base64url');if(a.length!==b.length||!timingSafeEqual(a,b))return null;const data=JSON.parse(Buffer.from(parts[0],'base64url'));if(data.kind!==purpose||!Number.isInteger(data.expires)||data.expires<=now||data.expires>now+(purpose==='metrics'?METRIC_LIFETIME:LIFETIME)+30000||!Number.isInteger(data.issued)||data.issued>now+30000||!/^[-a-f0-9]{36}$/i.test(data.videoId))return null;return data;}catch{return null;}
}
export function shortPlaybackTicket(video,viewerId=null,now=Date.now()){
 return {ticket:seal({kind:'play',videoId:video.id,mediaId:video.media_id,viewerId,issued:now,expires:now+LIFETIME},'play'),expiresAt:now+LIFETIME};
}
export function shortMetricTicket(video,products,now=Date.now()){
 return seal({kind:'metrics',videoId:video.id,nonce:randomUUID(),products:products.map(p=>p.id),issued:now,expires:now+METRIC_LIFETIME},'metrics');
}
