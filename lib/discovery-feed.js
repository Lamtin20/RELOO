export function discoveryFeed(items,recommended=[],exclusions=[]){
 const visible=items.filter(i=>i.status==='available'&&!i.isLocked&&!i.is_locked&&i.saleStatus!=='SOLD'&&!i.neighborhoodOnly&&!['OPEN','ACTIVE','DISPUTED','PENDING'].includes(String(i.disputeStatus||i.dispute_status||'').toUpperCase())&&!exclusions.some(x=>x.kind==='OWNER'&&x.target===i.ownerId||x.kind==='PRODUCT'&&x.target===i.id||x.kind==='CATEGORY'&&x.target===i.category));
 const positions=new Map(recommended.map((i,n)=>[i.id,n]));return visible.map((item,index)=>({item,index,position:positions.get(item.id)??Number.MAX_SAFE_INTEGER})).sort((a,b)=>a.position-b.position||a.index-b.index).map(x=>x.item);
}
