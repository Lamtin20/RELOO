import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
export const IDS = {
  area: "10000000-0000-4000-8000-000000000001",
  subzone: "10000000-0000-4000-8000-000000000002",
  building: "10000000-0000-4000-8000-000000000003",
  otherBuilding: "10000000-0000-4000-8000-000000000004",
  point: "10000000-0000-4000-8000-000000000005",
};
export async function createNeighborhoodFixture(directory,adapter=null) {
  const db = adapter||new PGlite(directory);
  await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id text primary key,name text,activation_status text not null default 'ACTIVE',deleted_at timestamptz,role text default 'renter',kyc_level text default 'L2',profile_data jsonb default '{}');
 create table security_audit(id uuid primary key default gen_random_uuid());
 create function reloo_create_inquiry(text,text,jsonb) returns text language sql as $$select 'test'::text$$;
 create function reloo_record_screening(text,text,jsonb,text) returns text language sql as $$select 'test'::text$$;
 create table verified_identities(profile_id text primary key references profiles(id),expires_at timestamptz,submission_id uuid not null default gen_random_uuid());
 create table crm_staff(profile_id text primary key,permissions text[]);
 create table assets(id text primary key,owner_id text,title text,description text,category text,daily_price bigint,market_value bigint,images jsonb,condition text,status text,is_locked boolean default false,dispute_status text,listing_data jsonb default '{}');
 create table rental_agreements(id uuid primary key default gen_random_uuid(),listing_id text,status text,starts_at timestamptz,ends_at timestamptz);
 create table transactions(id text primary key,asset_id text,status text,start_date date,end_date date);
 create table notifications(id text primary key,user_id text,title text,body text,notification_type text,link text,notification_data jsonb,is_read boolean default false,created_at timestamptz default now());
 create table notification_rules(key text primary key,enabled boolean default true,email_enabled boolean default true,marketing boolean default false);
 create table email_delivery_log(notification_id text primary key,status text default 'QUEUED');
 create table automation_jobs(id serial primary key,kind text,payload jsonb);
 create table media_assets(id uuid primary key,filename text,mime text,width integer,height integer,bytes integer,purpose text,created_by text);
 create function reloo_assert_active(text) returns void language plpgsql as $$begin if not exists(select 1 from profiles where id=$1 and activation_status='ACTIVE' and deleted_at is null) then raise exception 'FORBIDDEN';end if;end $$;
 create function reloo_staff_permission(text,text) returns boolean language sql stable as $$select exists(select 1 from crm_staff where profile_id=$1 and ('*'=any(permissions) or $2=any(permissions)))$$;
 insert into profiles(id,name) values('nk-test-owner','Test owner'),('nk-test-renter','Test renter'),('nk-test-renter2','Second test renter'),('nk-test-admin','Test administrator'),('nk-test-visitor','Test visitor');
 insert into verified_identities(profile_id,expires_at) select id,now()+interval '1 year' from profiles where id<>'nk-test-visitor';
 insert into crm_staff values('nk-test-admin',array['*']);`);
  for (const file of [
    "neighborhood.sql",
    "neighborhood-promotions.sql",
    "neighborhood-evidence.sql",
    "neighborhood-retention.sql",
    "neighborhood-functions.sql",
    "neighborhood-jobs.sql",
    "neighborhood-location-review.sql",
    "neighborhood-notification-isolation.sql",
    "neighborhood-experience.sql",
  ])
    await db.exec(await readFile("deploy/vietnam/" + file, "utf8"));
  await db.exec(
    "create trigger notification_email_queue after insert on notifications for each row execute function reloo_queue_notification_email()",
  );
  const rules = await readFile("deploy/vietnam/notification-rules.sql", "utf8");
  const gate = rules.match(
    /create or replace function public\.reloo_notification_rule_gate\(\)[\s\S]*?end \$\$;/i,
  )?.[0];
  if (!gate) throw Error("NOTIFICATION_GATE_FIXTURE_MISSING");
  await db.exec(
    gate +
      "create trigger notification_rule_gate before insert on notifications for each row execute function reloo_notification_rule_gate();",
  );
  await db.query(
    `insert into nk_places(id,kind,parent_id,name,status,verification,confidence,source_id,geometry) values
 ($1,'AREA',null,'TEST · Khu cư dân RELOO','ACTIVE','ADMIN_REVIEWED',1,'00000000-0000-4000-8000-000000000001','{"type":"Point","coordinates":[106.8,10.8]}'),
 ($2,'SUBZONE',$1,'TEST · Vườn Xanh','ACTIVE','ADMIN_REVIEWED',1,'00000000-0000-4000-8000-000000000001',null),
 ($3,'BUILDING',$2,'TEST · Tòa A','ACTIVE','ADMIN_REVIEWED',1,'00000000-0000-4000-8000-000000000001',null),
 ($4,'BUILDING',$2,'TEST · Tòa B','ACTIVE','ADMIN_REVIEWED',1,'00000000-0000-4000-8000-000000000001',null),
 ($5,'HANDOVER',$3,'TEST · Sảnh tòa A','ACTIVE','ADMIN_REVIEWED',1,'00000000-0000-4000-8000-000000000001',null)`,
    Object.values(IDS),
  );
  await db.query(
    `insert into nk_policies(area_id,version,terms,published_by,hold_minutes,payment_minutes,cancel_before_hours) values($1,1,$2,'nk-test-admin',30,30,0)`,
    [
      IDS.area,
      JSON.stringify({
        "vi-VN":
          "DỮ LIỆU TEST. Thanh toán trực tiếp, không có phí nền tảng. Hai bên kiểm tra đồ và xác nhận nhận/trả. Có thể hủy trước nhận; khoản đã trả phải đối chiếu hoàn trực tiếp. Không giữ tiền, không bảo hiểm.",
        "en-US":
          "TEST DATA. Direct payment, zero platform fee. Both parties inspect and acknowledge pickup and return. Cancel before pickup; paid amounts need direct refund reconciliation. No escrow or insurance.",
      }),
    ],
  );
  await db.query("update nk_places set enabled=true where id=$1", [IDS.area]);
  for (const actor of ["nk-test-owner", "nk-test-renter", "nk-test-renter2"])
    await db.query(
      `insert into nk_memberships(profile_id,area_id,building_id,status,verified_until) values($1,$2,$3,'VERIFIED',now()+interval '180 days')`,
      [actor, IDS.area, IDS.building],
    );
  await db.exec(
    `insert into assets(id,owner_id,title,description,category,daily_price,market_value,images,condition,status) values('nk-test-drill','nk-test-owner','Máy khoan Bosch · TEST','Sản phẩm thử nghiệm, không giao dịch thật','cong-cu',45000,0,'["/images/categories-refreshed/tools.webp"]','TEST · Hoạt động tốt','available')`,
  );
  await db.query(
    `insert into nk_listings(asset_id,owner_id,area_id,subzone_id,building_id,handover_id,scope,rate,unit_minutes,deposit,accessories,condition,instructions,status)
 values('nk-test-drill','nk-test-owner',$1,$2,$3,$4,'AREA',45000,1440,100000,'["Máy khoan","Pin","Sạc"]','TEST · Hoạt động tốt','TEST · Kiểm tra pin trước khi dùng','ACTIVE')`,
    [IDS.area, IDS.subzone, IDS.building, IDS.point],
  );
  return db;
}
