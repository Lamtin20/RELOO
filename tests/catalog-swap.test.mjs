import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {catalogSwapSql} from '../scripts/catalog/swap-sql.mjs';import {buildTestCatalog} from '../lib/catalog/test-catalog-20261021.js';
test('catalog swap is atomic, requires genuine owner clearance and preserves existing rentals',async()=>{
 const db=new PGlite();try{
 await db.exec(`create table profiles(id text primary key,active boolean,verified boolean);insert into profiles values('new-owner',true,false),('old-owner',false,false);
 create table assets(id text primary key,owner_id text,title text,description text,category text,daily_price bigint,market_value bigint,location text,location_details jsonb,images jsonb,specs jsonb,condition text,status text,is_locked boolean default false,trust_badges jsonb,labels jsonb,rating numeric,review_count integer,view_count integer,is_boosted boolean,listing_data jsonb,updated_at timestamptz default now());
 insert into assets(id,owner_id,title,status) values('listing_001','old-owner','Old rented','rented'),('listing_002','old-owner','Old available','available');
 create table transactions(id text primary key,asset_id text references assets(id),status text);insert into transactions values('ongoing','listing_001','in_use');
 create table automation_jobs(kind text,payload jsonb);insert into automation_jobs values('NOTIFY_BROADCAST','{"source":"ASSET","id":"unrelated"}');
 create function public.reloo_assert_active(p text) returns void language plpgsql as $$begin if not exists(select 1 from profiles where id=p and active) then raise exception 'OWNER_GATED';end if;end$$;
 create function public.reloo_assert_identity(p text) returns void language plpgsql as $$begin if not exists(select 1 from profiles where id=p and verified) then raise exception 'IDENTITY_REQUIRED';end if;end$$;
 create function public.reloo_asset_gate() returns trigger language plpgsql as $$begin perform public.reloo_assert_active(new.owner_id);if new.status='available' then perform public.reloo_assert_identity(new.owner_id);end if;return new;end$$;
 create trigger gate before insert or update on assets for each row execute function public.reloo_asset_gate();
 create function queue_notice() returns trigger language plpgsql as $$begin if new.status='available' then insert into automation_jobs values('NOTIFY_BROADCAST',jsonb_build_object('source','ASSET','id',new.id));end if;return new;end$$;
 create trigger notice after insert or update of status on assets for each row execute function queue_notice();`);
 await db.exec(await fs.readFile('deploy/vietnam/catalog-retirement.sql','utf8'));
 const sql=catalogSwapSql({ownerId:'new-owner',oldIds:['listing_001','listing_002'],products:buildTestCatalog({ownerId:'new-owner'})});
 await assert.rejects(db.exec(sql),/IDENTITY_REQUIRED/);await db.exec('rollback');assert.equal((await db.query('select count(*)::int n from assets')).rows[0].n,2);assert.equal((await db.query('select count(*)::int n from assets where is_locked')).rows[0].n,0);
 await db.exec("update profiles set verified=true where id='new-owner'");await db.exec(sql);
 assert.equal((await db.query("select count(*)::int n from assets where status='available' and not is_locked")).rows[0].n,20);
 assert.deepEqual((await db.query("select title,status,is_locked from assets where id='listing_001'")).rows[0],{title:'Old rented',status:'rented',is_locked:true});
 assert.deepEqual((await db.query("select asset_id,status from transactions where id='ongoing'")).rows[0],{asset_id:'listing_001',status:'in_use'});
 assert.equal((await db.query("select jsonb_array_length(images) n from assets where id='test-20261021-01'")).rows[0].n,3);
 assert.deepEqual((await db.query('select kind,payload from automation_jobs')).rows,[{kind:'NOTIFY_BROADCAST',payload:{source:'ASSET',id:'unrelated'}}]);
 await assert.rejects(db.exec(sql),/BATCH_NOT_IN_DRAFT/);await db.exec('rollback');assert.equal((await db.query('select count(*)::int n from assets')).rows[0].n,22);
 }finally{await db.close();}
});
