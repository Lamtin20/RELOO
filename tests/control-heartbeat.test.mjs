import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {writeOperationsHeartbeat,heartbeatState} from '../lib/operations/heartbeat.js';
test('heartbeat freshness is not inferred from job history',()=>{
 const now=Date.now();assert.equal(heartbeatState(null,now),'unknown');
 assert.equal(heartbeatState({seen_at:new Date(now-60000).toISOString()},now),'recent');
 assert.equal(heartbeatState({seen_at:new Date(now-91000).toISOString()},now),'stale');
 assert.equal(heartbeatState({seen_at:new Date(now+60000).toISOString()},now),'unknown');
});
test('heartbeat migration, writer, access boundaries and repeat apply (PGlite)',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon;create role authenticated;create role service_role;');
  const sql=await fs.readFile('deploy/vietnam/control-center.sql','utf8');await db.exec(sql);await db.exec(sql);
  const adapter={from(table){assert.equal(table,'operations_heartbeats');return {async upsert(row){try{await db.query('insert into operations_heartbeats(id,seen_at,modules) values($1,$2,$3) on conflict(id) do update set seen_at=excluded.seen_at,modules=excluded.modules',[row.id,row.seen_at,row.modules]);return {error:null};}catch(error){return {error};}}};}};
  assert.equal(await writeOperationsHeartbeat(adapter,{modules:['calendar','PRIVATE_DATA']}),true);
  assert.equal(await writeOperationsHeartbeat(adapter,{modules:['neighborhood']}),true);
  const rows=(await db.query('select * from operations_heartbeats')).rows;assert.equal(rows.length,1);assert.deepEqual(rows[0].modules,['neighborhood']);
  const grants=(await db.query("select has_table_privilege('anon','operations_heartbeats','select') as anon,has_table_privilege('authenticated','operations_heartbeats','select') as authenticated,has_table_privilege('service_role','operations_heartbeats','insert') as backend")).rows[0];assert.deepEqual(grants,{anon:false,authenticated:false,backend:true});
  assert.equal(await writeOperationsHeartbeat({from(){throw Error('DB_FAILED');}}),false);
 }finally{await db.close();}
});
