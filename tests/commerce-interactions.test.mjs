import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {INITIAL_SCROLL,nextCommerceScroll} from '../lib/mobile/commerce-scroll.js';
import {setup,source} from './helpers/promotion-db.mjs';
test('scrolling compacts search and hides nav only when scrolling toward later marketplace content',()=>{
 let state=nextCommerceScroll(INITIAL_SCROLL,200,'/');assert.equal(state.compact,true);assert.equal(state.hidden,true);
 state=nextCommerceScroll(state,196,'/');assert.equal(state.hidden,true);
 state=nextCommerceScroll(state,160,'/');assert.equal(state.hidden,false);assert.equal(state.compact,true);
 state=nextCommerceScroll(state,50,'/');assert.equal(state.compact,true);assert.equal(state.hidden,false);
 state=nextCommerceScroll(state,0,'/');assert.equal(state.compact,false);assert.equal(state.hidden,false);
 assert.equal(nextCommerceScroll(INITIAL_SCROLL,200,'/account').account,true);
 assert.equal(nextCommerceScroll(INITIAL_SCROLL,200,'/account').hidden,false);
 assert.equal(nextCommerceScroll(INITIAL_SCROLL,200,'/purchase/1').compact,false);
});
test('automatic offer recommendations enforce consent, amount, audience, first-order and usage conditions for rental and sale',async()=>{
 const db=await setup();try{
 await db.exec('create table purchase_orders(buyer_id text,status text);');
 await db.exec(await readFile(new URL('../deploy/vietnam/promotion-recommendations.sql',import.meta.url),'utf8'));
 const campaign=(await db.query("insert into promotion_campaigns(name,terms,services,funder,starts_at,ends_at,status,created_by,updated_by) values('Offers for customers','Fixture terms with explicit consent',array['RENTAL','SALE'],'PROVIDER',now()-interval '1 hour',now()+interval '1 day','ACTIVE','admin','admin') returning id")).rows[0].id;
 await db.query("insert into promotion_coupons(campaign_id,code,discount_type,value,minimum_amount,starts_at,ends_at,total_limit,customer_limit,status,public_code,created_by,updated_by) values($1,'PUBLIC20','PERCENT',2000,50000,now()-interval '1 hour',now()+interval '1 day',10,1,'ACTIVE',true,'admin','admin')",[campaign]);
 const recommend=(service='SALE',gross=100000)=>db.query("select reloo_recommend_promotions('alice','bob',$1,$2) result",[service,gross]);
 assert.deepEqual((await recommend()).rows[0].result,[]);
 await db.query("select reloo_invite_promotion('admin',$1,'bob');",[campaign]);await db.query("select reloo_accept_promotion('bob',$1,1,true)",[campaign]);
 assert.equal((await recommend()).rows[0].result[0].discount,'20000');
 assert.equal((await recommend('RENTAL')).rows[0].result[0].code,'PUBLIC20');
 assert.deepEqual((await recommend('SALE',1000)).rows[0].result,[]);
 await db.exec("update promotion_coupons set customer_ids=array['bob'];");assert.deepEqual((await recommend()).rows[0].result,[]);
 await db.exec("update promotion_coupons set customer_ids='{}',public_code=false;");assert.deepEqual((await recommend()).rows[0].result,[]);
 await db.exec("update promotion_coupons set customer_ids=array['alice'],first_order_only=true;insert into purchase_orders values('alice','COMPLETED');");assert.deepEqual((await recommend()).rows[0].result,[]);
 await db.exec("delete from purchase_orders;update promotion_coupons set first_order_only=false,ends_at=now()-interval '1 second';");assert.deepEqual((await recommend()).rows[0].result,[]);
 assert.equal((await db.query('select count(*)::int n from promotion_redemptions')).rows[0].n,0);
 await db.exec("update promotion_coupons set ends_at=now()+interval '1 day',public_code=true,customer_ids='{}';");
 assert.equal((await recommend()).rows[0].result.length,1);
 await db.query("insert into promotion_redemptions(id,order_kind,order_id,campaign_id,coupon_id,profile_id,provider_id,service,gross,discount,net,owner_amount,funder,quote,receipt,status) select gen_random_uuid(),'INVOICE',gen_random_uuid(),campaign_id,id,'alice','bob','SALE',100000,20000,80000,80000,'PROVIDER','{}','{}','RESERVED' from promotion_coupons where campaign_id=$1",[campaign]);
 assert.deepEqual((await recommend()).rows[0].result,[]);
 const funded=(await db.query("insert into promotion_campaigns(name,terms,services,funder,starts_at,ends_at,status,created_by,updated_by) values('Unfunded program','Fixture terms require sponsor funds',array['SALE'],'RELOO',now()-interval '1 hour',now()+interval '1 day','ACTIVE','admin','admin') returning id")).rows[0].id;
 await db.query("insert into promotion_coupons(campaign_id,code,discount_type,value,starts_at,ends_at,total_limit,customer_limit,status,public_code,created_by,updated_by) values($1,'FUNDS20','PERCENT',2000,now()-interval '1 hour',now()+interval '1 day',10,1,'ACTIVE',true,'admin','admin')",[funded]);
 assert.deepEqual((await recommend()).rows[0].result,[]);
 const cash=await source(db,30000,null);
 await db.query("select reloo_fund_promotion('admin',$1,$2,30000,'Verified fixture funding for program')",[funded,cash.id]);
 assert.equal((await recommend()).rows[0].result[0].code,'FUNDS20');
 await source(db,25000,null,'OUT');
 assert.deepEqual((await recommend()).rows[0].result,[]);
 }finally{await db.close();}
});
