-- Isolated staging synthetic inventory only. Requires the dedicated provider profile.
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM profiles WHERE id='uat-service-provider' AND profile_data->>'demo'='true') THEN RAISE EXCEPTION 'UAT_PROVIDER_REQUIRED';END IF;END $$;
INSERT INTO public.service_offers(id,owner_id,title,category,city,rate,status,is_demo) VALUES
 ('41000000-0000-4000-8000-000000000001','uat-service-provider','DEMO · Lắp ráp bàn và kệ','assembly','HCM',120000,'APPROVED',true),
 ('41000000-0000-4000-8000-000000000002','uat-service-provider','DEMO · Chuyển đồ trong nội khu','moving','HCM',150000,'APPROVED',true),
 ('41000000-0000-4000-8000-000000000003','uat-service-provider','DEMO · Chụp ảnh sản phẩm','photo','HCM',200000,'APPROVED',true),
 ('41000000-0000-4000-8000-000000000004','uat-service-provider','DEMO · Lắp ráp đồ dùng Hà Nội','assembly','HN',140000,'APPROVED',true)
ON CONFLICT(id) DO NOTHING;
