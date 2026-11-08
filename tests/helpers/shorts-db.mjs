import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
export async function shortsDb({automatic=false}={}){const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;
create table profiles(id text primary key,status text default 'active',activation_status text default 'ACTIVE',screening_valid_until timestamptz default now()+interval '1 day',deleted_at timestamptz);
insert into profiles(id) values('owner'),('other'),('admin');
create table assets(id text primary key,owner_id text references profiles(id),title text,status text default 'available',is_locked boolean default false);
insert into assets(id,owner_id,title) values('owned','owner','Camera'),('foreign','other','Other camera');
create table verified_identities(profile_id text references profiles(id),expires_at timestamptz);
create table security_audit(actor_id text,subject_id text,action text,details jsonb);
create function reloo_assert_active(actor text) returns void language plpgsql as $$begin if not exists(select 1 from profiles where id=actor and status='active' and activation_status='ACTIVE' and screening_valid_until>now()) then raise exception 'ACCOUNT_RESTRICTED';end if;end $$;
create function reloo_staff_permission(actor text,permission text) returns boolean language sql as $$ select actor='admin' $$;`);
for(const n of ['short-videos','shorts-experience'])await db.exec(await readFile(new URL('../../deploy/vietnam/'+n+'.sql',import.meta.url),'utf8'));
if(automatic)await db.exec(await readFile(new URL('../../deploy/vietnam/shorts-quality-auto.sql',import.meta.url),'utf8'));
return db;}
export async function fixtureShort(db,{owner='owner',status='PUBLISHED',mediaStatus='READY',products=['owned']}={}){
 const m=(await db.query("insert into short_video_media(id,profile_id,filename,duration,width,height,bytes,status) select id,$1,id::text||'.mp4',10,360,640,100000,$2 from (select gen_random_uuid() id) q returning id",[owner,mediaStatus])).rows[0].id;
 const id=(await db.query("select reloo_create_short($1,$2,'Fixture clip',$3,true) id",[owner,m,products.map(assetId=>({kind:'RENTAL',assetId}))])).rows[0].id;
 if(status!=='DRAFT')await db.query('update short_videos set status=$2 where id=$1',[id,status]);
 return {id,mediaId:m};
}
