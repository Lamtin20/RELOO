export function socketCookieToken(header=''){
 if(typeof header!=='string'||header.length>32768)return null;
 const groups=new Map();
 for(const entry of header.split(';')){
  const index=entry.indexOf('=');if(index<0)continue;
  const name=entry.slice(0,index).trim(),match=name.match(/^(sb-[a-zA-Z0-9_-]+-auth-token)(?:\.(\d+))?$/);if(!match)continue;
  const chunks=groups.get(match[1])||[];chunks.push({index:match[2]===undefined?-1:Number(match[2]),value:entry.slice(index+1).trim()});groups.set(match[1],chunks);
 }
 for(const chunks of groups.values()){
  try{
   let value=chunks.sort((a,b)=>a.index-b.index).map(c=>c.value).join('');value=decodeURIComponent(value);
   if(value.startsWith('base64-'))value=Buffer.from(value.slice(7),'base64url').toString('utf8');
   const session=JSON.parse(value),token=Array.isArray(session)?session[0]:session.access_token;
   if(typeof token==='string'&&token.length<=10000)return token;
  }catch{/* Invalid or unrelated cookies cannot authenticate a socket. */}
 }
 return null;
}
