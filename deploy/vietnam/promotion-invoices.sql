alter table invoice_documents add column if not exists buyer_profile_id text references profiles(id);
alter table invoice_documents add column if not exists promotion_id uuid references promotion_redemptions(id);
alter table invoice_documents drop constraint if exists invoice_documents_status_check;
alter table invoice_documents add constraint invoice_documents_status_check check(status in ('DRAFT','REVIEW','CREATING','CREATED','ISSUING','ISSUED','FAILED','UNKNOWN','VOID'));
create or replace function reloo_create_promoted_invoice(p_actor text,p_id uuid,p_profile text,p_service text,p_gross bigint,p_code text,p_receipt jsonb,p_document jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare quote jsonb;
begin
 if not reloo_staff_permission(p_actor,'accounting.write') then raise exception 'PERMISSION_REQUIRED';end if;
 if p_service not in ('RELOO_FEE','LISTING_BOOST','INSPECTION') then raise exception 'OWN_SERVICE_REQUIRED';end if;
 quote:=reloo_reserve_promotion(p_id,'INVOICE',p_id,p_profile,null,p_service,p_gross,p_code,p_receipt,null);
 if (p_document->>'subtotal')::bigint<>(quote->>'net')::bigint then raise exception 'INVOICE_DISCOUNT_MISMATCH';end if;
 insert into invoice_documents(id,seller_entity_version,seller_snapshot,data_encrypted,subtotal,tax,total,created_by,buyer_profile_id,promotion_id) values(p_id,(p_document->>'sellerVersion')::integer,p_document->'seller',(p_document->>'encrypted'),(p_document->>'subtotal')::bigint,(p_document->>'tax')::bigint,(p_document->>'total')::bigint,p_actor,p_profile,p_id);return p_id;
end $$;
create or replace function reloo_promoted_invoice_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='VOID' and (old.status<>'DRAFT' or old.provider_tracking is not null) then raise exception 'ONLY_UNSENT_DRAFT_CAN_VOID';end if;
 if old.promotion_id is not null and (new.promotion_id is distinct from old.promotion_id or new.subtotal<>old.subtotal or new.tax<>old.tax or new.total<>old.total or new.data_encrypted<>old.data_encrypted) then raise exception 'PROMOTED_INVOICE_PRICE_LOCKED';end if;
 if new.status='ISSUED' and old.status<>'ISSUED' and new.promotion_id is not null then perform reloo_settle_promotion(new.id);end if;
 if new.status='VOID' and new.promotion_id is not null then update promotion_redemptions set status='RELEASED' where id=new.promotion_id and status='RESERVED';end if;return new;
end $$;
drop trigger if exists promoted_invoice_price on invoice_documents;
create trigger promoted_invoice_price before update on invoice_documents for each row execute function reloo_promoted_invoice_status();
create or replace function reloo_void_promotion_invoice(p_actor text,p_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not reloo_staff_permission(p_actor,'accounting.write') or length(trim(p_reason))<20 then raise exception 'PERMISSION_OR_REASON_REQUIRED';end if;
 update invoice_documents set status='VOID',updated_at=now() where id=p_id and status='DRAFT' and provider_tracking is null;
 if not found then raise exception 'ONLY_UNSENT_DRAFT_CAN_VOID';end if;
 insert into security_audit(actor_id,action,details) values(p_actor,'INVOICE_DRAFT_VOIDED',jsonb_build_object('id',p_id,'reason',p_reason));
end $$;
revoke all on function reloo_create_promoted_invoice(text,uuid,text,text,bigint,text,jsonb,jsonb),reloo_void_promotion_invoice(text,uuid,text) from public,anon,authenticated;
grant execute on function reloo_create_promoted_invoice(text,uuid,text,text,bigint,text,jsonb,jsonb),reloo_void_promotion_invoice(text,uuid,text) to service_role;
notify pgrst,'reload schema';
