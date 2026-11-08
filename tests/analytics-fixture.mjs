import {createNeighborhoodFixture} from './neighborhood-fixture.mjs';
import fs from 'node:fs/promises';
export async function createAnalyticsFixture(path){const db=await createNeighborhoodFixture(path);
 await db.exec(`alter table assets add column updated_at timestamptz default now();
 create table journey_events(id uuid primary key default gen_random_uuid(),visitor_hash text not null,session_hash text not null,event text not null,path text not null,category text,duration_ms integer,created_at timestamptz not null default now());
 create table api_traces(id uuid primary key default gen_random_uuid(),method text,route text,status integer,duration_ms integer,created_at timestamptz default now());
 alter table transactions add column created_at timestamptz default now();
 update crm_staff set permissions=array['*'] where profile_id='nk-test-admin';`);
 await db.exec(await fs.readFile('deploy/vietnam/traffic-seller-analytics.sql','utf8'));
 for(let i=0;i<8;i++){const session='test-session-'+i,visitor='test-visitor-'+i;for(const event of ['ITEM_IMPRESSION','PRODUCT_CLICK','PRODUCT_VIEW'])await db.query('select reloo_product_event($1)',[{event_id:crypto.randomUUID(),event,asset_id:'nk-test-drill',schema_version:2,observed_at:new Date().toISOString(),visitor_hash:visitor,session_hash:session,path:'/product/:id',placement:'neighborhood',duration_ms:0,device:i%2?'mobile':'desktop',touch:{channel:i%2?'organic_search':'direct_unknown'},exclusion_reason:null}]);}
 return db;
}
