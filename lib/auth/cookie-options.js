export function authCookieOptions(environment=process.env){
 // Host-only: application sessions must not be sent to the OAuth gateway.
 // Sliding persistence is renewed by verified server-side refreshes.
 return {path:'/',sameSite:'lax',secure:environment.NODE_ENV==='production',httpOnly:true,maxAge:365*86400};
}
export function legacyAuthCookieHeaders(cookies,hostname){
 if(!['reloo.vn','www.reloo.vn','crm.reloo.vn','chat.reloo.vn'].includes(hostname))return [];
 return [...new Set(cookies.filter(c=>/^sb-[a-zA-Z0-9_-]+(?:\.\d+)?$/.test(c.name)).map(c=>c.name))].map(name=>`${name}=; Path=/; Domain=reloo.vn; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}
