import {calendarRange} from '../rental-calendar.js';
export const EMPTY_HOME_DATES={startDate:'',endDate:'',startTime:'',endTime:''};
export function homeDiscoveryHref({intent='RENT',query='',location=null,dates=EMPTY_HOME_DATES,category='',now=Date.now()}={}){
 const p=new URLSearchParams();
 if(['BRAND','AFFILIATE'].includes(intent)){p.set('channel',intent);return '/explore?'+p;}
 if(['RENT','LONG_RENT','SALE'].includes(intent))p.set('transaction',intent==='LONG_RENT'?'RENT':intent);
 if(intent==='LONG_RENT'){p.set('rentalPlan','LONG');p.set('days','30');}
 if(/^[-a-z0-9]{1,60}$/.test(category))p.set('group',category);
 const q=String(query||'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,160);if(q)p.set('q',q);
 const province=location?.province?.name;if(typeof province==='string'&&province.trim()){p.set('locMode','province');p.set('loc',province.trim().slice(0,120));const wards=location.wards?.length?location.wards:location.ward?[location.ward]:[];const codes=[...new Set(wards.map(w=>String(w.code)).filter(c=>/^\d{1,12}$/.test(c)))];if(codes.length)p.set('wards',codes.join(','));}
 p.set('sort',province||location?.coords?'nearest':'newest');
 if(['RENT','LONG_RENT'].includes(intent)&&Object.values(dates||{}).some(Boolean)){const range=calendarRange(dates,now);if(range.error||intent==='LONG_RENT'&&range.days<30)throw Error('INVALID_HOME_DATES');p.set('start',dates.startDate);p.set('end',dates.endDate);p.set('pickupTime',dates.startTime);p.set('returnTime',dates.endTime);p.set('days',String(range.days));}
 return '/explore?'+p;
}
