import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {rentalRecord} from '../lib/assurance/rental.js';
test('rental requires two parties and immutable ordered history; three confirmed forgeries restrict only the attributed actor',async()=>{
  const db=new PGlite();process.env.RELOO_PRIVATE_DATA_KEY='aa'.repeat(32);process.env.RELOO_JOURNAL_PRIVATE_KEY=generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'der'}).toString('base64');
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role;
      create table profiles(id text primary key,phone text,name text,activation_status text default 'ACTIVE',profile_data jsonb default '{}',kyc_level text default 'L0',screening_valid_until timestamptz default now()+interval '1 day');
      create table crm_staff(profile_id text primary key,permissions text[],enabled boolean default true);
      create table security_audit(actor_id text,subject_id text,action text,details jsonb);
      create table risk_cases(id uuid default gen_random_uuid(),profile_id text,reason text,status text default 'OPEN');
      create table risk_blacklist(id uuid default gen_random_uuid(),profile_id text,kind text,value_hash text,scope text,status text default 'REVIEW',reason text,evidence jsonb,reviewed_by text,expires_at timestamptz);
      create table automation_jobs(id uuid default gen_random_uuid(),kind text,payload jsonb,created_by text);
      create table kyc_submissions(id uuid primary key,profile_id text,national_id_encrypted text,national_id_hash text,document_paths jsonb,consent_at timestamptz,status text default 'QUEUED',expires_at timestamptz default now()+interval '30 days',face_result jsonb,reason text);
      create table assets(id text primary key,owner_id text);create table chat_threads(id text primary key,listing_id text,lender_id text,buyer_id text);
      create table crm_records(module text,title text,status text,data jsonb,created_by text);
      create function reloo_staff_permission(actor text,permission text) returns boolean language sql as $$select exists(select 1 from crm_staff where profile_id=actor and enabled and ('*'=any(permissions) or permission=any(permissions)))$$;
      create function reloo_assert_active(actor text) returns void language plpgsql as $$begin if not exists(select 1 from profiles where id=actor and activation_status='ACTIVE') then raise exception 'ACCOUNT_RESTRICTED';end if;end$$;
      insert into profiles(id) values('admin'),('alice'),('bob'),('carol');insert into crm_staff values('admin',array['*'],true);
      insert into assets values('asset','alice');insert into chat_threads values('thread','asset','alice','bob');`);
    for(const file of ['assurance','finance','staff-review','legal','rental-history','virtual-accounts'])await db.exec(await readFile(new URL(`../deploy/vietnam/${file}.sql`,import.meta.url),'utf8'));
    assert.equal((await db.query("select reloo_claim_va('admin','fixture-order','alice',500000) ok")).rows[0].ok,true);assert.equal((await db.query("select reloo_claim_va('admin','fixture-order','alice',500000) ok")).rows[0].ok,false);await assert.rejects(db.query("select reloo_claim_va('carol','other-order','alice',500000)"),/PERMISSION_REQUIRED/);
    const hash='a'.repeat(64);await db.query("select reloo_publish_legal('admin',$1,$2,$3)",[hash,{slug:'rental-guide',templateVersion:'fixture',entityVersion:1},'Fixture review with evidence, not a live publication']);
    const id=randomUUID(),data={threadId:'thread',startsAt:'2026-11-01T01:00:00Z',endsAt:'2026-11-02T01:00:00Z',rentAmount:'500000',terms:'Fixture terms only, no real rental.',legalHash:hash,policyVersion:1,requestId:randomUUID()},first=rentalRecord({id,sequence:0,head_hash:'0'.repeat(64)},'alice','PROPOSED',data);
    const proposal='select reloo_propose_rental($1,$2,$3,$4) id';await assert.rejects(db.query(proposal,['carol',id,data,first]),/PARTICIPANT_REQUIRED/);await db.query(proposal,['alice',id,data,first]);assert.equal((await db.query(proposal,['alice',randomUUID(),data,first])).rows[0].id,id);
    const change=async(actor,action)=>{const item=(await db.query('select * from rental_agreements where id=$1',[id])).rows[0],record=rentalRecord(item,actor,action,{fixture:true}),requestId=randomUUID();return db.query('select reloo_change_rental($1,$2,$3,$4,$5) status',[actor,id,action,requestId,record]);};
    await assert.rejects(change('alice','HANDOVER_CONFIRMED'),/RENTAL_TRANSITION_DENIED/);
    assert.equal((await change('bob','ACCEPTED')).rows[0].status,'ACCEPTED');assert.equal((await change('alice','HANDOVER_CONFIRMED')).rows[0].status,'ACCEPTED');assert.equal((await change('bob','HANDOVER_CONFIRMED')).rows[0].status,'ACTIVE');assert.equal((await change('alice','RETURN_CONFIRMED')).rows[0].status,'ACTIVE');assert.equal((await change('bob','RETURN_CONFIRMED')).rows[0].status,'CLOSED');
    await assert.rejects(db.query('delete from rental_history_events where agreement_id=$1',[id]),/IMMUTABLE_RECORD/);
    const snapshot=(await db.query('select reloo_rental_snapshot($1) snapshot',[id])).rows[0].snapshot;assert.equal(snapshot.agreement.sequence,snapshot.events.length);assert.equal(snapshot.events.length,6);
    const system=(await db.query("insert into integrity_incidents(code,evidence) values('STORAGE_ALERT','{}') returning id")).rows[0].id;await assert.rejects(db.query("select reloo_confirm_integrity_incident('admin',$1,'CONFIRMED',$2)",[system,'Fixture reason sufficiently detailed for review']),/ACTOR_EVIDENCE_REQUIRED/);
    for(let n=0;n<3;n++){const incident=(await db.query("insert into integrity_incidents(alleged_actor_id,code,evidence) values('alice','VERIFIED_FORGERY',$1) returning id",[{fixture:true,number:n}])).rows[0].id;assert.equal((await db.query("select reloo_confirm_integrity_incident('admin',$1,'CONFIRMED',$2) n",[incident,'Confirmed fixture evidence; no actual customer accusation'])).rows[0].n,n+1);}
    assert.equal((await db.query("select activation_status from profiles where id='alice'")).rows[0].activation_status,'RESTRICTED');assert.equal((await db.query("select activation_status from profiles where id='bob'")).rows[0].activation_status,'ACTIVE');assert.equal((await db.query("select activation_status from profiles where id='carol'")).rows[0].activation_status,'ACTIVE');assert.equal((await db.query("select count(*)::integer n from risk_blacklist where kind='IP'")).rows[0].n,0);
  }finally{await db.close();}
});
