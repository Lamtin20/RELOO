export async function readAccountCounts(db,actor){
 if(typeof actor!=='string'||!/^[a-zA-Z0-9_-]{1,150}$/.test(actor))throw Error('INVALID_ACTOR');
 const entries={};const tasks=[];
 const count=(key,table,scope,apply=q=>q)=>tasks.push((async()=>{try{let q=db.from(table).select('id',{count:'exact',head:true});q=scope(q);q=apply(q);if(q.abortSignal)q=q.abortSignal(AbortSignal.timeout(8000));const r=await q;entries[key]=r.error?null:r.count;}catch{entries[key]=null;}})());
 const own=(...fields)=>q=>fields.length===1?q.eq(fields[0],actor):q.or(fields.map(f=>f+'.eq.'+actor).join(','));
 const tx=own('renter_id','lender_id'),nk=own('renter_id','owner_id'),purchase=own('buyer_id','seller_id'),agreement=own('renter_id','lender_id');
 for(const [name,table,scope,pending] of [['orders','transactions',tx,['pending']],['neighborhood','nk_orders',nk,['DRAFT','PENDING_OWNER','PENDING_PAYMENT']],['purchases','purchase_orders',purchase,['REQUESTED','CONFIRMED','HANDED_OVER','DISPUTED']],['agreements','rental_agreements',agreement,['PROPOSED','DISPUTED']]]){
  count(name+'Total',table,scope);count(name,table,scope,q=>q.in('status',pending));
 }
 count('assetsTotal','assets',own('owner_id'));count('assets','assets',own('owner_id'),q=>q.in('status',['draft','pending','review','paused','suspended']));
 count('notifications','notifications',own('user_id'),q=>q.eq('is_read',false));
 count('needs','nk_needs',own('profile_id'),q=>q.eq('status','OPEN').gt('expires_at',new Date().toISOString()));
 count('nearbyNeeds','nearby_requests',own('profile_id'),q=>q.eq('status','OPEN').gt('expires_at',new Date().toISOString()));
 count('scheduledAudit','nk_orders',nk,q=>q.in('status',['READY_FOR_HANDOVER','RETURN_PENDING']));
 count('audit','transactions',tx,q=>q.in('status',['audit_pickup','audit_return']));
 count('identity','kyc_submissions',own('profile_id'),q=>q.in('status',['QUEUED','PROCESSING','REVIEW']).is('superseded_at',null));
 tasks.push((async()=>{try{const r=await db.rpc('reloo_account_unread',{p_actor:actor});entries.messages=r.error?null:Number(r.data);}catch{entries.messages=null;}})());
 for(const [key,statuses] of Object.entries({pending:['pending'],active:['paid','audit_pickup','shipping','in_use'],return:['audit_return'],overdue:['overdue'],completed:['completed'],cancelled:['cancelled','canceled','rejected','expired']}))count('orders.'+key,'transactions',tx,q=>q.in('status',statuses));
 for(const status of ['REQUESTED','CONFIRMED','HANDED_OVER','COMPLETED','CANCELLED','DISPUTED'])count('purchases.'+status,'purchase_orders',purchase,q=>q.eq('status',status));
 for(const status of ['PROPOSED','ACCEPTED','ACTIVE','CLOSED','CANCELLED','DISPUTED'])count('agreements.'+status,'rental_agreements',agreement,q=>q.eq('status',status));
 for(const [key,statuses] of Object.entries({pending:['DRAFT','PENDING_OWNER','PENDING_PAYMENT'],active:['CONFIRMED','READY_FOR_HANDOVER','ACTIVE'],return:['RETURN_PENDING'],completed:['COMPLETED'],cancelled:['CANCELLED','EXPIRED']}))count('neighborhood.'+key,'nk_orders',nk,q=>q.in('status',statuses));
 count('neighborhood.overdue','nk_orders',nk,q=>q.in('status',['ACTIVE','RETURN_PENDING']).lt('ends_at',new Date().toISOString()));
 await Promise.all(tasks);
 const sum=(a,b)=>a===null||b===null||a===undefined||b===undefined?null:a+b;
 entries.orders=sum(entries.orders,entries.neighborhood);entries.ordersTotal=sum(entries.ordersTotal,entries.neighborhoodTotal);
 entries.needs=sum(entries.needs,entries.nearbyNeeds);entries.audit=sum(entries.audit,entries.scheduledAudit);
 for(const key of ['pending','active','return','overdue','completed','cancelled'])entries['orders.'+key]=sum(entries['orders.'+key],entries['neighborhood.'+key]);
 entries['orders.all']=entries.ordersTotal;
 for(const name of ['neighborhood','purchases','agreements'])entries[name+'.all']=entries[name+'Total'];
 return {ok:true,counts:entries,unavailable:Object.keys(entries).filter(k=>entries[k]===null),generatedAt:new Date().toISOString(),refreshSeconds:60,definition:'Counts are scoped to the authenticated account. Badges show pending states; no badge is inferred for a tool without a reliable source.'};
}
