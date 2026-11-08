import test from 'node:test';import assert from 'node:assert/strict';
import {shortsDb,fixtureShort} from './helpers/shorts-db.mjs';
import {encodingLadder,videoFilter,renditionPeakBandwidth} from '../lib/shorts/encoding.js';
import {initialQualityLevel,playbackBandwidth,rememberBandwidth} from '../lib/shorts/playback-policy.js';
test('quality ladder preserves detail without upscaling; HDR sources receive SDR tone mapping',()=>{
 assert.deepEqual(encodingLadder({width:1080,height:1920}).map(l=>l.key),[360,720,1080]);
 for(const source of [{width:180,height:320},{width:540,height:960},{width:1080,height:1080}]){const ladder=encodingLadder(source);assert.equal(ladder.at(-1).width,source.width);assert.equal(ladder.at(-1).height,source.height);for(const l of ladder){assert.ok(l.width<=source.width&&l.height<=source.height);assert.equal(l.width%2,0);}}
 assert.match(videoFilter({colorTransfer:'smpte2084'},{width:1080,height:1920}),/tonemap/);assert.doesNotMatch(videoFilter({colorTransfer:'bt709'},{width:720,height:1280}),/tonemap/);
 assert.equal(renditionPeakBandwidth('#EXTINF:2.0,\n#EXT-X-BYTERANGE:2000000@10\nmedia.mp4\n#EXTINF:1.0,\n#EXT-X-BYTERANGE:500000@2000010'),8400000);
});
test('HD starts when bandwidth and screen allow it; slow/save-data connections keep a light rendition',()=>{
 const levels=[{width:360,bitrate:1200000},{width:720,bitrate:4600000},{width:1080,bitrate:7700000}];
 assert.equal(initialQualityLevel(levels,{bandwidth:6500000,width:1080}),1);assert.equal(initialQualityLevel(levels,{bandwidth:12000000,width:1080}),2);
 assert.equal(initialQualityLevel(levels,{bandwidth:1500000,width:1080}),0);assert.equal(initialQualityLevel(levels,{bandwidth:12000000,width:1080,saveData:true}),0);
 rememberBandwidth(9000000);assert.equal(playbackBandwidth({}),9000000);assert.equal(playbackBandwidth({saveData:true}),750000);
});
test('auto publication waits for packaged media, publishes once and survives submit retries without an admin',async()=>{const db=await shortsDb({automatic:true});try{
 const v=await fixtureShort(db,{status:'PENDING',mediaStatus:'PROCESSING'});
 assert.equal((await db.query('select reloo_auto_publish_short($1) state',[v.id])).rows[0].state,'BLOCKED');
 await db.query("update short_video_media set status='READY',hls_ready=true,stream_version=3 where id=$1",[v.mediaId]);
 const row=(await db.query('select status,reviewed_by,published_at,auto_rule_codes from short_videos where id=$1',[v.id])).rows[0];assert.equal(row.status,'PUBLISHED');assert.equal(row.reviewed_by,null);assert.ok(row.published_at);assert.deepEqual(row.auto_rule_codes,[]);
 assert.equal((await db.query("select reloo_create_short('owner',$1,'Fixture clip',$2,false) id",[v.mediaId,[{kind:'RENTAL',assetId:'owned'}]])).rows[0].id,v.id);
 await db.query('select reloo_auto_publish_short($1)',[v.id]);assert.equal((await db.query("select count(*) c from security_audit where action='SHORT_AUTO_PUBLISHED'")).rows[0].c,1);
 await db.exec('set role authenticated');await assert.rejects(db.query('select reloo_auto_publish_short($1)',[v.id]),/permission denied/);
 }finally{await db.close();}});
test('account, identity and product restrictions hold clips until cleared; drafts and moderated clips stay private',async()=>{const db=await shortsDb({automatic:true});try{
 const v=await fixtureShort(db,{status:'PENDING',mediaStatus:'PROCESSING'});
 await db.query("update profiles set activation_status='RESTRICTED' where id='owner'");await db.query("update short_video_media set status='READY',hls_ready=true where id=$1",[v.mediaId]);
 let row=(await db.query('select status,auto_rule_codes from short_videos where id=$1',[v.id])).rows[0];assert.equal(row.status,'PENDING');assert.ok(row.auto_rule_codes.includes('ACCOUNT_RESTRICTED'));
 await db.query("update profiles set activation_status='ACTIVE' where id='owner'");await db.query("insert into verified_identities values('owner',now()-interval '1 day')");await db.query('select reloo_auto_publish_short($1)',[v.id]);assert.ok((await db.query('select auto_rule_codes from short_videos where id=$1',[v.id])).rows[0].auto_rule_codes.includes('IDENTITY_EXPIRED'));
 await db.query('delete from verified_identities');await db.query("update assets set is_locked=true where id='owned'");await db.query('select reloo_auto_publish_short($1)',[v.id]);assert.ok((await db.query('select auto_rule_codes from short_videos where id=$1',[v.id])).rows[0].auto_rule_codes.includes('PRODUCT_UNAVAILABLE'));
 await db.query("update assets set is_locked=false where id='owned'");await db.query("update short_videos set auto_checked_at=now()-interval '2 minutes' where id=$1",[v.id]);await db.query('select reloo_recheck_pending_shorts()');assert.equal((await db.query('select status from short_videos where id=$1',[v.id])).rows[0].status,'PUBLISHED');
 for(const status of ['DRAFT','ARCHIVED','REJECTED']){const other=await fixtureShort(db,{status,mediaStatus:'PROCESSING',products:[]});await db.query("update short_video_media set status='READY',hls_ready=true where id=$1",[other.mediaId]);await db.query('select reloo_auto_publish_short($1)',[other.id]);assert.equal((await db.query('select status from short_videos where id=$1',[other.id])).rows[0].status,status);}
 const draft=await fixtureShort(db,{status:'DRAFT',products:[]});await db.query('update short_video_media set hls_ready=true where id=$1',[draft.mediaId]);await db.query("select reloo_update_short('owner',$1,'SUBMIT')",[draft.id]);assert.equal((await db.query('select status from short_videos where id=$1',[draft.id])).rows[0].status,'PUBLISHED');
 }finally{await db.close();}});
