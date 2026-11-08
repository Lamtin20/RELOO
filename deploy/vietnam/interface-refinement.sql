alter table public.brand_settings add column if not exists site_title text not null default 'Reloo - Cộng đồng thuê & cho thuê đồ dùng, thiết bị';
alter table public.brand_settings add column if not exists shipping_enabled boolean not null default false;
alter table public.brand_settings add column if not exists rental_payments_enabled boolean not null default false;
notify pgrst,'reload schema';
