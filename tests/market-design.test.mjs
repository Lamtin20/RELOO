import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {matchesMarketChannel,commerceLabel,safePartnerImage,MARKET_CHANNELS} from '../lib/marketplace-channels.js';

test('marketplace channels separate rental, sale and external partner products',()=>{
 const rental={},sale={transactionMode:'SALE',salePrice:100},both={transactionMode:'BOTH',salePrice:200};
 assert.equal(matchesMarketChannel(rental,'RENT'),true);
 assert.equal(matchesMarketChannel(sale,'RENT'),false);
 assert.equal(matchesMarketChannel(both,'RENT'),true);
 assert.equal(matchesMarketChannel(both,'SALE'),true);
 assert.equal(matchesMarketChannel({...both,salePrice:0},'SALE'),false);
 assert.equal(matchesMarketChannel(rental,'AFFILIATE'),false);
 assert.equal(matchesMarketChannel(sale,'BRAND'),false);
 assert.equal(commerceLabel(both),'Thuê hoặc mua');
 assert.equal(new Set(MARKET_CHANNELS.map(c=>c.id)).size,5);
 assert.equal(safePartnerImage('https://third-party.example/logo.png'),false);
 assert.equal(safePartnerImage('/images/../secret'),false);
 assert.equal(safePartnerImage('/images/brand/logo.svg'),true);
});

test('Local Brand publishing requires CRM permission, real shop ownership and current version',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create table profiles(id text primary key);insert into profiles values('shop'),('other');
   create table assets(id text primary key,owner_id text,listing_data jsonb);
   insert into assets values('sale','shop','{"transactionMode":"SALE"}'),('rental','shop','{}'),('foreign','other','{"transactionMode":"BOTH"}');
   create table security_audit(actor_id text,action text,details jsonb);
   create function reloo_staff_permission(actor text,permission text) returns boolean language sql as $$select actor='admin'$$;
   create function reloo_assert_active(actor text) returns void language plpgsql as $$begin if not exists(select 1 from profiles where id=actor) then raise exception 'ACCOUNT_REQUIRED';end if;end$$;`);
  await db.exec(await readFile(new URL('../deploy/vietnam/local-brands.sql',import.meta.url),'utf8'));
  const save=(actor,assets,id=null,version=0,status='ACTIVE')=>db.query('select reloo_save_local_brand($1,$2,$3,$4,$5,$6,$7,$8,$9) id',[actor,id,version,'Real shop','shop','Description','',status,assets]);
  await assert.rejects(save('shop',['sale']),/PERMISSION/);
  await assert.rejects(save('admin',['foreign']),/OWNER/);
  await assert.rejects(save('admin',['rental']),/OWNER/);
  const id=(await save('admin',['sale'])).rows[0].id;
  assert.equal((await db.query('select count(*)::int n from local_brand_products')).rows[0].n,1);
  await assert.rejects(save('admin',['sale'],id,0),/VERSION_CONFLICT/);
  await save('admin',[],id,1,'PAUSED');
  assert.equal((await db.query('select count(*)::int n from local_brand_products')).rows[0].n,0);
  assert.equal((await db.query('select status from local_brands')).rows[0].status,'PAUSED');
  await db.exec('set role authenticated');
  await assert.rejects(db.exec('select * from local_brands'),/permission denied/);
 }finally{await db.close();}
});
