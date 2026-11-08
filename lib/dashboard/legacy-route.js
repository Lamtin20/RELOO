export function legacyWorkspaceDestination(kind,params={}){
 const base={orders:'/dashboard/orders',owner:'/dashboard/assets',needs:'/needs'}[kind]||'/';
 const allowed=kind==='orders'?['order','tab','page']:kind==='owner'?['create']:['need','area','create'];
 const query=new URLSearchParams();for(const key of allowed){const value=params[key];if(typeof value==='string'&&value.length<=150)query.set(key,value);}
 if(kind==='owner')query.set('setup','1');
 return base+(query.size?'?'+query:'');
}
