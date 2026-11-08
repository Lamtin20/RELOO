import test from 'node:test';
import assert from 'node:assert/strict';
import {eventPresentation} from '../lib/chat-control/presentation.js';
test('operator event labels distinguish operations and do not fabricate missing details',()=>{
 const assignment=eventPresentation({kind:'assign',source:'support'});assert.equal(assignment.title,'Phân công hội thoại');assert.equal(assignment.source,'Tư vấn khách hàng');assert.equal(assignment.metadata,'');assert.equal(assignment.hasDetails,false);
 const priority=eventPresentation({kind:'priority',source:'support'});assert.notEqual(priority.title,assignment.title);
});
test('real trace metadata is retained separately; zero duration is not silently lost',()=>{
 const event=eventPresentation({kind:'message',source:'support',data:{decision:'RULE_MATCH',model:'RELOO_RULES',durationMs:0,answer:'Verified public answer'}});assert.equal(event.title,'Phản hồi tự động');assert.equal(event.metadata,'RULE_MATCH · RELOO_RULES · 0 ms');assert.equal(event.hasDetails,true);
 const missing=eventPresentation({kind:'message',data:{durationMs:'8'}});assert.equal(missing.metadata,'');
});
test('English and unknown future audit kinds preserve meaning without inventing status',()=>{
 assert.equal(eventPresentation({source:'support',kind:'staff_takeover'},true).title,'Staff takeover');assert.equal(eventPresentation({source:'future',kind:'new_operation'}).title,'new_operation');assert.equal(eventPresentation({}).source,'—');
});
