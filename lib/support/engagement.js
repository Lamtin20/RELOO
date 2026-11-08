// RELOO rules. Thresholds are explicit configuration, not a proprietary model.
export const ENGAGEMENT_RULES=Object.freeze({waitSeconds:15,priceViews:2,priceSeconds:30,productPages:2,productSeconds:45,maxInvites:1,expiresSeconds:120,dismissHours:24});
export function invitationEligible({allowed=false,analytics=false,marketing=false,gpc=false,dnt=false,visible=true,elapsed=0,priceViews=0,priceSeconds=0,productPages=0,productSeconds=0,invites=0,dismissedAt=null,now=Date.now()},rules=ENGAGEMENT_RULES){
 if(!allowed||!analytics||!marketing||gpc||dnt||!visible||elapsed<rules.waitSeconds||invites>=rules.maxInvites||dismissedAt!=null&&now-dismissedAt<rules.dismissHours*3600000)return null;
 if(priceViews>=rules.priceViews&&priceSeconds>=rules.priceSeconds)return 'price';
 if(productPages>=rules.productPages&&productSeconds>=rules.productSeconds)return 'product';
 return null;
}
