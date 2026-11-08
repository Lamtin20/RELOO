import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('ledger posting is atomic, deduplicated, balanced, source-bound and append-only',async()=>{
  const db=new PGlite();try{
    await db.exec(`create role anon;create role authenticated;create role service_role;
      create table profiles(id text primary key);create table automation_jobs(id uuid default gen_random_uuid(),kind text,payload jsonb);
      create table security_audit(id bigserial,action text,details jsonb);`);
    await db.exec(await readFile(new URL('../deploy/vietnam/finance.sql',import.meta.url),'utf8'));
    const inbox=(await db.query("select reloo_receive_sepay('1',$1,$2) id",['a'.repeat(64),'encrypted-fixture-only'])).rows[0].id;
    assert.equal((await db.query("select reloo_receive_sepay('1',$1,$2) id",['a'.repeat(64),'encrypted-fixture-only'])).rows[0].id,inbox);
    await assert.rejects(db.query("select reloo_receive_sepay('1',$1,$2)",['b'.repeat(64),'encrypted-fixture-only']),/WEBHOOK_CONTENT_CONFLICT/);
    assert.equal((await db.query('select count(*)::integer n from automation_jobs')).rows[0].n,1);
    const source='00000000-0000-4000-8000-000000000001',proof={providerId:'00000000-0000-4000-8000-000000000002',accountId:'bank-fixture',type:'in',amount:'500000',referenceHash:'a'.repeat(64)};
    proof.occurredAt='2026-10-10T03:00:00Z';
    const args=[inbox,source,proof,'encrypted-proof',{version:1},'a'.repeat(64),'A'.repeat(88),'b'.repeat(64)];
    const query='select reloo_post_sepay($1,$2,$3,$4,$5,$6,$7,$8) id';
    const journal=(await db.query(query,args)).rows[0].id;
    assert.equal((await db.query(query,args)).rows[0].id,journal);
    assert.equal((await db.query('select count(*)::integer n from ledger_journals')).rows[0].n,1);
    assert.equal((await db.query("select sum(amount)::text amount from ledger_lines where side='DEBIT'")).rows[0].amount,'500000');
    await assert.rejects(db.query(query,[inbox,source,{...proof,amount:'600000'},...args.slice(3)]),/PROVIDER_SOURCE_CHANGED/);
    await assert.rejects(db.query('update ledger_lines set amount=1 where journal_id=$1',[journal]),/IMMUTABLE_RECORD/);await assert.rejects(db.query('delete from ledger_journals where id=$1',[journal]),/IMMUTABLE_RECORD/);
    await db.exec('begin');await db.query("insert into ledger_lines(journal_id,account_code,side,amount) values($1,'1121','DEBIT',1)",[journal]);await assert.rejects(db.exec('commit'),/JOURNAL_NOT_BALANCED/);await db.exec('rollback');
    await db.exec('set role authenticated');await assert.rejects(db.query('select * from finance_sources'),/permission denied/);await assert.rejects(db.query(query,args),/permission denied/);
  }finally{await db.close();}
});
