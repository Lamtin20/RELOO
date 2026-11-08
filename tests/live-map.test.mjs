import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinate,approximatePoint,bounds,mapQuery,distanceMeters,publicFeature,applyMapDelta} from '../lib/maps/spatial.js';
import {resourceUrl,mapConfiguration} from '../lib/maps/config.js';
import {rewriteStyle,proxyResource} from '../lib/maps/provider.js';
import {subscriptionMatches,mapDeltas} from '../lib/maps/realtime.js';
import {searchMap} from '../lib/maps/server.js';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const row={id:'marketplace:a',feature_id:'marketplace:a',entity_id:'a',domain:'marketplace',title:'Camera',category:'may-anh',price:100000,price_unit:'DAY',longitude:106.705,latitude:10.775,approximate:true,accuracy_meters:1600,version:'11',visible:true,mode:'RENT',area:'Ward, City',private_address:'NEVER EXPOSE'};
const query=()=>mapQuery(new URLSearchParams('bbox=106.6,10.7,106.8,10.9&domain=marketplace&transaction=RENT'));
const env={RELOO_MAP_PROVIDER_APPROVED:'1',RELOO_MAP_STYLE_URL:'https://tiles.example.invalid/style.json',RELOO_MAP_RESOURCE_HOSTS:'tiles.example.invalid,fonts.example.invalid',RELOO_MAP_ATTRIBUTION:'Licensed QA provider'};
test('self-hosted MapLibre worker exactly matches the pinned dependency with its license',async()=>{
 const digest=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(digest(await readFile('public/maps/maplibre-worker-6.16.0.mjs')),digest(await readFile('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs')));
 assert.equal(digest(await readFile('public/maps/MAPLIBRE-LICENSE.txt')),digest(await readFile('node_modules/maplibre-gl/LICENSE.txt')));
});
test('coordinates reject coercion, nonfinite and unsupported latitude; approximation uses stable area cells',()=>{
 for(const point of [{lat:'10',lng:106},{lat:Infinity,lng:106},{lat:86,lng:106},{lat:10,lng:181},null])assert.throws(()=>coordinate(point));
 const value=approximatePoint({lat:10.771234,lng:106.701234});assert.equal(value.lat,10.775);assert.equal(value.lng,106.705);assert.equal(value.approximate,true);assert.equal(value.accuracyMeters,1600);
 assert.deepEqual(value,approximatePoint({lat:10.779,lng:106.709}));
});
test('viewport and cost limits reject worldwide, inverted and antimeridian queries',()=>{
 for(const box of ['-180,-85,180,85','106,10,105,11','170,10,-170,11','106,10,112,11','106,10,107,10','a,b,c,d'])assert.throws(()=>bounds(box));
 assert.deepEqual(bounds('106,10,107,11'),[106,10,107,11]);
 for(const suffix of ['&limit=10000','&offset=999999','&min=-1','&max=1.5','&domain=private','&category=../admin','&lat=10&lng=106&radius=999999'])assert.throws(()=>mapQuery(new URLSearchParams('bbox=106,10,107,11'+suffix)));
});
test('WGS84 distance uses great-circle distance with finite output',()=>{
 assert.equal(distanceMeters({lat:10,lng:106},{lat:10,lng:106}),0);
 assert.ok(Math.abs(distanceMeters({lat:0,lng:0},{lat:0,lng:1})-111195)<10);
});
test('bounded polygon searches require closed, finite rings entirely inside the viewport',()=>{
 const params=new URLSearchParams('bbox=106,10,107,11');params.set('polygon',JSON.stringify([[106.1,10.1],[106.9,10.1],[106.9,10.9],[106.1,10.1]]));assert.equal(mapQuery(params).polygon.length,4);
 params.set('polygon',JSON.stringify([[106,10],[108,10],[107,11],[106,10]]));assert.throws(()=>mapQuery(params),/MAP_POLYGON_INVALID/);
});
test('list-to-map IDs preserve loaded discovery filters and cannot select private data',()=>{
 const params=new URLSearchParams('bbox=106,10,107,11');params.set('ids',JSON.stringify(['a','b','a']));const q=mapQuery(params);assert.deepEqual(q.ids,['a','b']);assert.equal(subscriptionMatches({...row,entity_id:'unlisted'},q),false);
 params.set('ids',JSON.stringify(['../private']));assert.throws(()=>mapQuery(params),/MAP_IDS_INVALID/);
});
test('public feature projection excludes owner, exact address, commercial secrets and arbitrary image URLs',()=>{
 const f=publicFeature({...row,owner_id:'private-owner',coords:{lat:10.771234,lng:106.701234},image:'https://tracker.invalid/person'});
 assert.equal(f.properties.image,null);assert.equal(f.properties.href,'/product/a');assert.equal(f.properties.accuracyMeters,1600);assert.doesNotMatch(JSON.stringify(f),/private-owner|NEVER EXPOSE|10.771234|tracker/);
 for(const value of [{...row,approximate:false},{...row,accuracy_meters:1},{...row,domain:'private'}])assert.throws(()=>publicFeature(value));
});
test('realtime delta projection sends only subscribed public rows and known removals',()=>{
 const q=query(),seen=new Set(['marketplace:a']);
 assert.equal(subscriptionMatches(row,q),true);assert.equal(subscriptionMatches({...row,visible:false},q),false);assert.equal(subscriptionMatches({...row,longitude:100},q),false);
 const changes=mapDeltas([{...row,visible:false},{...row,id:'private',feature_id:'unknown',visible:false}],q,seen);assert.deepEqual(changes,[{op:'remove',id:'marketplace:a',version:'11'}]);
 assert.equal(mapDeltas([row],q,new Set())[0].feature.properties.href,'/product/a');
 assert.equal(subscriptionMatches(row,{...q,origin:{lat:10,lng:106},radius:100}),false);
});
test('replayed and reordered events cannot resurrect a removed marker',()=>{
 const feature=publicFeature(row);let state={type:'FeatureCollection',features:[feature]};
 state=applyMapDelta(state,[{id:row.id,version:'13',op:'remove'}]);state=applyMapDelta(state,[{id:row.id,version:'12',op:'upsert',feature}]);assert.equal(state.features.length,0);
 state=applyMapDelta(state,[{id:row.id,version:'14',op:'upsert',feature:{...feature,properties:{...feature.properties,version:'14'}}}]);assert.equal(state.features.length,1);
 assert.equal(applyMapDelta(state,[{id:row.id,version:'garbage',op:'remove'}]).features.length,1);
});
test('provider is unavailable unless configured and approved; unrestricted public OSM infrastructure is rejected',()=>{
 assert.equal(mapConfiguration({}).enabled,false);assert.equal(mapConfiguration({...env,RELOO_MAP_PROVIDER_APPROVED:'0'}).enabled,false);assert.equal(mapConfiguration(env).enabled,true);
 for(const url of ['http://tiles.example.invalid/a','https://tiles.example.invalid.evil/a','https://user:pass@tiles.example.invalid/a','https://127.0.0.1/a','https://tile.openstreetmap.org/1/2/3.png','https://nominatim.openstreetmap.org/search','https://demotiles.maplibre.org/style.json'])assert.throws(()=>resourceUrl(url,{...env,RELOO_MAP_RESOURCE_HOSTS:'tiles.example.invalid,tile.openstreetmap.org,nominatim.openstreetmap.org,demotiles.maplibre.org'}));
});
test('same-origin style rewriting preserves vector/glyph placeholders without exposing keys',()=>{
 const style=rewriteStyle({version:8,sources:{base:{type:'vector',tiles:['https://tiles.example.invalid/{z}/{x}/{y}.pbf']}},glyphs:'https://fonts.example.invalid/{fontstack}/{range}.pbf',sprite:'https://tiles.example.invalid/sprite',layers:[]},env.RELOO_MAP_STYLE_URL,env);
 assert.match(style.sources.base.tiles[0],/^\/api\/maps\/resource\?url=/);assert.ok(style.sources.base.tiles[0].includes('{z}'));assert.ok(style.glyphs.includes('{fontstack}'));assert.match(proxyResource('https://tiles.example.invalid/a'),/^\/api\/maps\/resource/);
 assert.throws(()=>rewriteStyle({version:8,sources:{base:{type:'vector',url:'https://evil.invalid/tiles.json'}},layers:[]},env.RELOO_MAP_STYLE_URL,env));
 assert.doesNotMatch(proxyResource('https://tiles.example.invalid/a?key=SECRET_KEY&token=SECRET_TOKEN'),/SECRET/);
});
test('search API uses backend RPC, preserves cursor/paging and emits only public GeoJSON',async()=>{
 const result=await searchMap(query(),{db:{rpc:async(name,args)=>{assert.equal(name,'reloo_map_search');assert.deepEqual(args.p_query.bbox,[106.6,10.7,106.8,10.9]);return {data:{rows:[row],cursor:'11',more:true}}}}});
 assert.equal(result.features.length,1);assert.equal(result.cursor,'11');assert.equal(result.nextOffset,1);assert.doesNotMatch(JSON.stringify(result),/NEVER EXPOSE/);
 await assert.rejects(searchMap(query(),{db:{rpc:async()=>({error:{message:'private connection string'}})}}),/MAP_DATABASE_UNAVAILABLE/);
});
