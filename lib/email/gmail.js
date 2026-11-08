import {renderEmail} from './templates.js';
export async function sendGmail(config,to,content,{fetcher=fetch}={}){
 if(!['GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN'].every(k=>config[k])||!config.sender)throw Error('GMAIL_NOT_CONFIGURED');
 if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to)||! /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(config.sender))throw Error('EMAIL_ADDRESS_INVALID');
 const token=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.GMAIL_CLIENT_ID,client_secret:config.GMAIL_CLIENT_SECRET,refresh_token:config.GMAIL_REFRESH_TOKEN,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});
 const auth=await token.json();if(!token.ok||!auth.access_token)throw Error('GMAIL_AUTH_REQUIRED');
 const rendered=renderEmail(content),boundary='reloo_alternative',encode=v=>Buffer.from(v).toString('base64');
 const mime=[`From: RELOO <${config.sender}>`,`To: ${to}`,`Subject: =?UTF-8?B?${encode(rendered.subject)}?=`,'MIME-Version: 1.0',`Content-Type: multipart/alternative; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',encode(rendered.text),`--${boundary}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',encode(rendered.html),`--${boundary}--`].join('\r\n');
 const sent=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+auth.access_token,'Content-Type':'application/json'},body:JSON.stringify({raw:Buffer.from(mime).toString('base64url')}),signal:AbortSignal.timeout(20000)});
 if(!sent.ok)throw Error('GMAIL_DELIVERY_FAILED');const data=await sent.json();return {providerId:data.id};
}
