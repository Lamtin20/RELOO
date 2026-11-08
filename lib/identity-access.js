export const VERIFIED_IDENTITY_STATES=['VALID','EXPIRING','NO_EXPIRY'];
export function notifyIdentityError(code){if(typeof window!=='undefined'&&['IDENTITY_REQUIRED','IDENTITY_EXPIRED'].includes(code))window.dispatchEvent(new Event('reloo-identity-required'));}
export function identityReady(user){return user?.identityVerified===true&&VERIFIED_IDENTITY_STATES.includes(user.identityStatus);}
export function identityRecordReady(record){return !!record?.identity?.submission_id&&VERIFIED_IDENTITY_STATES.includes(record.status);}
export function identityProtectedPath(path=''){
 return /^\/(lend(?:\/|$)|rent\/|dashboard\/assets\/(?:(?:new|neighborhood)(?:\/|$)|[^/]+\/edit(?:\/|$)))/.test(path);
}
export function neighborhoodIdentityRequired(action,data={}){
 if(['LISTING','NEED','EDIT_NEED','OFFER','BOOK','BOOK_DRAFT','SUBMIT_DRAFT','ACCEPT','READY','EXTEND','EXTENSION_ACCEPT','EXTENSION_PAID','PAYMENT_REPORT','PAYMENT_ACK','DEPOSIT_ACK'].includes(action))return true;
 return ['HANDOVER','ISSUE_OTP'].includes(action)&&data.phase!=='RETURN';
}
