export function parseEmailExposure(lookup,email){
  const data=lookup.emailData;
  const base={checkedAt:new Date().toISOString(),source:'Chống Lừa Đảo / Have I Been Pwned',scope:'public_email_breach_report'};
  if(lookup.status!==200||!lookup.values?.some(value=>value.toLowerCase()===email.toLowerCase())||!data?.hasResultHeading||data.source!=='HIBP_VIA_CLD'||!Number.isInteger(data.reportedCount)||data.reportedCount<0||data.reportedCount>100||!Array.isArray(data.breaches)||data.reportedCount!==data.breaches.length)return {...base,status:'UNAVAILABLE',breaches:[],count:null};
  const breaches=data.breaches.map(item=>{
    if(typeof item.name!=='string'||!item.name||typeof item.date!=='string'||!Array.isArray(item.types)||!item.types.length)throw new Error('EXPOSURE_STRUCTURE_CHANGED');
    let logo=null;try{const url=new URL(item.logo);if(url.protocol==='https:'&&url.hostname==='logos.haveibeenpwned.com'&&!url.username)logo=url.href;}catch{}
    return {name:item.name.slice(0,200),date:item.date.slice(0,80),types:item.types.filter(type=>typeof type==='string').map(type=>type.slice(0,100)).slice(0,20),logo};
  });
  return {...base,status:breaches.length?'EXPOSED':'NO_EXPOSURE_REPORTED',count:breaches.length,breaches};
}
