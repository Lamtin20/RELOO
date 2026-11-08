import {deletePrivateLocationPhotos} from '../lib/maps/private-photo.js';
import { createClient } from "@supabase/supabase-js";
import {writeOperationsHeartbeat} from '../lib/operations/heartbeat.js';
import { readFile, readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { spawn } from "node:child_process";
import { decryptPrivate, encryptPrivate, privateHash } from "../lib/operations/crypto.js";
import { lookupLinks } from "../lib/security/identifiers.js";
import {queueIdentifier} from '../lib/security/identifiers.js';
import { parseCheckScam, parseChongLuaDao, identifierScreeningStatus } from "../lib/security/source-results.js";
import { analyzeVnpt,vnptConfigured } from '../lib/kyc/vnpt.js';
import { integrationConfig } from '../lib/operations/integrations.js';
import { verifySePayTransaction,normalizeSePayWebhook } from '../lib/finance/sepay.js';
import { sealEntry,verifyHistory,trustedJournalKeys } from '../lib/assurance/journal.js';
import { anchorEvm } from '../lib/assurance/evm.js';
import { randomUUID } from 'node:crypto';
import {parseEmailExposure} from '../lib/security/email-exposure.js';
import {attributeVerifiedCash} from '../lib/finance/attribution.js';
import {sendGmail} from '../lib/email/gmail.js';
import {qrAnalysis} from '../lib/kyc/extracted.js';
import {resolveQrReview} from '../lib/kyc/qr-review.js';
import {matchNearbyRequest,deliverNearbyBatch} from '../lib/nearby-requests/worker.js';
import {checkNewsQuality} from '../lib/content/news-quality-worker.js';
import {deliverNeighborhood,syncNeighborhoodSources,purgeNeighborhoodEvidence} from '../lib/neighborhood/worker.js';
import {processRentalCalendars} from '../lib/rental-care/worker.js';
const db = createClient(process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(20000) }) } });
async function lookup(source, url, value, type = "misc") {
  try {
    const response = await fetch(process.env.LOOKUP_SERVICE_URL + '/lookup', { method:'POST',headers:{'Content-Type':'application/json','X-Lookup-Token':process.env.LOOKUP_SERVICE_TOKEN},body:JSON.stringify({url}),signal:AbortSignal.timeout(40000) });
    if (!response.ok) throw new Error('Lookup transport unavailable');
    const result = await response.json(), text = result.text;
    if (result.status < 200 || result.status >= 300) return { source, status:'UNAVAILABLE',reason:result.status === 403 ? 'Nguồn đang chặn truy cập từ máy chủ RELOO (HTTP 403). Cần đối chiếu thủ công hoặc quyền truy cập từ nhà cung cấp.' : `Nguồn trả HTTP ${result.status}.`,code:result.status === 403 ? 'SOURCE_ACCESS_BLOCKED' : 'SOURCE_HTTP_ERROR',httpStatus:result.status,sourceUrl:url,transport:'public_website',checkedAt:new Date().toISOString() };
    if (/verify you are human|just a moment|captcha required|vui lòng[^.\n]{0,100}(?:xác minh|captcha)/i.test(text)) return { source, status: "UNAVAILABLE", reason: "Nguồn yêu cầu xác minh truy cập.", sourceUrl: url };
    if (source === 'chongluadao') {
      const values = result.values;
      if (!values.includes(value)) return { source, status: 'UNKNOWN', reason: 'Chưa xác nhận được kết quả đang hiển thị đúng thông tin đầu vào.', sourceUrl: url };
    }
    return source === "checkscam" ? parseCheckScam(text, value, url) : { ...parseChongLuaDao(text, url, type), matchedInput: true };
  } catch { return { source, status: "UNAVAILABLE", reason: "Nguồn chưa phản hồi hoặc cấu trúc đã thay đổi.", sourceUrl: url }; }
}
async function processJob(job) {
  if(job.kind?.startsWith('SHORT_'))return {status:'PAUSED_BY_POLICY'};
  if(job.kind==='NEWS_QUALITY_AUDIT')return checkNewsQuality(db,job.payload.articleId);
  if(job.kind==='NEARBY_REQUEST_MATCH'){try{return await matchNearbyRequest(db,job.payload.requestId);}catch(e){await db.from('nearby_requests').update({match_status:'ERROR'}).eq('id',job.payload.requestId).neq('match_status','MATCHED');throw e;}}
  if(job.kind==='NOTIFY_BROADCAST'){
    const {source,id,cursor=''}=job.payload;let rule,title,body,link,recipients;
    if(source==='ASSET'){const r=await db.from('assets').select('id,owner_id,title,status,is_locked').eq('id',id).single();if(r.error)throw Error('PUBLICATION_UNAVAILABLE');if(r.data.status!=='available'||r.data.is_locked)return {status:'NO_LONGER_PUBLIC'};rule='follow';title='Món đồ mới từ người bạn theo dõi';body=r.data.title;link='/product/'+id;recipients=await db.from('marketplace_follows').select('profile_id').eq('kind','OWNER').eq('target_id',r.data.owner_id).gt('profile_id',cursor).order('profile_id').limit(100);}
    else if(['NEWS','PROMOTION'].includes(source)){const table=source==='NEWS'?'news_articles':'promotion_campaigns',r=await db.from(table).select('*').eq('id',id).single();if(r.error)throw Error('PUBLICATION_UNAVAILABLE');if(source==='NEWS'){if(!['PUBLISHED','SCHEDULED'].includes(r.data.status)||Date.parse(r.data.publish_at)>Date.now())return {status:'NO_LONGER_PUBLIC'};rule='news';title=r.data.title;body=r.data.excerpt;link='/news/'+r.data.slug;}else{if(r.data.status!=='ACTIVE'||Date.parse(r.data.starts_at)>Date.now()||Date.parse(r.data.ends_at)<=Date.now())return {status:'NO_LONGER_PUBLIC'};rule='promotion';title=r.data.name;body=r.data.description;link='/dashboard/promotions';}recipients=await db.from('profiles').select('id').is('deleted_at',null).eq('profile_data->notificationPreferences->>marketingEmail','true').gt('id',cursor).order('id').limit(100);}
    else throw Error('PUBLICATION_SOURCE_INVALID');
    if(recipients.error)throw Error('NOTIFICATION_RECIPIENTS_UNAVAILABLE');for(const row of recipients.data){const emitted=await db.rpc('reloo_emit_notification',{p_rule:rule,p_event:source+':'+id,p_recipient:row.id||row.profile_id,p_title:title,p_body:body||'Xem chi tiết trên RELOO.',p_link:link});if(emitted.error)throw Error('NOTIFICATION_WRITE_FAILED');}
    if(recipients.data.length===100){const last=recipients.data.at(-1),next=await db.from('automation_jobs').insert({kind:'NOTIFY_BROADCAST',payload:{source,id,cursor:last.id||last.profile_id}});if(next.error)throw Error('NOTIFICATION_CONTINUATION_FAILED');}return {status:'NOTIFIED',count:recipients.data.length};
  }
  if(job.kind==='KYC_QR_ANALYZE'){
    const row=await db.from('kyc_submissions').select('*').eq('id',job.payload.submissionId).single();if(row.error)throw Error('KYC_UNAVAILABLE');const item=row.data;if(item.status!=='REVIEW'||item.superseded_at||item.expires_at&&Date.parse(item.expires_at)<=Date.now())return {status:'SKIPPED_ALREADY_REVIEWED'};
    if(item.document_paths?.qrPolicy==='V1')return resolveQrReview(db,item);
    if(item.document_paths?.ocrQrPolicy==='V1')return {status:'LEGACY_REQUIRES_ADMIN_REVIEW'};
    const form=new FormData();for(const kind of ['front','back','selfie']){if(item.document_paths[kind]!==`${item.id}-${kind}.enc`)throw Error('INVALID_DOCUMENT_PATH');const bytes=Buffer.from(decryptPrivate(await readFile(join(process.env.RELOO_EVIDENCE_DIR,item.document_paths[kind]),'utf8')),'base64');form.set(kind,new Blob([bytes],{type:'image/jpeg'}),kind+'.jpg');}
    let result={face:{status:'UNAVAILABLE'}};try{const r=await fetch(process.env.KYC_SERVICE_URL+'/analyze',{method:'POST',headers:{'X-KYC-Token':process.env.KYC_SERVICE_TOKEN},body:form,signal:AbortSignal.timeout(180000)});if(r.ok)result=await r.json();}catch{}
    let activeLive={status:'NOT_ESTABLISHED'};
    if(item.document_paths.video===item.id+'-video.enc'){
      const photo=await db.from('kyc_photo_sessions').select('challenge_poses,profile_id,consumed_at').eq('id',item.photo_session_id).single();
      if(!photo.error&&photo.data.profile_id===item.profile_id&&photo.data.consumed_at&&photo.data.challenge_poses){const live=new FormData();live.set('video',new Blob([Buffer.from(decryptPrivate(await readFile(join(process.env.RELOO_EVIDENCE_DIR,item.document_paths.video),'utf8')),'base64')],{type:item.document_paths.videoType}),'live.webm');live.set('selfie',form.get('selfie'));live.set('poses',JSON.stringify(photo.data.challenge_poses));try{const r=await fetch(process.env.KYC_SERVICE_URL+'/live-video',{method:'POST',headers:{'X-KYC-Token':process.env.KYC_SERVICE_TOKEN},body:live,signal:AbortSignal.timeout(180000)});if(r.ok)activeLive=await r.json();else activeLive={status:'UNAVAILABLE'};}catch{activeLive={status:'UNAVAILABLE'};}}
    }
    const analysis=qrAnalysis(result,decryptPrivate(item.national_id_encrypted));analysis.face.activeLive=activeLive;analysis.face.liveness=activeLive.status==='PASSED'?'PASSED':activeLive.status;analysis.localMatchPassed=activeLive.status==='PASSED'&&analysis.face.verified===true&&analysis.nationalIdMatches&&!!analysis.expiryCandidate;
    const saved=await db.from('kyc_submissions').update({checks:{...item.checks,...analysis},face_result:analysis.face}).eq('id',item.id).eq('status','REVIEW').is('superseded_at',null);if(saved.error)throw Error('KYC_WRITE_FAILED');return {status:'REVIEW',ocrStatus:analysis.ocrStatus,faceStatus:analysis.face.status,liveness:activeLive.status};
  }
  if(job.kind==='EMAIL_NOTIFY'){
    const id=job.payload.notificationId,row=await db.from('notifications').select('*').eq('id',id).maybeSingle();if(row.error)throw Error('EMAIL_NOTIFICATION_UNAVAILABLE');if(!row.data)return {status:'REMOVED'};
    const delivery=await db.from('email_delivery_log').select('status').eq('notification_id',id).single();if(delivery.error)throw Error('EMAIL_DELIVERY_UNAVAILABLE');if(delivery.data.status==='SENT')return {status:'ALREADY_SENT'};
    const recipient=await db.from('profiles').select('email,name,profile_data').eq('id',row.data.user_id).single();if(recipient.error)throw Error('EMAIL_RECIPIENT_UNAVAILABLE');if(!recipient.data.email)return {status:'NO_EMAIL'};
    const types={account:'registration',promo:'promotion',event:'promotion',news:'news',order:'order',message:'message',interest:'interest',follow:'follow'},ruleKey=row.data.notification_data?.rule||types[row.data.notification_type]||'system',rule=await db.from('notification_rules').select('enabled,email_enabled,marketing').eq('key',ruleKey).maybeSingle();if(rule.error)throw Error('NOTIFICATION_RULE_UNAVAILABLE');
    if(rule.data&&(!rule.data.enabled||!rule.data.email_enabled||(rule.data.marketing&&recipient.data.profile_data?.notificationPreferences?.marketingEmail!==true))){await db.from('email_delivery_log').update({status:'SKIPPED'}).eq('notification_id',id);return {status:'SKIPPED_BY_PREFERENCE'};}
    const sent=await sendGmail(await integrationConfig(db,'GMAIL'),recipient.data.email,{kind:types[row.data.notification_type]||'system',title:row.data.title,body:row.data.body,name:recipient.data.name,link:row.data.link});
    const saved=await db.from('email_delivery_log').update({status:'SENT',provider_id:sent.providerId,updated_at:new Date().toISOString()}).eq('notification_id',id);if(saved.error)throw Error('EMAIL_DELIVERY_SAVE_FAILED');return {status:'SENT'};
  }
  if(job.kind==='CHECK_CURRENT_PHONE'){const row=await db.from('profiles').select('phone').eq('id',job.payload.profileId).single();if(row.error||!row.data.phone)throw new Error('PHONE_PROFILE_REQUIRED');await queueIdentifier(db,job.payload.profileId,'PHONE',row.data.phone);return {status:'PHONE_SCREENING_QUEUED'};}
  if(job.kind==='SYNC_SEPAY'){
    const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/sync-sepay.mjs'],{stdio:'ignore',timeout:240000});child.on('error',reject);child.on('exit',resolve);});
    if(status!==0)throw new Error('SEPAY_SYNC_FAILED');return {status:'SYNCED'};
  }
  if(job.kind==='ANCHOR_RENTAL'){
    const row=await db.from('rental_history_events').select('*').eq('id',job.payload.historyId).single(),anchor=await db.from('evm_anchors').select('*').eq('history_id',job.payload.historyId).single();if(row.error||anchor.error)throw new Error('HISTORY_UNAVAILABLE');if(anchor.data.status==='CONFIRMED')return {status:'ALREADY_CONFIRMED'};
    const snapshot=await db.rpc('reloo_rental_snapshot',{p_id:row.data.agreement_id});if(snapshot.error||!snapshot.data)throw new Error('HISTORY_UNAVAILABLE');
    const entries=snapshot.data.events.map(item=>({envelope:item.envelope,hash:item.digest,signature:item.signature,keyId:item.signing_key_id,privatePayload:JSON.parse(decryptPrivate(item.payload_encrypted))}));
    if(!verifyHistory(entries,trustedJournalKeys(),{head:snapshot.data.agreement.head_hash,count:snapshot.data.agreement.sequence}).ok)throw new Error('HISTORY_INTEGRITY_FAILED');
    try{const receipt=await anchorEvm(entries[row.data.sequence-1],await integrationConfig(db,'EVM'),{transactionHash:anchor.data.transaction_hash,onSubmitted:async hash=>{const saved=await db.from('evm_anchors').update({status:'SUBMITTED',transaction_hash:hash,updated_at:new Date().toISOString()}).eq('history_id',row.data.id);if(saved.error)throw new Error('EVM_SUBMISSION_SAVE_FAILED');}});const saved=await db.from('evm_anchors').update({status:'CONFIRMED',receipt,updated_at:new Date().toISOString()}).eq('history_id',row.data.id);if(saved.error)throw new Error('EVM_RECEIPT_SAVE_FAILED');await db.rpc('reloo_queue_next_anchors');return {status:'CONFIRMED'};}
    catch(cause){await db.from('evm_anchors').update({status:'REVIEW',updated_at:new Date().toISOString()}).eq('history_id',row.data.id);throw cause;}
  }
  if(job.kind==='CHECK_EMAIL_EXPOSURE'){
    const check=await db.from('email_exposure_checks').select('*').eq('profile_id',job.payload.profileId).eq('email_hash',job.payload.emailHash).single();if(check.error)throw new Error('EXPOSURE_CHECK_UNAVAILABLE');
    const email=decryptPrivate(check.data.email_encrypted),url=new URL('https://chongluadao.vn/analyze/');url.searchParams.set('q',email);url.searchParams.set('type','email');
    let result={status:'UNAVAILABLE',breaches:[],count:null,checkedAt:new Date().toISOString()};
    try{const response=await fetch(process.env.LOOKUP_SERVICE_URL+'/lookup',{method:'POST',headers:{'Content-Type':'application/json','X-Lookup-Token':process.env.LOOKUP_SERVICE_TOKEN},body:JSON.stringify({url:url.href}),signal:AbortSignal.timeout(60000)});if(response.ok)result=parseEmailExposure(await response.json(),email);}catch{}
    const write=await db.from('email_exposure_checks').update({status:result.status,result_encrypted:encryptPrivate(JSON.stringify(result)),checked_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()}).eq('profile_id',job.payload.profileId).eq('email_hash',job.payload.emailHash);if(write.error)throw new Error('EXPOSURE_RESULT_UNAVAILABLE');
    return {status:result.status};
  }
  if(job.kind==='VERIFY_SEPAY'){
    const {data:inbox,error}=await db.from('finance_webhook_inbox').select('*').eq('id',job.payload.inboxId).single();if(error)throw new Error('SEPAY_INBOX_UNAVAILABLE');
    if(inbox.status==='VERIFIED')return {status:'ALREADY_VERIFIED'};
    try{
      const input=JSON.parse(decryptPrivate(inbox.payload_encrypted)),hook=normalizeSePayWebhook(input),config=await integrationConfig(db,'SEPAY'),verified=await verifySePayTransaction(hook,config),sourceId=randomUUID();
      const sealed=sealEntry({streamId:sourceId,sequence:1,event:'BANK_TRANSACTION_VERIFIED',previousHash:'0'.repeat(64),payload:{verified:{...verified,raw:undefined},providerData:verified.raw},recordedAt:new Date().toISOString()},process.env.RELOO_JOURNAL_PRIVATE_KEY);
      const posted=await db.rpc('reloo_post_sepay',{p_inbox:inbox.id,p_source:sourceId,p_verified:{...verified,raw:undefined,referenceHash:privateHash('SEPAY_REFERENCE',verified.reference)},p_evidence:encryptPrivate(JSON.stringify(sealed.privatePayload)),p_envelope:sealed.envelope,p_hash:sealed.hash,p_signature:sealed.signature,p_key_id:sealed.keyId});
      if(posted.error)throw new Error('SEPAY_POSTING_FAILED');
      const persisted=await db.from('finance_sources').select('*').eq('provider_id',verified.providerId).single();
      if(persisted.error)throw new Error('FINANCIAL_SOURCE_UNAVAILABLE');
      await attributeVerifiedCash(db,persisted.data);
      return {status:'VERIFIED',journalId:posted.data};
    }catch(cause){await db.from('finance_webhook_inbox').update({status:'REVIEW',result_code:/^[A-Z_]+$/.test(cause.message)?cause.message:'SEPAY_VERIFICATION_FAILED'}).eq('id',inbox.id);throw cause;}
  }
  if (["SYNC_AFFILIATE_CATALOG", "SYNC_MARKET_PRICES"].includes(job.kind)) {
    const script = job.kind === "SYNC_AFFILIATE_CATALOG" ? "scripts/sync-affiliate-catalog.mjs" : "scripts/collect-prices.mjs";
    if (job.kind === "SYNC_AFFILIATE_CATALOG" && !process.env.ACCESSTRADE_ACCESS_KEY) throw new Error("PROVIDER_NOT_CONFIGURED");
    const status = await new Promise((resolve, reject) => { const child = spawn(process.execPath, [script], { stdio: "ignore", timeout: 240000 }); child.on("error", reject); child.on("exit", resolve); });
    if (status !== 0) throw new Error("SYNC_FAILED");
    return { status: "DONE" };
  }
  if (job.kind === "SCREEN_IDENTIFIER") {
    const { data: item, error } = await db.from("risk_identifiers").select("*").eq("id", job.payload.identifierId).single(); if (error) throw new Error("IDENTIFIER_UNAVAILABLE");
    const value = decryptPrivate(item.value_encrypted), links = lookupLinks(item.kind, value);
    const type = ['PHONE','ZALO'].includes(item.kind) ? 'phone' : item.kind.toLowerCase();
    const results = [await lookup("checkscam", links.checkscam, value), await lookup("chongluadao", links.chongluadao, value, type)];
    const status = identifierScreeningStatus(results, item.kind);
    const recorded = await db.rpc("reloo_screen_identifier", { p_id: item.id, p_status: status, p_results: results, p_expires: new Date(Date.now() + 86400000).toISOString() }); if (recorded.error) throw new Error("SCREENING_WRITE_FAILED");
    if (item.kind === 'PHONE' && status === 'NO_MATCH') {
      const confirmation = await db.rpc('reloo_confirm_phone_lookup', { p_id: item.id, p_phone: value, p_results: results });
      if (confirmation.error) throw new Error('PHONE_CONFIRMATION_FAILED');
    }
    if (status === 'MATCH') {
      const devices = await db.from('account_access_devices').select('device_hash,ip_hash,expires_at').eq('profile_id', item.profile_id).gt('expires_at', new Date().toISOString());
      for (const device of devices.data || []) for (const [kind, hash] of [['DEVICE', device.device_hash], ['IP', device.ip_hash]]) if (hash) {
        const prior = await db.from('risk_blacklist').select('id').eq('profile_id', item.profile_id).eq('kind', kind).eq('value_hash', hash).neq('status','CLEARED').limit(1);
        if (!prior.data?.length) await db.from('risk_blacklist').insert({ profile_id: item.profile_id, kind, value_hash: hash, reason: 'ACCOUNT_LINKED_ACCESS_SIGNAL_REQUIRES_REVIEW', evidence: [{ identifierId: item.id, scope: 'This account only; not proof of a shared identity' }], expires_at: new Date(Date.now() + 23 * 3600000).toISOString() });
      }
    }
    return { status, sources: results.map(({ source, status }) => ({ source, status })) };
  }
  if (job.kind === "CHECK_NETWORK") {
    const ip = decryptPrivate(job.payload.ipEncrypted), url = new URL("https://chongluadao.vn/analyze/"); url.searchParams.set("q", ip); url.searchParams.set("type", "ip");
    const result = await lookup("chongluadao", url.href, ip, "ip");
    const write = await db.from("network_checks").upsert({ ip_hash: job.payload.ipHash, result: result.network || "UNAVAILABLE", source: "chongluadao_public_website", evidence: { note: result.reason || result.network }, expires_at: new Date(Date.now() + 3600000).toISOString() }); if (write.error) throw new Error("NETWORK_WRITE_FAILED");
    return { status: result.network || "UNAVAILABLE" };
  }
  if (job.kind === "PUBLISH_CONTENT") {
    const result = await db.from("crm_records").update({ status: "PUBLISHED", updated_at: new Date().toISOString() }).eq("id", job.payload.recordId).eq("version", job.payload.version).eq("status", "SCHEDULED").select("id"); if (result.error) throw new Error("PUBLISH_FAILED");
    return { published: result.data.length === 1 };
  }
  if (job.kind === "KYC_PROCESS") {
    const { data: item, error } = await db.from("kyc_submissions").select("*").eq("id", job.payload.submissionId).single(); if (error) throw new Error("KYC_UNAVAILABLE");
    if (!['QUEUED', 'PROCESSING'].includes(item.status) || Date.parse(item.expires_at) <= Date.now()) return { status: 'SKIPPED_ALREADY_REVIEWED' };
    if (process.env.RELOO_KYC_MODE !== 'VNPT') {
      const manual = await db.from('kyc_submissions').update({status:'REVIEW',provider:'MANUAL',checks:{eligible:false,manualReview:true},reason:'Hồ sơ đang chờ admin kiểm duyệt, tối đa 3 ngày.'}).eq('id',item.id).in('status',['QUEUED','PROCESSING']);
      if(manual.error)throw new Error('KYC_WRITE_FAILED');
      return {status:'REVIEW',provider:'MANUAL'};
    }
    await db.from('kyc_submissions').update({ status: 'PROCESSING' }).eq('id', item.id).in('status', ['QUEUED', 'PROCESSING']);
    const form = new FormData(), images={};
    for (const kind of ["front", "back", "selfie"]) {
      if (item.document_paths[kind] !== `${item.id}-${kind}.enc`) throw new Error("INVALID_DOCUMENT_PATH");
      const image = Buffer.from(decryptPrivate(await readFile(join(process.env.RELOO_EVIDENCE_DIR, item.document_paths[kind]), "utf8")), "base64");
      images[kind]=image;
      form.set(kind, new Blob([image], { type: "image/jpeg" }), `${kind}.jpg`);
    }
    let result = { face: { status: "UNAVAILABLE" }, ocr: null };
    const claimedId = decryptPrivate(item.national_id_encrypted);
    let activeLive={status:'NOT_ESTABLISHED'};
    if(item.document_paths.video===`${item.id}-video.enc`&&item.challenge_id){
      const challenge=await db.from('kyc_challenges').select('poses,consumed_at,profile_id').eq('id',item.challenge_id).single();
      if(!challenge.error&&challenge.data.consumed_at&&challenge.data.profile_id===item.profile_id){
        const liveForm=new FormData();liveForm.set('video',new Blob([Buffer.from(decryptPrivate(await readFile(join(process.env.RELOO_EVIDENCE_DIR,item.document_paths.video),'utf8')),'base64')],{type:item.document_paths.videoType||'video/webm'}),'live.webm');liveForm.set('selfie',new Blob([images.selfie],{type:'image/jpeg'}),'selfie.jpg');liveForm.set('poses',JSON.stringify(challenge.data.poses));
        try{const response=await fetch(process.env.KYC_SERVICE_URL+'/live-video',{method:'POST',headers:{'X-KYC-Token':process.env.KYC_SERVICE_TOKEN},body:liveForm,signal:AbortSignal.timeout(180000)});if(response.ok)activeLive=await response.json();}catch{activeLive={status:'UNAVAILABLE',code:'LIVE_ENGINE_NOT_READY'};}
      }
    }
    const config=await integrationConfig(db,'VNPT');
    if(vnptConfigured(config)&&item.document_paths.providerConsent==='VNPT_WEB_V1'){
      try{
        const authoritative=await analyzeVnpt({...images,claimedId,activeLive},config);
        await db.from('integration_settings').update({health:{status:'OK',checkedAt:new Date().toISOString()}}).eq('provider','VNPT');
        const write=await db.from('kyc_submissions').update({status:'REVIEW',provider:'VNPT',extracted_encrypted:encryptPrivate(JSON.stringify({fields:authoritative.fields,providerResults:authoritative.providerResults})),checks:{...authoritative.checks,eligible:authoritative.eligible},face_result:authoritative.face,national_id_encrypted:encryptPrivate(authoritative.fields.nationalId||claimedId),national_id_hash:privateHash('NATIONAL_ID',authoritative.fields.nationalId||claimedId),reason:authoritative.eligible?'Kiểm tra đã đạt. Hãy xác nhận thông tin đọc từ căn cước.':!authoritative.checks.idMatches?'Số căn cước chưa đọc đúng hoặc chưa khớp. Hãy chụp lại giấy tờ.':!authoritative.checks.videoPassed?'Cần quay lại kiểm tra người thật.':!authoritative.face.verified?'Chân dung chưa đạt tỷ lệ khớp trên 80%. Hãy chụp rõ mặt.':'Cần kiểm tra thêm độ rõ và tính hợp lệ của giấy tờ.'}).eq('id',item.id).eq('status','PROCESSING');
        if(write.error)throw new Error('KYC_WRITE_FAILED');
        return {status:'REVIEW',provider:'VNPT',eligible:authoritative.eligible};
      }catch(cause){if(cause.message==='KYC_WRITE_FAILED')throw cause;await db.from('integration_settings').update({health:{status:cause.code||'VNPT_UNAVAILABLE',checkedAt:new Date().toISOString(),providerCode:cause.providerCode,stage:cause.stage}}).eq('provider','VNPT');result.face={...result.face,providerStatus:cause.code||'VNPT_UNAVAILABLE',providerCode:cause.providerCode,providerStage:cause.stage,activeLive};}
    }
    const providerFailure=result.face;
    try { const response = await fetch(process.env.KYC_SERVICE_URL + "/analyze", { method: "POST", headers: { "X-KYC-Token": process.env.KYC_SERVICE_TOKEN }, body: form, signal: AbortSignal.timeout(180000) }); if (response.ok) result = await response.json(); } catch {}
    result.face={...result.face,providerStatus:providerFailure.providerStatus,providerCode:providerFailure.providerCode,providerStage:providerFailure.providerStage};
    const idMatches = claimedId ? result.ocr?.nationalIds?.includes(claimedId) || false : result.ocr?.nationalIds?.length===1;
    const write = await db.from("kyc_submissions").update({ status: "REVIEW", provider:'LOCAL',extracted_encrypted: result.ocr ? encryptPrivate(JSON.stringify({fields:{...result.ocr.fields,nationalId:result.ocr.nationalIds?.length===1?result.ocr.nationalIds[0]:null},localOcr:result.ocr})) : null, checks:{eligible:false},face_result: { ...result.face, activeLive,nationalIdMatches: idMatches, requiresHumanReview: true }, reason: ['VNPT_AUTH_REQUIRED','VNPT_UNAVAILABLE','VNPT_NOT_CONFIGURED'].includes(result.face.providerStatus)?'Dịch vụ xác minh căn cước đang chưa sẵn sàng. Hồ sơ đã được lưu; bạn chưa cần gửi lại giấy tờ.':idMatches ? "Chờ đối chiếu giấy tờ và người thật." : "Cần kiểm tra lại số căn cước/OCR và giấy tờ." }).eq("id", item.id); if (write.error) throw new Error("KYC_WRITE_FAILED");
    return { status: "REVIEW", faceEngine: result.face.status };
  }
  throw new Error("JOB_KIND_UNSUPPORTED");
}
async function cleanup() {
  if(process.env.RELOO_PRODUCT_ANALYTICS_ENABLED==='true')await db.rpc('reloo_analytics_retention');
  await db.rpc('reloo_identity_notices');
  const financial=await db.from('finance_sources').select('*').order('verified_at',{ascending:false}).limit(500);
  for(const source of financial.data||[])await attributeVerifiedCash(db,source);
  await db.rpc('reloo_mark_overdue_kyc');
  await db.rpc('reloo_purge_support');
  await db.rpc('reloo_ai_purge');
  await db.rpc('reloo_management_sso_purge');
  if(['broker','federated-client'].includes(process.env.RELOO_IDENTITY_MODE)){
    const purge=await db.rpc('reloo_federation_purge');if(purge.error)console.warn('IDENTITY_PURGE_UNAVAILABLE');
  }
  if(process.env.RELOO_ENVIRONMENT==='staging'&&process.env.RELOO_SERVICE_SANDBOX==='true')await db.rpc('reloo_service_purge');
  await db.from('kyc_photo_sessions').delete().is('consumed_at',null).lt('expires_at',new Date().toISOString());
  const evmConfig=await integrationConfig(db,'EVM');
  if(evmConfig.EVM_RPC_URL&&evmConfig.EVM_PRIVATE_KEY&&evmConfig.chainId&&evmConfig.contractAddress&&evmConfig.maxFeeWei)await db.rpc('reloo_queue_next_anchors');
  // Identity evidence is retained while the account exists. Only a successful,
  // transaction-gated account deletion queues removal of its private evidence.
  const deletions = await db.from("account_deletion_requests").select("id,profile_id,auth_user_id,evidence_paths").eq("status","PENDING").limit(20);
  if (deletions.error) throw new Error("DELETION_QUEUE_UNAVAILABLE");
  for (const deletion of deletions.data || []) {
    for (const filename of deletion.evidence_paths) {
      if (!/^[a-f0-9-]{36}-(front|back|selfie|video|vnpt-check)\.enc$/i.test(filename)) throw new Error("DELETION_PATH_INVALID");
      await unlink(join(process.env.RELOO_EVIDENCE_DIR,filename)).catch(e=>{if(e.code!=="ENOENT")throw e;});
    }
    await deletePrivateLocationPhotos(deletion.profile_id);
    if(deletion.auth_user_id){const authDelete=await db.auth.admin.deleteUser(deletion.auth_user_id);if(authDelete.error&&authDelete.error.status!==404)throw new Error("AUTH_DELETION_RETRY_REQUIRED");}
    const result=await db.rpc("reloo_finish_account_deletion",{p_id:deletion.id});
    if(result.error)throw new Error("DELETION_FINALIZE_FAILED");
  }
  await db.from("journey_events").delete().eq('schema_version',1).lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
  await db.from('news_engagement_events').delete().lt('created_at',new Date(Date.now()-90*86400000).toISOString());
  await db.from("api_traces").delete().lt("created_at", new Date(Date.now() - 14 * 86400000).toISOString());
  await db.from('account_access_devices').delete().lt('expires_at', new Date().toISOString());
  await db.from("automation_jobs").update({ status: "QUEUED", locked_at: null }).eq("status", "RUNNING").lt("locked_at", new Date(Date.now() - 600000).toISOString()).lt("attempts", 3);
  const due = await db.from('risk_identifiers').select('id,profiles!risk_identifiers_profile_id_fkey!inner(id,activation_status)').eq('profiles.activation_status','ACTIVE').eq('kind','PHONE').neq('status','MATCH').lt('expires_at',new Date(Date.now()+75*60000).toISOString()).order('expires_at').limit(50);
  for (const item of due.data || []) if (item.profiles?.activation_status === 'ACTIVE') await db.rpc('reloo_request_identifier_check', { p_profile: item.profiles.id, p_identifier: item.id });
}
let lastCleanup = 0;
let lastOperationsPulse=0;
let lastSePaySync=0;

let lastNearbyCheck=0;
let lastNeighborhoodCheck=0;
let lastNeighborhoodSync=0;
let lastCalendarSync=0;
let lastPersonalizationRetention=0;
let lastCalendarRetention=0;
for (;;) {
  try {
    if(Date.now()-lastOperationsPulse>30000){lastOperationsPulse=Date.now();await writeOperationsHeartbeat(db,{modules:[process.env.RELOO_RENTAL_CARE_ENABLED==='true'?'calendar':null,process.env.RELOO_NEIGHBORHOOD_ENABLED==='true'?'neighborhood':null,process.env.RELOO_PERSONALIZATION_ENABLED==='true'?'personalization':null]});}
    if(process.env.RELOO_RENTAL_CARE_ENABLED==='true'&&Date.now()-lastCalendarSync>30000){lastCalendarSync=Date.now();try{await processRentalCalendars(db);}catch{console.error(JSON.stringify({module:'rental-care',code:'CALENDAR_WORKER_UNAVAILABLE'}));}}
    if(process.env.RELOO_PERSONALIZATION_ENABLED==='true'&&Date.now()-lastPersonalizationRetention>3600000){lastPersonalizationRetention=Date.now();const retention=await db.rpc('reloo_pp_retention');if(retention.error)console.error(JSON.stringify({module:'personalization',code:'RETENTION_UNAVAILABLE'}));}
    if(process.env.RELOO_RENTAL_CARE_ENABLED==='true'&&Date.now()-lastCalendarRetention>3600000){lastCalendarRetention=Date.now();const retention=await db.rpc('reloo_rc_retention');if(retention.error)console.error(JSON.stringify({module:'rental-care',code:'RETENTION_UNAVAILABLE'}));}
    if(process.env.RELOO_NEIGHBORHOOD_ENABLED==='true'&&Date.now()-lastNeighborhoodCheck>30000){lastNeighborhoodCheck=Date.now();try{await deliverNeighborhood(db);}catch{console.error(JSON.stringify({module:'neighborhood',code:'OUTBOX_UNAVAILABLE'}));}}
    if(process.env.RELOO_NEIGHBORHOOD_ENABLED==='true'&&Date.now()-lastNeighborhoodSync>60000){lastNeighborhoodSync=Date.now();try{await syncNeighborhoodSources(db);await purgeNeighborhoodEvidence(db);}catch{console.error(JSON.stringify({module:'neighborhood',code:'SYNC_OR_RETENTION_UNAVAILABLE'}));}}
    if(Date.now()-lastNearbyCheck>30000){lastNearbyCheck=Date.now();try{await deliverNearbyBatch(db);}catch{/* Keep unrelated operations running; queued deliveries remain available. */}}
    if(Date.now()-lastSePaySync>300000){lastSePaySync=Date.now();const config=await integrationConfig(db,'SEPAY');if(config.SEPAY_API_KEY&&config.bankAccountId){const running=await db.from('automation_jobs').select('id').eq('kind','SYNC_SEPAY').in('status',['QUEUED','RUNNING']).limit(1);if(!running.data?.length)await db.from('automation_jobs').insert({kind:'SYNC_SEPAY'});}}
    if (Date.now() - lastCleanup > 3600000) { await cleanup(); lastCleanup = Date.now(); }
    const { data, error } = await db.rpc("reloo_claim_job");
    if (error) throw new Error("JOB_STORAGE_UNAVAILABLE");
    const job = data?.[0];
    if (!job) { await delay(5000); continue; }
    try { const result = await processJob(job); await db.from("automation_jobs").update({ status: "DONE", result, ...(job.kind === 'CHECK_NETWORK' ? { payload: { ipHash: job.payload.ipHash } } : {}) }).eq("id", job.id); }
    catch (error) { if(job.kind==='KYC_PROCESS')await db.from('kyc_submissions').update({status:'REVIEW',reason:'Chưa hoàn tất xử lý hồ sơ. Bạn có thể chụp lại hoặc gửi yêu cầu hỗ trợ.'}).eq('id',job.payload.submissionId).in('status',['QUEUED','PROCESSING']);await db.from("automation_jobs").update({ status: "FAILED", result: { code: /^[A-Z_]+$/.test(error.message) ? error.message : "WORKER_FAILED" } }).eq("id", job.id); }
  } catch { await delay(10000); }
}
