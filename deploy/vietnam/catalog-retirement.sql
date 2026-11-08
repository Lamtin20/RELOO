-- Backend maintenance may only hide a row, without rewriting the owner's record.
-- Publishing/unlocking continues through the normal account and identity checks.
do $migration$
declare original text; updated text;
begin
 select pg_get_functiondef('public.reloo_asset_gate()'::regprocedure) into original;
 if position('CATALOG_HIDE_ONLY_V1' in original)>0 then return;end if;
 if position('perform public.reloo_assert_active(new.owner_id)' in original)=0
   or position('reloo_assert_identity(new.owner_id)' in original)=0 then
  raise exception 'CATALOG_GATE_SOURCE_CHANGED';
 end if;
 updated:=regexp_replace(original,'begin', $body$begin
 -- CATALOG_HIDE_ONLY_V1: no new publication, identity or ownership is granted.
 if tg_op='UPDATE' and current_user='postgres' and new.is_locked=true
   and not coalesce(old.is_locked,false)
   and (to_jsonb(new)-'is_locked'-'updated_at')=(to_jsonb(old)-'is_locked'-'updated_at') then
  return new;
 end if;
$body$,'i');
 if updated=original then raise exception 'CATALOG_GATE_PATCH_FAILED';end if;
 execute updated;
end $migration$;
-- Apply deploy/vietnam/security-lockdown.sql in the same maintenance transaction.
