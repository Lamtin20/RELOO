export const CONSENT_VERSION=2;
export const CONSENT_MAX_AGE=180*86400;
export function validConsent(value,now=Date.now()){
 return value?.version===CONSENT_VERSION&&typeof value.analytics==='boolean'&&typeof value.marketing==='boolean'&&Number.isFinite(value.savedAt)&&value.savedAt<=now&&now-value.savedAt<CONSENT_MAX_AGE*1000;
}
export function mayTrack(value,{category='analytics',now=Date.now(),dnt=false,gpc=false}={}){
 return !dnt&&!gpc&&['analytics','marketing'].includes(category)&&validConsent(value,now)&&value[category]===true;
}
