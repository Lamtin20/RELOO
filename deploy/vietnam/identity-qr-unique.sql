alter table kyc_photo_sessions add column if not exists qr_fields_encrypted text;
alter table kyc_photo_sessions add column if not exists qr_national_hash text;
create index if not exists profile_contact_email on profiles(lower(btrim(email))) where deleted_at is null;
create index if not exists profile_contact_phone on profiles(reloo_normalize_phone(phone)) where deleted_at is null;
create index if not exists identity_submission_hash on kyc_submissions(national_id_hash) where superseded_at is null;
create index if not exists identity_verified_hash on verified_identities(national_id_hash);
create or replace function reloo_identity_conflict(p_hash text,p_profile text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from kyc_submissions s join profiles p on p.id=s.profile_id where s.national_id_hash=p_hash and s.profile_id<>p_profile and p.deleted_at is null and s.superseded_at is null and s.status in ('QUEUED','PROCESSING','REVIEW','APPROVED')) or exists(select 1 from verified_identities i join profiles p on p.id=i.profile_id where i.national_id_hash=p_hash and i.profile_id<>p_profile and p.deleted_at is null);
$$;
create or replace function reloo_store_identity_qr(p_profile text,p_session uuid,p_hash text,p_fields text) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_hash!~'^[a-f0-9]{64}$' or length(p_fields) not between 20 and 10000 then raise exception 'QR_INVALID';end if;
 perform pg_advisory_xact_lock(hashtextextended('identity:'||p_hash,0));
 if reloo_identity_conflict(p_hash,p_profile) then raise exception 'IDENTIFIER_EXISTS';end if;
 update kyc_photo_sessions set qr_fields_encrypted=p_fields,qr_national_hash=p_hash where id=p_session and profile_id=p_profile and expires_at>now() and consumed_at is null and capture_version=2;
 if not found then raise exception 'PHOTO_SESSION_EXPIRED';end if;
end$$;
create or replace function reloo_unique_identity() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.national_id_hash is null then return new;end if;
 if tg_op='UPDATE' and new.national_id_hash is not distinct from old.national_id_hash then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('identity:'||new.national_id_hash,0));
 if reloo_identity_conflict(new.national_id_hash,new.profile_id) then raise exception 'IDENTIFIER_EXISTS';end if;
 return new;
end$$;
drop trigger if exists identity_submission_unique on kyc_submissions;
create trigger identity_submission_unique before insert or update of national_id_hash on kyc_submissions for each row execute function reloo_unique_identity();
drop trigger if exists identity_verified_unique on verified_identities;
create trigger identity_verified_unique before insert or update of national_id_hash on verified_identities for each row execute function reloo_unique_identity();
create or replace function reloo_attach_qr_fields() returns trigger language plpgsql security definer set search_path=public as $$
declare session kyc_photo_sessions;begin
 select * into session from kyc_photo_sessions where id=new.photo_session_id and profile_id=new.profile_id;
 if session.qr_national_hash is not null then
  if session.qr_national_hash<>new.national_id_hash then raise exception 'QR_ID_MISMATCH';end if;
  new.extracted_encrypted:=session.qr_fields_encrypted;
  new.checks:=coalesce(new.checks,'{}')||jsonb_build_object('source','CARD_QR','eligible',false,'manualReview',true);
 end if;return new;
end$$;
drop trigger if exists identity_attach_qr on kyc_submissions;
create trigger identity_attach_qr before insert on kyc_submissions for each row execute function reloo_attach_qr_fields();

create or replace function reloo_contact_exists(p_email text,p_phone text,p_auth uuid default null) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles p where p.deleted_at is null and (p_auth is null or p.auth_user_id is distinct from p_auth) and (nullif(lower(trim(p_email)),'')=lower(trim(p.email)) or reloo_normalize_phone(p_phone) is not null and reloo_normalize_phone(p.phone)=reloo_normalize_phone(p_phone)));
$$;
create or replace function reloo_unique_contact() returns trigger language plpgsql security definer set search_path=public as $$
declare key text;begin
 for key in select value from unnest(array['email:'||coalesce(lower(trim(new.email)),''),'phone:'||coalesce(reloo_normalize_phone(new.phone),'')]) value order by value loop perform pg_advisory_xact_lock(hashtextextended(key,0));end loop;
 if new.deleted_at is null and exists(select 1 from profiles p where p.id<>new.id and p.deleted_at is null and (nullif(lower(trim(new.email)),'')=lower(trim(p.email)) or reloo_normalize_phone(new.phone) is not null and reloo_normalize_phone(new.phone)=reloo_normalize_phone(p.phone))) then raise exception 'IDENTIFIER_EXISTS';end if;return new;
end$$;
drop trigger if exists profile_unique_contact on profiles;
create trigger profile_unique_contact before insert or update of email,phone on profiles for each row execute function reloo_unique_contact();
create or replace function reloo_erase_session_qr() returns trigger language plpgsql security definer set search_path=public as $$begin if new.deleted_at is not null and old.deleted_at is null then update kyc_photo_sessions set qr_fields_encrypted=null,qr_national_hash=null where profile_id=new.id;end if;return new;end$$;
drop trigger if exists profile_erase_session_qr on profiles;
create trigger profile_erase_session_qr after update of deleted_at on profiles for each row execute function reloo_erase_session_qr();
revoke all on function reloo_erase_session_qr() from public,anon,authenticated;
revoke all on function reloo_identity_conflict(text,text),reloo_store_identity_qr(text,uuid,text,text),reloo_unique_identity(),reloo_attach_qr_fields(),reloo_contact_exists(text,text,uuid),reloo_unique_contact() from public,anon,authenticated;
grant execute on function reloo_identity_conflict(text,text),reloo_store_identity_qr(text,uuid,text,text),reloo_contact_exists(text,text,uuid) to service_role;
notify pgrst,'reload schema';
