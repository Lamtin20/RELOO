import {normalizePhone} from '../phone.js';
export function profileContact(authUser,profile){
 const phone=normalizePhone(profile.phone),email=typeof profile.email==='string'?profile.email.trim().toLowerCase():'';
 return {emailVerified:!!(email&&authUser.email_confirmed_at&&email===authUser.email?.trim().toLowerCase()),
  phoneVerified:!!(phone&&authUser.phone_confirmed_at&&phone===normalizePhone(authUser.phone)),
  googleLinked:authUser.identities?.some(i=>i.provider==='google')===true,joinedAt:authUser.created_at||null};
}
