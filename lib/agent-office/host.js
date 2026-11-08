export const AGENT_HOST='agent.reloo.vn';
export function isAgentHost(request){return (request.headers.get('host')||new URL(request.url).hostname).toLowerCase().split(':')[0]===AGENT_HOST;}
export function officePathAllowed(path){return path==='/'||path==='/robots.txt'||path==='/favicon.ico'||path==='/api/health'||path==='/licenses/my-office-MIT.txt'||/^\/(?:agent-office|_next|brand|images)(?:\/|$)/.test(path)||/^\/api\/auth(?:\/|$)/.test(path)||['/api/crm/agent-office','/api/crm/access','/api/crm/session','/api/profile/language','/api/brand'].includes(path);}
