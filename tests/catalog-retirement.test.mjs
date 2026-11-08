import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('maintenance can hide old inventory, but cannot publish, unlock, impersonate an owner or bypass identity',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role service_role;create table assets(id text primary key,owner_id text,title text,status text,is_locked boolean default false,updated_at timestamptz);insert into assets values('old','owner','Original','rented',false,now());
 create function public.reloo_assert_active(text) returns void language plpgsql as $$begin raise exception 'OWNER_GATED' using errcode='42501';end$$;
 create function public.reloo_assert_identity(text) returns void language plpgsql as $$begin raise exception 'IDENTITY_REQUIRED' using errcode='42501';end$$;
 create function public.reloo_asset_gate() returns trigger language plpgsql as $$begin perform public.reloo_assert_active(new.owner_id);if new.status='available' then perform public.reloo_assert_identity(new.owner_id);end if;return new;end$$;
 create trigger gate before insert or update on assets for each row execute function public.reloo_asset_gate();grant all on assets to service_role;`);
 const migration=await fs.readFile('deploy/vietnam/catalog-retirement.sql','utf8');await db.exec(migration);await db.exec(migration);
 await db.exec("update assets set is_locked=true where id='old'");const r=await db.query("select title,status,is_locked from assets where id='old'");assert.deepEqual(r.rows[0],{title:'Original',status:'rented',is_locked:true});
 await assert.rejects(db.exec("update assets set is_locked=false where id='old'"),/OWNER_GATED/);
 await assert.rejects(db.exec("update assets set title='Changed',is_locked=true where id='old'"),/OWNER_GATED/);
 await assert.rejects(db.exec("insert into assets(id,owner_id,title,status) values('new','owner','New','available')"),/OWNER_GATED/);
 await db.exec('set role service_role');await assert.rejects(db.exec("update assets set is_locked=false where id='old'"),/OWNER_GATED/);
 }finally{await db.close();}
});
