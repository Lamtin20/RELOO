import test from 'node:test';
import assert from 'node:assert/strict';
import {selfHostedTarget,selfHostedBytes} from '../lib/maps/self-hosted.js';
import {mapConfiguration} from '../lib/maps/config.js';
test('self-hosted dispatch has no arbitrary host, port, path or cross-provider request capability',()=>{
 assert.equal(selfHostedTarget('https://maps.reloo.internal/tiles/12/3262/1924.pbf').url,'http://map-tiles:3000/vietnam/12/3262/1924');
 assert.match(selfHostedTarget('https://maps.reloo.internal/fonts/Noto%20Sans%20Regular/0-255.pbf').url,/^http:\/\/map-tiles:3000\/font\//);
 for(const url of ['https://evil.invalid/tiles/1/1/1.pbf','https://maps.reloo.internal/tiles/1/9999/1.pbf','https://maps.reloo.internal/admin','https://maps.reloo.internal/geocode?q=x','https://maps.reloo.internal:444/tiles/1/1/1.pbf','https://maps.reloo.internal/fonts/../../private/0-255.pbf'])assert.throws(()=>selfHostedTarget(url));
 assert.throws(()=>selfHostedTarget('https://maps.reloo.internal/route/v1/driving/106,10;107,11'));
});
test('self-hosted geocoding and routing choose fixed private services and do not forward keys',()=>{
 const value=selfHostedTarget('https://maps.reloo.internal/geocode?q=Ha%20Noi&language=en&key=DO_NOT_FORWARD','geocoding');const url=new URL(value.url);assert.equal(url.origin,'http://map-geocoder:2322');assert.equal(url.pathname,'/api/');assert.equal(url.searchParams.get('lang'),'en');assert.equal(url.searchParams.get('key'),null);
 assert.equal(new URL(selfHostedTarget('https://maps.reloo.internal/reverse?lat=10&lon=106','geocoding').url).pathname,'/reverse');
 assert.equal(new URL(selfHostedTarget('https://maps.reloo.internal/route/v1/driving/106,10;107,11','routing').url).origin,'http://map-router:5000');
});
test('self-hosted HTTP calls remain bounded, reject redirects/errors and serve an original local style',async()=>{
 const bytes=await selfHostedBytes('https://maps.reloo.internal/style.json');const style=JSON.parse(bytes);assert.equal(style.version,8);assert.equal(style.metadata.author,'RELOO');
 await assert.rejects(selfHostedBytes('https://maps.reloo.internal/tiles/1/1/1.pbf',{fetchImpl:async(url,options)=>{assert.equal(options.redirect,'error');assert.equal(url,'http://map-tiles:3000/vietnam/1/1/1');return new Response(null,{status:503})}}),/UNAVAILABLE/);
});
test('a free service plan is not reported active until readiness and provider configuration are explicit',()=>{
 const env={RELOO_MAP_MODE:'self-hosted',RELOO_MAP_PROVIDER_APPROVED:'1',RELOO_MAP_STYLE_URL:'https://maps.reloo.internal/style.json',RELOO_MAP_RESOURCE_HOSTS:'maps.reloo.internal',RELOO_MAP_ATTRIBUTION:'OSM contributors'};
 assert.equal(mapConfiguration(env).enabled,false);assert.equal(mapConfiguration({...env,RELOO_MAP_SELF_HOSTED_READY:'1'}).enabled,true);
});
