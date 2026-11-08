import {createClient} from '@supabase/supabase-js';
import {createHash,randomUUID} from 'node:crypto';
import {integrationConfig} from '../lib/operations/integrations.js';
import {sepayV2} from '../lib/finance/sepay-v2.js';
import {normalizeSePayWebhook,verifySePayTransaction} from '../lib/finance/sepay.js';
import {encryptPrivate,privateHash} from '../lib/operations/crypto.js';
import {sealEntry} from '../lib/assurance/journal.js';
import {attributeVerifiedCash} from '../lib/finance/attribution.js';
const db=createClient(process.env.SUPABASE_INTERNAL_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),config=await integrationConfig(db,'SEPAY');
if(!config.bankAccountId||!config.companyAccountNumber)throw new Error('SEPAY_BANK_NOT_CONFIGURED');
const state=await db.from('sepay_sync_state').select('cursor_id').eq('bank_account_id',config.bankAccountId).maybeSingle();
let cursor=state.data?.cursor_id||'',processed=0;
try{
  const params=new URLSearchParams({bank_account_id:config.bankAccountId,per_page:'50',transaction_date_sort:'asc'});if(cursor)params.set('since_id',cursor);
  const page=await sepayV2('/transactions?'+params,config);
  for(const row of page.data){
    if(row.bank_account_id!==config.bankAccountId)throw new Error('SEPAY_BANK_MISMATCH');
    const input={id:row.id,gateway:row.bank_brand_name,transactionDate:row.transaction_date,accountNumber:row.account_number,subAccount:row.va||'',content:row.transaction_content,transferType:row.transfer_type,transferAmount:row.transfer_type==='in'?row.amount_in:row.amount_out,referenceCode:row.reference_number};
    const hook=normalizeSePayWebhook(input),verified=await verifySePayTransaction(hook,config);
    const body=JSON.stringify(input),inbox=await db.rpc('reloo_receive_sepay',{p_event:hook.id,p_hash:createHash('sha256').update(body).digest('hex'),p_payload:encryptPrivate(body)});
    if(inbox.error)throw new Error('SEPAY_INBOX_CONFLICT');
    const prior=await db.from('finance_sources').select('*').eq('provider_id',verified.providerId).maybeSingle();
    if(!prior.data){const sourceId=randomUUID(),sealed=sealEntry({streamId:sourceId,sequence:1,event:'BANK_TRANSACTION_VERIFIED',previousHash:'0'.repeat(64),payload:{verified:{...verified,raw:undefined},providerData:verified.raw},recordedAt:new Date().toISOString()},process.env.RELOO_JOURNAL_PRIVATE_KEY);const posted=await db.rpc('reloo_post_sepay',{p_inbox:inbox.data,p_source:sourceId,p_verified:{...verified,raw:undefined,referenceHash:privateHash('SEPAY_REFERENCE',verified.reference)},p_evidence:encryptPrivate(JSON.stringify(sealed.privatePayload)),p_envelope:sealed.envelope,p_hash:sealed.hash,p_signature:sealed.signature,p_key_id:sealed.keyId});if(posted.error)throw new Error('SEPAY_POSTING_FAILED');}
    const source=await db.from('finance_sources').select('*').eq('provider_id',verified.providerId).single();if(source.error)throw new Error('SOURCE_REQUIRED');await attributeVerifiedCash(db,source.data);
    cursor=row.id;processed++;
    await db.from('sepay_sync_state').upsert({bank_account_id:config.bankAccountId,cursor_id:cursor,last_checked_at:new Date().toISOString(),last_result:'OK'});
  }
  await db.from('integration_settings').update({health:{status:'OK',checkedAt:new Date().toISOString(),bankAccountId:config.bankAccountId}}).eq('provider','SEPAY');
  console.log(JSON.stringify({ok:true,processed}));
}catch(error){await db.from('sepay_sync_state').upsert({bank_account_id:config.bankAccountId,cursor_id:cursor||null,last_checked_at:new Date().toISOString(),last_result:/^[A-Z_]+$/.test(error.message)?error.message:'SYNC_FAILED'});throw error;}
