import {coordinate} from './spatial.js';
export function validateGpsFix(input,{now=Date.now(),maxAge=300000}={}){
 const point=coordinate(input);
 if(!Number.isFinite(input.accuracy)||input.accuracy<=0||input.accuracy>=20)throw Error('GPS_ACCURACY_REQUIRED');
 if(!Number.isFinite(input.capturedAt)||input.capturedAt>now+10000||now-input.capturedAt>maxAge)throw Error('GPS_FIX_EXPIRED');
 return {...point,accuracy:input.accuracy,capturedAt:input.capturedAt};
}
export function validatePrivateLocation(input,{now=Date.now(),fresh=false}={}){
 if(!input||input.consent!==true)throw Error('LOCATION_PERMISSION_REQUIRED');
 const point=coordinate(input.coords);
 if(!['gps','search','manual'].includes(input.source))throw Error('LOCATION_SOURCE_INVALID');
 const gps=validateGpsFix(input.gps,{now,maxAge:fresh?300000:10*365*86400000});
 if(input.source==='gps'&&(Math.abs(point.lat-gps.lat)>1e-8||Math.abs(point.lng-gps.lng)>1e-8))throw Error('GPS_PIN_MISMATCH');
 if(typeof input.entranceNote!=='string'||input.entranceNote.length>300)throw Error('LOCATION_NOTE_INVALID');
 const photo=null; // Entrance photo collection was removed; legacy files remain deletable.
 return {coords:point,source:input.source,gps,consent:true,entranceNote:input.entranceNote.trim(),photo,accuracyClaim:input.source==='gps'?'DEVICE_REPORTED':'USER_SELECTED_NOT_MEASURED'};
}
export function gpsAccuracyPolygon(center,meters){
 const p=coordinate(center);if(!Number.isFinite(meters)||meters<=0||meters>=20)throw Error('GPS_ACCURACY_REQUIRED');
 const ring=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return [p.lng+Math.sin(a)*meters/(111320*Math.cos(p.lat*Math.PI/180)),p.lat+Math.cos(a)*meters/111320]});
 return {type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}};
}
