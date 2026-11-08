export function createShortMeter(item){
 const sent=new Set();let queue=Promise.resolve();
 return function record(kind,productId=null,playingMs=0){
  if(!item.metricTicket)return;
  if(kind==='CLICK'){
   const key='CLICK:'+productId;if(sent.has(key))return;sent.add(key);
   const body=JSON.stringify({ticket:item.metricTicket,events:[{kind:'IMPRESSION'},...(item.products.length?[{kind:'PRODUCT_IMPRESSION'}]:[]),{kind:'CLICK',productId}]});
   if(typeof navigator!=='undefined'&&navigator.sendBeacon?.('/api/shorts/events',new Blob([body],{type:'application/json'})))return;
   fetch('/api/shorts/events',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>sent.delete(key));return;
  }
  const events=[];
  function add(k,p=null){const key=k+':'+(p||'');if(sent.has(key))return;sent.add(key);events.push({kind:k,...(p?{productId:p}:{}),...(k==='VIEW'?{playingMs}:{})});}
  add('IMPRESSION');if(item.products.length)add('PRODUCT_IMPRESSION');if(!['IMPRESSION','PRODUCT_IMPRESSION'].includes(kind))add(kind,productId);
  if(!events.length)return;
  queue=queue.catch(()=>{}).then(async()=>{let ok=false;for(let i=0;i<2&&!ok;i++){try{const r=await fetch('/api/shorts/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:item.metricTicket,events}),keepalive:true});ok=r.ok;if(r.status>=400&&r.status<500)break;}catch{}if(!ok&&i===0)await new Promise(r=>setTimeout(r,250));}if(!ok)for(const e of events)sent.delete(e.kind+':'+(e.productId||''));});
 };
}
