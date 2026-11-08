import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('VA creation and linking reject pending or expired customers before a provider operation',async()=>{const db=new PGlite();try{await db.exec(`create role anon;create role authenticated;create role service_role;
create table profiles(id text primary key,status text);create table verified_identities(profile_id text,expires_at timestamptz);create table customer_va_links(profile_id text);create table sepay_order_requests(profile_id text);
create function reloo_assert_active(customer text) returns void language plpgsql as $$begin if not exists(select 1 from profiles where id=customer and status='ACTIVE') then raise exception 'ACCOUNT_RESTRICTED';end if;end $$;
insert into profiles values('valid','ACTIVE'),('expired','ACTIVE'),('pending','PENDING');insert into verified_identities values('valid',now()+interval '1 month'),('expired',now()-interval '1 second'),('pending',now()+interval '1 month');`);await db.exec(await readFile(new URL('../deploy/vietnam/sepay-sync.sql',import.meta.url),'utf8'));for(const table of ['customer_va_links','sepay_order_requests']){await assert.rejects(db.query(`insert into ${table} values('expired')`),/VALID_IDENTITY_REQUIRED/);await assert.rejects(db.query(`insert into ${table} values('pending')`),/ACCOUNT_RESTRICTED/);await db.query(`insert into ${table} values('valid')`);}}finally{await db.close();}});
