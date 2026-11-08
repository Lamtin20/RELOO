export const LEGACY_DRAFT_KEY='reloo-owner-draft-v1';
const TRANSFER_KEY='reloo-owner-draft-transfer-v3',MAX_AGE=24*60*60*1000;
export const ownerDraftKey=actor=>'reloo-owner-draft-v3:'+encodeURIComponent(actor||'guest');
function read(storage,key){try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}}
export function saveOwnerDraft(storage,actor,value,now=Date.now()){
 const record={...value,version:3,actor:actor||null,savedAt:now};delete record.transferred;
 storage.setItem(ownerDraftKey(actor),JSON.stringify(record));return record;
}
function valid(record,actor,now){return record?.version===3&&record.actor===(actor||null)&&Number.isFinite(record.savedAt)&&record.savedAt<=now&&now-record.savedAt<=MAX_AGE&&record.form&&typeof record.form==='object';}
export function readOwnerDraft(storage,actor,token,now=Date.now()){
 const own=read(storage,ownerDraftKey(actor));if(valid(own,actor,now))return own;
 if(!actor||!token)return null;
 const transfer=read(storage,TRANSFER_KEY),guest=read(storage,ownerDraftKey(null));
 if(transfer?.token!==token||!Number.isFinite(transfer.expiresAt)||transfer.expiresAt<now||!valid(guest,null,now))return null;
 return {...guest,actor,transferred:true};
}
export function beginDraftSignIn(storage,token,now=Date.now()){
 storage.setItem(TRANSFER_KEY,JSON.stringify({token,expiresAt:now+15*60*1000}));return '/lend?draft='+encodeURIComponent(token);
}
export function finishDraftTransfer(storage,actor,draft,token,now=Date.now()){
 const transfer=read(storage,TRANSFER_KEY);if(!actor||!token||transfer?.token!==token)return false;
 if(draft?.transferred){saveOwnerDraft(storage,actor,draft,now);storage.removeItem(ownerDraftKey(null));}
 storage.removeItem(TRANSFER_KEY);return true;
}
export function hasLegacyDraft(storage){return !!read(storage,LEGACY_DRAFT_KEY)?.form;}
export function adoptLegacyDraft(storage,actor,confirmed,now=Date.now()){
 if(!confirmed)throw Error('DRAFT_OWNERSHIP_CONFIRMATION_REQUIRED');
 const record=read(storage,LEGACY_DRAFT_KEY);if(!record?.form)throw Error('DRAFT_NOT_FOUND');
 saveOwnerDraft(storage,actor,record,now);storage.removeItem(LEGACY_DRAFT_KEY);
}
