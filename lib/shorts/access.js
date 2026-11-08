import { findAccountProfile, authenticatedIdentity } from "../auth/identity.js";
import { requirePermission } from "../operations/permissions.js";
export async function optionalShortProfile(request, db) {
  try {
    const { authUser } = await authenticatedIdentity(request);
    return await findAccountProfile(authUser, db);
  } catch (e) {
    if (e.status === 401) return null;
    throw e;
  }
}
export async function shortMayView(db, video, profile,request=null) {
  if (profile?.id === video.profile_id) return true;
  if(video.status==='PUBLISHED'){
    const allowed=await db.rpc('reloo_public_short_access',{p_video:video.id,p_viewer:profile?.id||null});
    if(allowed.error)throw allowed.error;
    if(allowed.data)return true;
  }
  if(profile&&request){try{await requirePermission(request,'content.read');return true;}catch(e){if(e.status!==401&&e.status!==403)throw e;}}
  return false;
}
export function publicShortAllowed(owner,expired,blocked,now=Date.now()){
  return !!owner&&!owner.deleted_at&&owner.status==='active'&&owner.activation_status==='ACTIVE'&&Number.isFinite(Date.parse(owner.screening_valid_until))&&Date.parse(owner.screening_valid_until)>now&&!expired&&!blocked;
}
