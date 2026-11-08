import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {demoStays,DEMO_ACTOR} from './catalog.js';
export async function createStayFixture(path){
 const db=new PGlite(path);
 if((await db.query("select to_regclass('public.stay_properties') as t")).rows[0].t)return db;
 await db.exec("create role anon; create role authenticated; create role service_role;");
 await db.exec(await readFile(new URL('../../supabase/migrations/20261022120000_room_booking.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../../supabase/migrations/20261022121000_room_booking_management.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../../supabase/migrations/20261022122000_room_booking_channels.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../../supabase/migrations/20261023120000_stay_checkout_noon.sql',import.meta.url),'utf8'));
 for(const [i,s] of demoStays.entries()){
  await db.query('insert into stay_properties(id,owner_id,name,city,address,status) values($1,$2,$3,$4,$5,\'APPROVED\')',[s.id,DEMO_ACTOR,s.name,s.city,s.area+' · địa chỉ mô phỏng']);
  await db.query('insert into stay_memberships values($1,$2)',[s.id,DEMO_ACTOR]);
  await db.query('insert into stay_room_types(id,property_id,name,capacity,nightly_price,amenities,policy,enabled) values($1,$2,$3,$4,$5,$6,$7,true)',[s.roomTypeId,s.id,s.room,s.capacity,s.nightlyPrice,JSON.stringify(s.amenities),JSON.stringify({id:'DEMO_FLEX',demo:true,refundBeforeCheckin:100})]);
  await db.query('insert into stay_units values($1,$2,$3,true)',['40000000-0000-4000-8000-00000000000'+(i+1),s.roomTypeId,'DEMO-01']);
 }
 return db;
}
export async function stayCommand(db,actor,op,input={},admin=false){return (await db.query('select reloo_stay_command($1,$2,$3,$4) as data',[actor,admin,op,JSON.stringify(input)])).rows[0].data;}
