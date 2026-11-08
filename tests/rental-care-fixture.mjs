import { createNeighborhoodFixture } from "./neighborhood-fixture.mjs";
import { readFile } from "node:fs/promises";
export async function createCareFixture(directory) {
  const db = await createNeighborhoodFixture(directory);
  await db.exec(`alter table profiles add column email text;
 alter table assets add column created_at timestamptz default now(),add column location_details jsonb default '{}',add column is_boosted boolean default false;
 alter table rental_agreements add column renter_id text,add column lender_id text;
 alter table transactions add column renter_id text,add column lender_id text,add column order_data jsonb default '{}';
 update profiles set email=id||'@example.test';
 insert into assets(id,owner_id,title,description,category,daily_price,market_value,images,status) values
 ('test-vacuum','nk-test-owner','Máy hút bụi TEST','TEST','gia-dung',50000,1000000,'[]','available'),
 ('test-cleaner','nk-test-renter2','Máy hút bụi gia đình TEST','TEST','gia-dung',60000,1000000,'[]','available'),
 ('test-camera','nk-test-renter2','Máy ảnh TEST','TEST','may-anh',120000,1000000,'[]','available');`);
  for (const file of [
    "rental-care.sql",
    "personalization.sql",
    "declared-interests.sql",
    "security-lockdown.sql",
  ])
    await db.exec(await readFile("deploy/vietnam/" + file, "utf8"));
  return db;
}
