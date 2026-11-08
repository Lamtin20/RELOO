const SAFE_PATHS=new Set(['/noi-khu','/dashboard/orders','/dashboard/assets','/dashboard/profile/residency','/needs','/notifications','/notifications/neighborhood']);
export function mobileRentalDestination(value){
 try{const u=new URL(value);if(u.username||u.password)return null;let path=u.pathname;
  if(u.protocol==='reloo:'){
   if(u.hostname==='neighborhood')path='/noi-khu';
   else if(u.hostname==='rental'&&/^\/[a-f0-9-]{36}$/.test(path))return '/dashboard/orders?order='+encodeURIComponent(path.slice(1));
   else return null;
  }else if(u.protocol!=='https:'||!['reloo.vn','www.reloo.vn'].includes(u.hostname)||u.port)return null;
  path=path.replace('/dashboard/orders/neighborhood','/dashboard/orders').replace('/dashboard/assets/neighborhood','/dashboard/assets').replace('/needs/neighborhood','/needs');
  if(u.username||u.password||!SAFE_PATHS.has(path))return null;
  if(path.startsWith('/notifications'))return '/?notifications=1';
  const q=new URLSearchParams();for(const [k,v] of u.searchParams)if(['area','subzone','building','q','category','start','end','scope','order','need','lang'].includes(k)&&v.length<=200&&!/[\u0000-\u001f]/.test(v))q.set(k,v);
  return path+(q.size?'?'+q:'');
 }catch{return null;}
}
