export function authCallbackOrigin(request,environment=process.env){
 // Next's internal request URL can use the backend hostname. The edge preserves
 // Host; accept only the two explicitly supported public origins.
 const host=(request.headers.get('host')||'').toLowerCase().split(':')[0];
 const url=new URL(request.url);
 const hostname=['reloo.vn','crm.reloo.vn'].includes(host)?host:url.hostname;
 if(['reloo.vn','crm.reloo.vn'].includes(hostname))return 'https://'+hostname;
 if(environment.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(url.hostname))return url.origin;
 return environment.APP_ORIGIN||'https://reloo.vn';
}
