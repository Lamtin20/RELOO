export const CHAT_HOST='chat.reloo.vn';
export function isChatHost(request){return (request.headers.get('host')||new URL(request.url).hostname).toLowerCase().split(':')[0]===CHAT_HOST;}
export function chatHostConfigured(env=process.env){return env.RELOO_CHAT_CONTROL_HOST===CHAT_HOST&&(env.RELOO_ENVIRONMENT==='staging'&&env.APP_ORIGIN==='https://staging.reloo.vn'||env.RELOO_MANAGEMENT_SSO==='production'&&env.RELOO_ENVIRONMENT!=='staging'&&env.APP_ORIGIN==='https://reloo.vn'&&env.CRM_ORIGIN==='https://crm.reloo.vn');}
export function controlPathAllowed(path,method='GET'){
 if(path==='/'||path==='/robots.txt'||path==='/favicon.ico'||path==='/apple-icon.png'||path==='/api/health'||path==='/api/mobile/runtime')return true;
 if(/^\/(?:chat-control|_next|brand|images)(?:\/|$)/.test(path))return true;
 if(/^\/api\/(?:brand|auth)(?:\/|$)/.test(path))return true;
 if(['/api/crm/access','/api/crm/session','/api/profile/language'].includes(path)||path.startsWith('/api/crm/ai/'))return true;
 return path==='/api/crm/conversations'&&method==='POST';
}
