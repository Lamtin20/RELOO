create table if not exists local_brands(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 80),owner_id text not null references profiles(id),description text not null default '',image_url text not null default '',status text not null check(status in ('DRAFT','ACTIVE','PAUSED')),version integer not null default 1,updated_at timestamptz not null default now());
create table if not exists local_brand_products(brand_id uuid references local_brands(id) on delete cascade,asset_id text references assets(id) on delete cascade,primary key(brand_id,asset_id));
alter table local_brands enable row level security;alter table local_brand_products enable row level security;
revoke all on local_brands,local_brand_products from public,anon,authenticated;grant all on local_brands,local_brand_products to service_role;
create or replace function reloo_save_local_brand(p_actor text,p_id uuid,p_version integer,p_name text,p_owner text,p_description text,p_image text,p_status text,p_assets text[]) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 if not reloo_staff_permission(p_actor,'content.write') then raise exception 'PERMISSION_REQUIRED';end if;
 if length(p_name) not between 2 and 80 or length(p_description)>600 or p_status not in ('DRAFT','ACTIVE','PAUSED') or cardinality(p_assets)>30 or p_assets is null then raise exception 'INVALID_BRAND';end if;
 perform reloo_assert_active(p_owner);
 if exists(select 1 from unnest(p_assets) target where not exists(select 1 from assets where id=target and owner_id=p_owner and coalesce(listing_data->>'transactionMode','RENT') in ('SALE','BOTH'))) then raise exception 'BRAND_PRODUCT_OWNER_REQUIRED';end if;
 if p_id is null then insert into local_brands(name,owner_id,description,image_url,status) values(p_name,p_owner,p_description,p_image,p_status) returning id into result;
 else update local_brands set name=p_name,owner_id=p_owner,description=p_description,image_url=p_image,status=p_status,version=version+1,updated_at=now() where id=p_id and version=p_version returning id into result;if not found then raise exception 'VERSION_CONFLICT';end if;end if;
 delete from local_brand_products where brand_id=result;insert into local_brand_products(brand_id,asset_id) select result,unnest(p_assets) on conflict do nothing;
 insert into security_audit(actor_id,action,details) values(p_actor,'LOCAL_BRAND_SAVED',jsonb_build_object('brandId',result,'status',p_status));return result;
end$$;
revoke all on function reloo_save_local_brand(text,uuid,integer,text,text,text,text,text,text[]) from public,anon,authenticated;
grant execute on function reloo_save_local_brand(text,uuid,integer,text,text,text,text,text,text[]) to service_role;
notify pgrst,'reload schema';
