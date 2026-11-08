import {Capacitor,registerPlugin} from '@capacitor/core';
const RelooLocation=registerPlugin('RelooLocation');
// One-shot location only. Neither this adapter nor its native implementation stores GPS.
export async function currentLocation(){
 if(Capacitor.getPlatform()==='ios'&&Capacitor.isPluginAvailable('RelooLocation'))return RelooLocation.current();
 if(!globalThis.navigator?.geolocation)throw Error('LOCATION_UNAVAILABLE');
 return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),reject,{enableHighAccuracy:true,timeout:10000,maximumAge:0}));
}
