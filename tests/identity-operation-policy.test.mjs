import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {identityReady,identityRecordReady,identityProtectedPath,neighborhoodIdentityRequired} from '../lib/identity-access.js';
import {assertIdentity} from '../lib/security/identity.js';
test('approval requires a real approved record, not a KYC level, uploaded evidence or client boolean alone',()=>{
 for(const status of ['VALID','EXPIRING','NO_EXPIRY']){const record={status,identity:{submission_id:'approved-record'}};assert(identityRecordReady(record));assert.doesNotThrow(()=>assertIdentity(record));assert(identityReady({identityVerified:true,identityStatus:status}));}
 for(const record of [null,{status:'VALID'},{status:'REVIEW',identity:{submission_id:'pending'}},{status:'EXPIRED',identity:{submission_id:'old'}}])assert.throws(()=>assertIdentity(record),e=>e.status===403);
 assert(!identityReady({kycLevel:'L3',identityStatus:'VALID'}));assert(!identityReady({identityVerified:true,identityStatus:'EXPIRED'}));
});
test('read/buy and remediation remain separate from new rental/listing operations',()=>{
 for(const p of ['/lend','/rent/item','/dashboard/assets/new','/dashboard/assets/item/edit','/dashboard/assets/neighborhood'])assert(identityProtectedPath(p),p);
 for(const p of ['/','/explore','/product/item','/purchase/item','/checkout/item','/account','/verify-identity','/dashboard/orders','/dashboard/purchases'])assert(!identityProtectedPath(p),p);
 for(const action of ['LISTING','NEED','BOOK','BOOK_DRAFT','SUBMIT_DRAFT','ACCEPT','EXTEND','EXTENSION_ACCEPT'])assert(neighborhoodIdentityRequired(action));
 for(const action of ['CANCEL','ISSUE','REQUEST_RETURN','REFUND_ACK','CLOSE_NEED','PREFERENCES'])assert(!neighborhoodIdentityRequired(action));
 assert(!neighborhoodIdentityRequired('HANDOVER',{phase:'RETURN'}));assert(neighborhoodIdentityRequired('HANDOVER',{phase:'PICKUP'}));
});
async function functionSql(file,name){const text=await readFile(file,'utf8'),start=text.indexOf('create or replace function public.'+name+'(');assert(start>=0,name);const end=text.indexOf('$$;',text.indexOf('as $$',start))+3;return text.slice(start,end);}
async function fixture(apply=true){const db=new PGlite();await db.exec(`
 create role anon;create role authenticated;create role service_role;
 create table profiles(id text primary key,phone text,status text default 'active',activation_status text default 'ACTIVE',screening_valid_until timestamptz default now()+interval '1 year');
 create table risk_cases(profile_id text,status text);create table risk_blacklist(profile_id text,status text,expires_at timestamptz);
 create table verified_identities(profile_id text primary key,submission_id uuid default gen_random_uuid(),expires_at timestamptz);
 create function reloo_normalize_phone(text) returns text language sql as $$select nullif($1,'')$$;
 create table assets(id text primary key,owner_id text,title text,description text,daily_price bigint,images jsonb,status text default 'available',is_locked boolean default false,listing_data jsonb default '{}');
 create table rental_agreements(id uuid default gen_random_uuid(),listing_id text,lender_id text,renter_id text,status text,starts_at timestamptz,ends_at timestamptz,proposed_by text,sequence integer default 0,head_hash text default repeat('0',64),updated_at timestamptz);
 create table rental_confirmations(agreement_id uuid,profile_id text,phase text,created_at timestamptz);
 create table rental_history_events(id uuid default gen_random_uuid(),digest text,signing_key_id text,payload_encrypted text,agreement_id uuid,sequence integer,event text,actor_id text,envelope jsonb,event_hash text,signature text,previous_hash text,key_version text,request_id uuid);
 create table evm_anchors(history_id uuid primary key);
 create table nk_orders(id uuid default gen_random_uuid(),owner_id text,renter_id text,status text);
 create table notifications(id text default gen_random_uuid()::text,user_id text,title text,body text,notification_type text,link text);
 create table security_audit(actor_id text,subject_id text,action text,details jsonb);
 create table chat_threads(id text primary key,listing_id text,lender_id text,buyer_id text,updated_at timestamptz);
 create table chat_messages(id text primary key,thread_id text,sender_id text,message_type text,body text,message_data jsonb,created_at timestamptz,read_by jsonb default '[]');
 insert into profiles(id,phone) values('seller','0831234567'),('buyer','0931234567'),('expired-buyer','0981234567'),('unsafe','0911234567');
 insert into verified_identities(profile_id,expires_at) values('seller',now()+interval '1 year'),('expired-buyer',now()-interval '1 day');
 insert into assets(id,owner_id,title,listing_data) values('item','seller','Test item','{"transactionMode":"BOTH","salePrice":100000}'),('unsafe-item','unsafe','Test unsafe','{"transactionMode":"SALE","salePrice":100000}');
 create function reloo_expired_identity_guard() returns trigger language plpgsql as $$begin return new;end$$;
 create trigger rental_identity_expiry before insert or update of status on rental_agreements for each row execute function reloo_expired_identity_guard();
 insert into rental_agreements(lender_id,renter_id,status) values('seller','buyer','ACTIVE');
 `);
 const purchase=await readFile('deploy/vietnam/purchase-workflow.sql','utf8');await db.exec(purchase.slice(0,purchase.indexOf('alter table purchase_orders')));
 for(const [file,name] of [['deploy/vietnam/crm-upgrade.sql','reloo_assert_active'],['deploy/vietnam/rental-history.sql','reloo_change_rental'],['deploy/vietnam/purchase-workflow.sql','reloo_request_purchase'],['deploy/vietnam/purchase-workflow.sql','reloo_purchase_action'],['supabase/migrations/20261008010000_security_commerce.sql','reloo_create_inquiry'],['supabase/migrations/20261008010000_security_commerce.sql','reloo_send_message'],['supabase/migrations/20261008010000_security_commerce.sql','reloo_asset_gate'],['deploy/vietnam/nearby-requests.sql','reloo_create_nearby_request']])await db.exec(await functionSql(file,name));
 if(apply)await db.exec(await readFile('deploy/vietnam/identity-operation-policy.sql','utf8'));
 await db.exec('create trigger reloo_asset_activation_gate before insert or update on assets for each row execute function reloo_asset_gate()');return db;
}
test('database policy allows unverified/expired buyers, rejects unverified publishers/renters and preserves risk restrictions',async()=>{
 const db=await fixture();try{
  for(const buyer of ['buyer','expired-buyer']){const r=await db.query("select reloo_request_purchase($1,'item','{}') id",[buyer]);assert(r.rows[0].id);}
  await assert.rejects(db.query("select reloo_request_purchase('buyer','unsafe-item','{}')"),/IDENTITY_REQUIRED/);
  await assert.rejects(db.query("select reloo_create_inquiry('buyer','item','{\"type\":\"text\",\"text\":\"rent\"}')"),/IDENTITY_REQUIRED/);
  const sale=await db.query("select reloo_create_inquiry('expired-buyer','item','{\"type\":\"text\",\"text\":\"buy\",\"transactionMode\":\"SALE\"}') result");assert(sale.rows[0].result.threadId);
  await assert.rejects(db.query("insert into assets(id,owner_id,title) values('denied','buyer','Test')"),/IDENTITY_REQUIRED/);
  await db.exec("insert into risk_cases values('buyer','OPEN')");await assert.rejects(db.query("select reloo_assert_buyer_active('buyer')"),/ACCOUNT_RESTRICTED/);
  assert.equal((await db.query("select has_function_privilege('anon','reloo_assert_identity(text)','execute') allowed")).rows[0].allowed,false);
  assert.equal((await db.query("select has_function_privilege('authenticated','reloo_assert_buyer_active(text)','execute') allowed")).rows[0].allowed,false);
  await db.exec(await readFile('deploy/vietnam/identity-operation-policy.sql','utf8'));
 }finally{await db.close();}
});
test('new bookings need both approved identities while existing returns/cancellations do not need re-verification',async()=>{
 const db=await fixture();try{
  await assert.rejects(db.query("insert into rental_agreements(lender_id,renter_id,status) values('seller','buyer','PROPOSED')"),/IDENTITY_REQUIRED/);
  await assert.rejects(db.query("insert into nk_orders(owner_id,renter_id,status) values('seller','buyer','DRAFT')"),/IDENTITY_REQUIRED/);
  await db.exec("update rental_agreements set status='COMPLETED' where renter_id='buyer';insert into verified_identities(profile_id,expires_at) values('buyer',now()+interval '1 year');insert into nk_orders(owner_id,renter_id,status) values('seller','buyer','CONFIRMED');delete from verified_identities where profile_id='buyer';update nk_orders set status='CANCELLED';");
  assert.equal((await db.query("select status from rental_agreements where renter_id='buyer'")).rows[0].status,'COMPLETED');
  assert.equal((await db.query('select status from nk_orders')).rows[0].status,'CANCELLED');
 }finally{await db.close();}
});

test('routine-only rollback restores the old policy without deleting orders created during the release',async()=>{const db=await fixture(false);try{const exported=(await db.query(await readFile('deploy/vietnam/identity-policy-rollback-export.sql','utf8'))).rows.map(r=>r.command).join('\n');await db.exec(await readFile('deploy/vietnam/identity-operation-policy.sql','utf8'));await db.query("select reloo_request_purchase('buyer','item','{}')");await db.exec(exported);assert.equal((await db.query('select count(*)::int n from purchase_orders')).rows[0].n,1);assert.equal((await db.query("select to_regprocedure('public.reloo_assert_identity(text)') f")).rows[0].f,null);await assert.rejects(db.query("select reloo_assert_active('expired-buyer')"),/IDENTITY_EXPIRED/);}finally{await db.close();}});

test('legacy return confirmation stays usable and unverified items are paused instead of republished',async()=>{const db=await fixture();try{const id=(await db.query("select id from rental_agreements where renter_id='buyer'")).rows[0].id;for(const [index,actor] of ['buyer','seller'].entries()){const record={envelope:{sequence:index+1,previousHash:index?'a'.repeat(64):'0'.repeat(64),streamId:id},hash:'a'.repeat(64),signature:'x'.repeat(88),keyVersion:'TEST',keyId:'TEST',encrypted:'TEST'};await db.query("select reloo_change_rental($1,$2,'RETURN_CONFIRMED',gen_random_uuid(),$3)",[actor,id,record]);}assert.equal((await db.query('select status from rental_agreements where id=$1',[id])).rows[0].status,'CLOSED');await db.exec("update assets set status='rented' where id='item';delete from verified_identities where profile_id='seller';update assets set status='available' where id='item';");assert.equal((await db.query("select status from assets where id='item'")).rows[0].status,'paused');}finally{await db.close();}});

test('buyer can finish an existing handed-over sale even if the seller identity expires meanwhile',async()=>{const db=await fixture();try{const id=(await db.query("select reloo_request_purchase('buyer','item','{}') id")).rows[0].id;await db.query("select reloo_purchase_action('seller',$1,1,'CONFIRMED')",[id]);await db.query("select reloo_purchase_action('seller',$1,2,'HANDED_OVER')",[id]);await db.exec("update verified_identities set expires_at=now()-interval '1 day' where profile_id='seller'");await db.query("select reloo_purchase_action('buyer',$1,3,'COMPLETED')",[id]);assert.equal((await db.query('select status from purchase_orders where id=$1',[id])).rows[0].status,'COMPLETED');assert.equal((await db.query("select listing_data->>'saleStatus' status from assets where id='item'")).rows[0].status,'SOLD');}finally{await db.close();}});
