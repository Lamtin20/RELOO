export function identityExpiry(identity, now = Date.now()) {
  const expiry = Date.parse(identity?.expires_at || '');
  if (!Number.isFinite(expiry)) return {status:identity ? 'NO_EXPIRY' : 'UNVERIFIED',expiresAt:null,daysRemaining:null};
  const days = Math.max(0,Math.ceil((expiry-now)/86400000));
  return {status:expiry<=now?'EXPIRED':days<=30?'EXPIRING':'VALID',expiresAt:identity.expires_at,daysRemaining:days};
}
export async function accountIdentity(db,profileId) {
  const {data,error}=await db.from('verified_identities').select('expires_at,submission_id').eq('profile_id',profileId).maybeSingle();
  if(error)throw new Error('IDENTITY_STORAGE_UNAVAILABLE');
  return {identity:data,...identityExpiry(data)};
}
