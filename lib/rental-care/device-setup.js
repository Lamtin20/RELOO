export async function setupDeviceCalendar({actor,data,native,post,isCurrent=()=>true,locale='vi-VN',explicit=false}){
 const current=()=>{if(!isCurrent())throw Error('ACCOUNT_CHANGED');};current();
 if(!actor||data.actor!==actor||!data.enabled)return {status:'UNAVAILABLE'};
 if(!explicit&&data.preferences?.destination==='NONE'&&data.preferences?.onboarding_seen_at)return {status:'USER_DISABLED'};
 if(['GOOGLE','BOTH'].includes(data.preferences?.destination)&&data.connections?.some(c=>c.provider==='GOOGLE'&&c.status==='ACTIVE'))return {status:'GOOGLE_ACTIVE'};
 const identity=await native.identity();current();if(!identity.granted)return {status:'PERMISSION_REQUIRED'};
 const existing=data.connections?.find(c=>c.provider==='DEVICE'&&c.device_id===identity.device&&c.status!=='DISCONNECTED');
 if(existing?.status==='ACTIVE')return {status:'CONNECTED',created:false};
 let calendar;
 if(existing?.calendar_id){const list=await native.calendars();current();calendar=list.calendars?.find(c=>String(c.id)===String(existing.calendar_id));if(!calendar)return {status:'REVIEW_REQUIRED'};}
 else{const found=await native.ensureCalendar({account:actor});current();if(found.device!==identity.device||found.independent!==true)throw Error('CALENDAR_REVIEW');calendar=found.calendar;}
 if(!calendar?.id||!calendar.name)throw Error('CALENDAR_REVIEW');
 const created=await post('/api/rental-care',{subject:actor,action:'device',device:identity.device,calendar:String(calendar.id),name:calendar.name,independent:true,confirmSwitch:false});current();
 if(!created?.id)throw Error('CALENDAR_FAILED');
 await post('/api/rental-care',{subject:actor,action:'activate',id:created.id,confirmSwitch:false,dual:false,confirmDual:false,locale});current();
 return {status:'CONNECTED',created:true};
}
