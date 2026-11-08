import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {shortsDb,fixtureShort} from './helpers/shorts-db.mjs';
import {playbackWindow,shouldCountView} from '../lib/shorts/playback-policy.js';
import {shortMetricTicket,shortPlaybackTicket,readShortTicket} from '../lib/shorts/tickets.js';
test('preload budget remains bounded near list edges and slow networks; only visible playing clips qualify for a view',()=>{
 assert.deepEqual(playbackWindow(0,20).from,0);assert.equal(playbackWindow(8,20).to-playbackWindow(8,20).from+1,4);assert.equal(playbackWindow(19,20).to,19);
 assert.equal(playbackWindow(8,20,{saveData:true}).forward,1);assert.equal(playbackWindow(8,20,{effectiveType:'2g'}).maxBytes,4000000);
 assert.equal(shouldCountView({active:true,visible:true,paused:false,playingMs:2000}),true);
 for(const override of [{active:false},{visible:false},{paused:true},{playingMs:1999}])assert.equal(shouldCountView({active:true,visible:true,paused:false,playingMs:3000,...override}),false);
});
test('playback and metric tickets cannot be swapped, modified, reused on another clip or used after their lifetime',()=>{
 const previous=process.env.RELOO_PRIVATE_DATA_KEY;process.env.RELOO_PRIVATE_DATA_KEY='cd'.repeat(32);try{
 const now=Date.now(),video={id:randomUUID(),media_id:randomUUID()},product={id:randomUUID()},play=shortPlaybackTicket(video,'viewer',now),metric=shortMetricTicket(video,[product],now);
 assert.equal(readShortTicket(play.ticket,'play',now).mediaId,video.media_id);assert.equal(readShortTicket(metric,'metrics',now).products[0],product.id);
 assert.equal(readShortTicket(metric,'play',now),null);assert.equal(readShortTicket(play.ticket,'metrics',now),null);
 assert.equal(readShortTicket(play.ticket,'play',now+16*60000),null);
 const [body,signature]=metric.split('.'),altered=JSON.parse(Buffer.from(body,'base64url'));altered.videoId=randomUUID();assert.equal(readShortTicket(Buffer.from(JSON.stringify(altered)).toString('base64url')+'.'+signature,'metrics',now),null);
 }finally{if(previous===undefined)delete process.env.RELOO_PRIVATE_DATA_KEY;else process.env.RELOO_PRIVATE_DATA_KEY=previous;}
});
test('publishing cannot precede media readiness; owned product checks and the external-link ban are enforced transactionally',async()=>{const db=await shortsDb();try{
 const v=await fixtureShort(db,{status:'PENDING',mediaStatus:'PROCESSING',products:[]});
 assert.equal((await db.query("select reloo_create_short('owner',$1,'Fixture clip','[]',false) id",[v.mediaId])).rows[0].id,v.id);
 await assert.rejects(db.query("select reloo_review_short('admin',$1,1,true,'Clip has been reviewed carefully')",[v.id]),/NOT_READY/);
 await db.query("update short_video_media set status='READY' where id=$1",[v.mediaId]);await db.query("select reloo_review_short('admin',$1,1,true,'Clip has been reviewed carefully')",[v.id]);
 assert.equal((await db.query('select reloo_public_short_access($1,null) v',[v.id])).rows[0].v,true);
 await assert.rejects(fixtureShort(db,{products:['foreign']}),/OWNED_AVAILABLE/);
 const newMedia=(await db.query("insert into short_video_media(id,profile_id,filename,duration,width,height,bytes,status) select id,'owner',id::text||'.mp4',10,360,640,100000,'READY' from (select gen_random_uuid() id) q returning id")).rows[0].id;
 await assert.rejects(db.query("select reloo_create_short('owner',$1,'Link cannot be added',$2,true)",[newMedia,[{kind:'EXTERNAL',title:'Product',href:'https://shopee.vn/product/1/2'}]]),/SHORT_EXTERNAL_DISABLED/);
 }finally{await db.close();}});
test('view and product counters deduplicate retries and loops, enforce event order and product ownership, and isolate owner insights',async()=>{const db=await shortsDb();try{
 const v=await fixtureShort(db),nonce=randomUUID(),product=(await db.query('select id from short_video_products where video_id=$1',[v.id])).rows[0].id;
 await assert.rejects(db.query("select reloo_count_short_event($1,$2,'VIEW',null)",[v.id,nonce]),/IMPRESSION_REQUIRED/);
 for(const kind of ['IMPRESSION','PRODUCT_IMPRESSION','VIEW','OPEN','CLICK','CLICK'])await db.query('select reloo_count_short_event($1,$2,$3,$4)',[v.id,nonce,kind,kind==='CLICK'?product:null]);
 await db.query("select reloo_count_short_event($1,$2,'VIEW',null)",[v.id,nonce]);
 const s=(await db.query("select reloo_short_insights('owner',30) stats")).rows[0].stats;
 assert.equal(s.totals.views,'1');assert.equal(s.totals.clicks,'1');assert.equal(s.totals.product_impressions,'1');assert.equal(s.totals.clicked_visits,'1');
 assert.equal((await db.query("select reloo_short_insights('other',30) stats")).rows[0].stats.totals.views,'0');
 await assert.rejects(db.query("select reloo_count_short_event($1,$2,'CLICK',$3)",[v.id,nonce,randomUUID()]),/PRODUCT_REQUIRED/);
 await db.query("update short_videos set status='ARCHIVED' where id=$1",[v.id]);assert.equal((await db.query("select reloo_count_short_event($1,$2,'IMPRESSION',null)",[v.id,randomUUID()])).rows[0].reloo_count_short_event,false);
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from short_daily_metrics'),/permission denied/);await assert.rejects(db.query("select reloo_short_insights('owner',30)"),/permission denied/);
 }finally{await db.close();}});
