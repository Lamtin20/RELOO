import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { effectiveCrmPermissions,crmAllowed,crmViews,crmNext,validateStaffGrant } from "../lib/operations/access.js";
import { createCrmReceipt,validCrmReceipt,CRM_SESSION_SECONDS } from "../lib/operations/crm-session.js";
test("employees cannot turn wildcard or role-management permissions into full access; disabled accounts and unknown roles have none",()=>{
 const employee={role:'staff',enabled:true,permissions:['*','crm.read','kyc.write','roles.write']};
 assert.equal(crmAllowed(employee,'accounting.read'),false);assert.equal(crmAllowed(employee,'roles.write'),false);assert.equal(crmAllowed(employee,'kyc.read'),true);
 assert.deepEqual(crmViews(employee),['kyc']);
 for(const role of ['owner','admin'])assert.equal(crmAllowed({role,enabled:true,permissions:[]},'settings.write'),true);
 assert.deepEqual(effectiveCrmPermissions({...employee,enabled:false}),[]);
 assert.deepEqual(effectiveCrmPermissions({...employee,role:'master'}),[]);
 for(const permissions of [['*'],['roles.write'],['invented.read']])assert.throws(()=>validateStaffGrant({role:'staff',enabled:true,permissions}));
 assert.deepEqual(validateStaffGrant({role:'admin',enabled:true,permissions:[]}),['*']);
 assert.equal(crmNext('//attacker.invalid/crm'),'/crm');assert.equal(crmNext('/crm/login'),'/crm');assert.equal(crmNext('/crm?view=kyc'),'/crm?view=kyc');
});
test("CRM proof requires a real AAL2 session, matching user/session/factor, valid signature and a fixed eight-hour lifetime",()=>{
 const previous=process.env.RELOO_PRIVATE_DATA_KEY;process.env.RELOO_PRIVATE_DATA_KEY='cd'.repeat(32);
 try{
  const now=Date.now(),context={claims:{sub:'user-a',session_id:'session-a',aal:'aal2',exp:Math.floor(now/1000)+86400},profileId:'profile-a',factors:[{id:'factor-a',status:'verified',factor_type:'totp'}]};
  const receipt=createCrmReceipt({subject:'user-a',sessionId:'session-a',profileId:'profile-a',factorId:'factor-a'},now);
  assert.ok(validCrmReceipt(receipt.value,context,now));
  assert.equal(validCrmReceipt(receipt.value,{...context,claims:{...context.claims,aal:'aal1'}},now),null);
  assert.equal(validCrmReceipt(receipt.value,{...context,claims:{...context.claims,sub:'user-b'}},now),null);
  assert.equal(validCrmReceipt(receipt.value,{...context,claims:{...context.claims,session_id:'session-b'}},now),null);
  assert.equal(validCrmReceipt(receipt.value,{...context,profileId:'profile-b'},now),null);
  assert.equal(validCrmReceipt(receipt.value,{...context,factors:[]},now),null);
  assert.equal(validCrmReceipt(receipt.value,{...context,factors:[{id:'factor-a',status:'verified',factor_type:'phone'}]},now),null);
  const [body,signature]=receipt.value.split('.'),changed=JSON.parse(Buffer.from(body,'base64url'));
  changed.expiresAt+=86400;
  assert.equal(validCrmReceipt(Buffer.from(JSON.stringify(changed)).toString('base64url')+'.'+signature,context,now),null);
  assert.equal(validCrmReceipt(receipt.value,context,now+CRM_SESSION_SECONDS*1000),null);
  assert.equal(validCrmReceipt(receipt.value,context,now-120000),null);
 }finally{if(previous===undefined)delete process.env.RELOO_PRIVATE_DATA_KEY;else process.env.RELOO_PRIVATE_DATA_KEY=previous;}
});
test("staff grants enforce administrative roles in PostgreSQL, record changes and revoke existing MFA sessions when access changes",async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create table profiles(id text primary key,auth_user_id uuid default gen_random_uuid(),deleted_at timestamptz);
   insert into profiles(id) values('owner'),('employee'),('candidate');
   create table crm_staff(profile_id text primary key references profiles(id),role text,permissions text[] not null default '{}',enabled boolean default true,created_at timestamptz default now());
   insert into crm_staff(profile_id,role,permissions) values('owner','owner','{*}'),('employee','master','{*,crm.read,kyc.read}');
   create table security_audit(actor_id text,subject_id text,action text,details jsonb);`);
  const migration=await readFile(new URL('../deploy/vietnam/crm-security.sql',import.meta.url),'utf8');await db.exec(migration);
  const employee=(await db.query("select * from crm_staff where profile_id='employee'")).rows[0];assert.equal(employee.role,'staff');assert.equal(employee.permissions.includes('*'),false);
  await assert.rejects(db.query("select reloo_staff_set('employee','candidate','admin','{*}',true,'Không thể tự nâng người khác lên toàn quyền')"),/PERMISSION_REQUIRED/);
  await assert.rejects(db.query("select reloo_staff_set('owner','candidate','staff','{*}',true,'Không thể cấp dấu sao cho tài khoản nhân viên')"),/INVALID_PERMISSIONS/);
  await assert.rejects(db.query("select reloo_staff_set('owner','owner','staff','{crm.read}',true,'Không được tự thay đổi quyền truy cập của chính mình')"),/PERMISSION_REQUIRED/);
  await db.query("select reloo_staff_set('owner','candidate','staff','{kyc.write}',true,'Nhân viên được phân công duyệt hồ sơ căn cước')");
  assert.equal((await db.query("select reloo_staff_permission('candidate','kyc.read') v")).rows[0].v,true);
  assert.equal((await db.query("select reloo_staff_permission('candidate','accounting.write') v")).rows[0].v,false);
  await db.query("insert into crm_mfa_sessions(id,profile_id,auth_session_id,factor_id,expires_at) values(gen_random_uuid(),'candidate',gen_random_uuid(),gen_random_uuid(),now()+interval '8 hours')");
  await db.query("select reloo_staff_set('owner','candidate','staff','{kyc.read}',false,'Ngừng quyền truy cập CRM sau khi bàn giao công việc')");
  assert.ok((await db.query("select revoked_at from crm_mfa_sessions where profile_id='candidate'")).rows[0].revoked_at);
  assert.equal((await db.query("select count(*)::int n from security_audit where action='CRM_PERMISSIONS_CHANGED'")).rows[0].n,2);
  await db.query("select reloo_staff_set('owner','candidate','staff','{crm.read,bots.read,support.read,bots.publish,support.assign,support.contacts}',true,'Explicit synthetic grant of bot publication and conversation contact rights')");
  const rights=(await db.query("select permissions from crm_staff where profile_id='candidate'")).rows[0].permissions;assert.ok(['bots.publish','support.assign','support.contacts'].every(p=>rights.includes(p)));
  await assert.rejects(db.query("select reloo_staff_set('owner','candidate','staff','{support.payment}',true,'An unregistered action must never become a staff permission')"),/INVALID_PERMISSIONS/);
  await db.exec('set role authenticated');await assert.rejects(db.query('select * from crm_mfa_sessions'),/permission denied/);
  await assert.rejects(db.query("select reloo_staff_set('owner','candidate','admin','{*}',true,'Không được gọi bằng khóa người dùng trực tiếp')"),/permission denied/);
  await db.exec('reset role');await db.exec(migration);
 }finally{await db.close();}
});
