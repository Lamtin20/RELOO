import {validateListing} from '../../lib/db/listing-write.js';
import {TEST_CATALOG_BATCH} from '../../lib/catalog/test-catalog-20261021.js';
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
export function catalogSwapSql({products,ownerId,oldIds}){
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(ownerId||'')||products?.length!==20||new Set(products.map(p=>p.id)).size!==20||!Array.isArray(oldIds)||oldIds.some(id=>!/^listing_\d{3}$/.test(id)))throw Error('INVALID_SWAP_PLAN');
 if(products.some(p=>p.testCatalogBatch!==TEST_CATALOG_BATCH||!p.id.startsWith(`test-${TEST_CATALOG_BATCH}-`)))throw Error('INVALID_BATCH');
 const rows=products.map(p=>{const v=validateListing(p);return {...v,id:p.id,owner_id:ownerId,status:'available',is_locked:false,trust_badges:[],labels:p.labels,rating:null,review_count:0,view_count:0,is_boosted:false,listing_data:{...v.listing_data,testCatalogBatch:TEST_CATALOG_BATCH}};});
 const ids=quote(JSON.stringify(oldIds))+'::jsonb',payload=quote(JSON.stringify(rows))+'::jsonb';
 const columns=['id','owner_id','title','description','category','daily_price','market_value','location','location_details','images','specs','condition','status','is_locked','trust_badges','labels','rating','review_count','view_count','is_boosted','listing_data'];
 return `-- Review and back up before execution. Requires catalog-retirement.sql and security-lockdown.sql.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
select pg_advisory_xact_lock(hashtext('reloo-catalog-swap'));
lock table public.assets in share row exclusive mode;
-- Fail before any write when the owner is not genuinely active and verified.
select public.reloo_assert_active(${quote(ownerId)});
select public.reloo_assert_identity(${quote(ownerId)});
do $guard$ begin
 if exists(select 1 from public.assets where id like 'test-${TEST_CATALOG_BATCH}-%' and status<>'paused') then raise exception 'BATCH_NOT_IN_DRAFT';end if;
 if (select count(*) from public.assets where id in(select jsonb_array_elements_text(${ids})))<>${oldIds.length} then raise exception 'OLD_CATALOG_CHANGED';end if;
 if exists(select 1 from public.assets where status in('available','rented') and not is_locked and not(id in(select jsonb_array_elements_text(${ids}))) and not(id like 'test-${TEST_CATALOG_BATCH}-%')) then raise exception 'UNREVIEWED_PUBLIC_LISTINGS';end if;
end $guard$;
insert into public.assets(${columns.join(',')})
select ${columns.map(c=>'catalog_row.'+c).join(',')} from jsonb_populate_recordset(null::public.assets,${payload}) catalog_row
on conflict(id) do update set ${columns.filter(c=>c!=='id').map(c=>c+'=excluded.'+c).join(',')};
-- Synthetic fixtures must not broadcast publication alerts to real customers.
-- Remove only this batch's own queued alerts before any worker can see a commit.
delete from public.automation_jobs where kind='NOTIFY_BROADCAST' and payload->>'source'='ASSET'
 and payload->>'id' in(select jsonb_array_elements_text(${quote(JSON.stringify(rows.map(r=>r.id)))}::jsonb));
-- Only hide old inventory. Keep status, ownership and every transaction intact.
update public.assets set is_locked=true where id in(select jsonb_array_elements_text(${ids})) and not is_locked;
do $check$ begin
 if (select count(*) from public.assets where id like 'test-${TEST_CATALOG_BATCH}-%' and status='available' and not is_locked)<>20 then raise exception 'NEW_CATALOG_INCOMPLETE';end if;
end $check$;
commit;
select json_build_object('batch','${TEST_CATALOG_BATCH}','published',20,'retired',${oldIds.length});
`;
}
