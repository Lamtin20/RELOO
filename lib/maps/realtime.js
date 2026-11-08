import {mapQuery,publicFeature,insideBounds,distanceMeters} from './spatial.js';
export function subscriptionMatches(row,query){
 if(row.visible!==true||row.domain!==query.domain||!insideBounds({lat:Number(row.latitude),lng:Number(row.longitude)},query.bbox))return false;
 if(query.ids&&!query.ids.includes(row.entity_id))return false;
 if(query.origin&&distanceMeters(query.origin,{lat:Number(row.latitude),lng:Number(row.longitude)})>query.radius)return false;
 return (!query.category||row.category===query.category)&&(!query.q||String(row.title).toLowerCase().includes(query.q.toLowerCase()))&&(query.mode==='ALL'||row.mode===query.mode||row.mode==='BOTH')&&Number(row.price)>=query.min&&Number(row.price)<=query.max;
}
export function mapDeltas(rows,query,seen){
 const changes=[];
 for(const row of rows){const id=row.feature_id,version=String(row.version);if(subscriptionMatches(row,query)){
  const feature=publicFeature({...row,id});changes.push({op:'upsert',id,version,feature});seen.add(id);
 }else if(seen.has(id)){changes.push({op:'remove',id,version});seen.delete(id);}}
 return changes;
}
// One durable outbox poll per backend process, regardless of subscriber count.
// All emitted rows are from the public approximate projection, never chat/private GPS.
export function installMapRealtime(io,{db,origin,intervalMs=2000,maxClients=200}={}){
 const namespace=io.of('/maps'),subscriptions=new Map();let busy=false,lastPrune=0;
 namespace.use((socket,next)=>{
  if(socket.handshake.headers.origin!==origin)return next(Error('ORIGIN_DENIED'));
  if(!db)return next(Error('MAP_DATABASE_UNAVAILABLE'));
  if(namespace.sockets.size>=maxClients)return next(Error('MAP_CAPACITY_LIMIT'));
  next();
 });
 const timer=setInterval(async()=>{
  if(busy||!db)return;busy=true;
  try{
   if(Date.now()-lastPrune>3600000){const pruned=await db.rpc('reloo_map_prune');if(!pruned.error)lastPrune=Date.now();}
   if(!subscriptions.size)return;
   const snapshot=[...subscriptions.entries()],after=snapshot.reduce((min,[,s])=>BigInt(s.cursor)<min?BigInt(s.cursor):min,BigInt(snapshot[0][1].cursor));
   const r=await db.rpc('reloo_map_changes',{p_after:after.toString()});if(r.error)throw Error('SOURCE_UNAVAILABLE');
   const rows=r.data?.events||[];
   for(const [socket,s] of snapshot){
    if(subscriptions.get(socket)!==s)continue;
    if(r.data?.reset||rows.length>500||socket.conn.transport.writable===false){socket.emit('map:reconcile',{reason:r.data?.reset||rows.length>500?'MISSED_EVENTS':'BACKPRESSURE'});subscriptions.delete(socket);continue;}
    const changes=mapDeltas(rows.filter(row=>BigInt(row.version)>BigInt(s.cursor)),s.query,s.seen);s.cursor=String(r.data?.cursor||s.cursor);
    if(s.seen.size>200){socket.emit('map:reconcile',{reason:'VIEWPORT_CAPACITY'});subscriptions.delete(socket);continue;}
    if(changes.length)socket.emit('map:delta',{schemaVersion:1,cursor:s.cursor,events:changes});
   }
  }catch{for(const [socket] of subscriptions)socket.emit('map:reconcile',{reason:'SOURCE_UNAVAILABLE'});subscriptions.clear();}
  finally{busy=false;}
 },intervalMs);timer.unref?.();
 namespace.on('connection',socket=>{
  let lastSubscribe=0;
  socket.on('map:subscribe',(input,ack)=>{
   try{
    if(Date.now()-lastSubscribe<800)throw Error('RATE_LIMITED');lastSubscribe=Date.now();
    if(!input||typeof input.query!=='string'||input.query.length>24000||!/^\d{1,19}$/.test(input.cursor||''))throw Error('INVALID_SUBSCRIPTION');
    if(!Array.isArray(input.ids)||input.ids.length>200||input.ids.some(id=>typeof id!=='string'||id.length>150))throw Error('INVALID_SUBSCRIPTION');
    subscriptions.set(socket,{query:mapQuery(new URLSearchParams(input.query)),cursor:input.cursor,seen:new Set(input.ids)});
    ack?.({ok:true,heartbeatMs:intervalMs});
   }catch{subscriptions.delete(socket);ack?.({ok:false,code:'INVALID_SUBSCRIPTION'});}
  });
  socket.on('disconnect',()=>subscriptions.delete(socket));
 });
 return {namespace,close:()=>{clearInterval(timer);subscriptions.clear()}};
}

