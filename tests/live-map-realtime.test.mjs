import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import {io as connect} from 'socket.io-client';
import {installMapRealtime} from '../lib/maps/realtime.js';
const once=(socket,event)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('TIMEOUT '+event)),15000);socket.once(event,value=>{clearTimeout(timer);resolve(value)})});
test('real WebSocket namespace denies foreign origin, sends matching deltas and known removals',async()=>{
 const http=createServer(),io=new Server(http),origin='https://reloo.test';let version='0',events=[];
 const db={rpc:async()=>({data:{cursor:version,events}})};
 const engine=installMapRealtime(io,{db,origin,intervalMs:30});await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+http.address().port;
 const bad=connect(base+'/maps',{extraHeaders:{origin:'https://evil.test'},transports:['websocket'],reconnection:false});
 const client=connect(base+'/maps',{extraHeaders:{origin},transports:['websocket'],reconnection:false,autoConnect:false});
 try{
  const denied=await once(bad,'connect_error');assert.equal(denied.message,'ORIGIN_DENIED');
  const ready=once(client,'connect');client.connect();await ready;
  const ack=await new Promise(resolve=>client.emit('map:subscribe',{query:'bbox=106.6,10.7,106.8,10.9&transaction=RENT',cursor:'0',ids:[]},resolve));assert.equal(ack.ok,true);
  const change=once(client,'map:delta');version='1';events=[{feature_id:'marketplace:qa',entity_id:'qa',domain:'marketplace',title:'QA',category:'may-anh',price:100,price_unit:'DAY',longitude:106.705,latitude:10.775,approximate:true,accuracy_meters:1600,version:'1',visible:true,mode:'RENT'}];
  const upsert=await change;assert.equal(upsert.events[0].op,'upsert');assert.equal(upsert.events[0].feature.properties.href,'/product/qa');
  const removal=once(client,'map:delta');version='2';events=[{feature_id:'marketplace:qa',version:'2',visible:null}];assert.equal((await removal).events[0].op,'remove');
  assert.equal(client.connected,true);
 }finally{bad.disconnect();client.disconnect();engine.close();await new Promise(resolve=>io.close(resolve));}
});
