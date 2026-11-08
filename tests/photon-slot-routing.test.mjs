import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {selfHostedBytes} from '../lib/maps/self-hosted.js';
import {photonUpdateStatus} from '../lib/maps/photon-status.js';
test('Photon pointer selects fixed private host and fails closed on invalid/missing state',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'photon-slot-'));const previous=process.env.RELOO_PHOTON_ACTIVE_STATE;
 try{
  process.env.RELOO_PHOTON_ACTIVE_STATE=join(dir,'active.json');
  assert.equal((await photonUpdateStatus()).outcome,'UNAVAILABLE');
  await writeFile(join(dir,'last-run.json'),JSON.stringify({schemaVersion:1,outcome:'UPDATED',at:'2026-11-07T00:00:00Z',secret:'never expose'}));
  const status=await photonUpdateStatus();assert.equal(status.outcome,'UPDATED');assert.equal(status.timerEnabled,'NOT_VERIFIED');assert.equal(status.secret,undefined);
  let called=0;const fetchImpl=async url=>{called++;assert.equal(new URL(url).hostname,'map-geocoder-b');return new Response('{}')};
  await assert.rejects(selfHostedBytes('https://maps.reloo.internal/geocode?q=Hanoi',{purpose:'geocoding',fetchImpl}));
  await writeFile(process.env.RELOO_PHOTON_ACTIVE_STATE,JSON.stringify({schemaVersion:1,slot:'b',sha256:'a'.repeat(64)}));
  await selfHostedBytes('https://maps.reloo.internal/geocode?q=Hanoi',{purpose:'geocoding',fetchImpl});
  await writeFile(process.env.RELOO_PHOTON_ACTIVE_STATE,JSON.stringify({schemaVersion:1,slot:'evil.example',sha256:'a'.repeat(64)}));
  await assert.rejects(selfHostedBytes('https://maps.reloo.internal/geocode',{purpose:'geocoding',fetchImpl}),/PHOTON_STATE_INVALID/);
  assert.equal(called,1);
 }finally{if(previous===undefined)delete process.env.RELOO_PHOTON_ACTIVE_STATE;else process.env.RELOO_PHOTON_ACTIVE_STATE=previous;await rm(dir,{recursive:true,force:true})}
});
