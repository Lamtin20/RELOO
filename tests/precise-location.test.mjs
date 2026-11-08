import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {validateGpsFix,validatePrivateLocation,gpsAccuracyPolygon} from '../lib/maps/precise-location.js';
import {privatePhotoPath,privatePhotoDirectory,deletePrivateLocationPhotos} from '../lib/maps/private-photo.js';
import {requirePreciseLocation} from '../lib/maps/location-requirement.js';
import {publicListingProjection} from '../lib/catalog/public-listing.js';
import {validateAddress} from '../lib/profile/validation.js';
const now=Date.now(),gps={lat:10.77,lng:106.7,accuracy:19.9,capturedAt:now};
const location={coords:{lat:10.78,lng:106.71},source:'manual',gps,consent:true,confirmed:true,entranceNote:'Side gate',photo:null};
test('strict sub-20m threshold refuses invalid, expired and future fixes',()=>{
 assert.equal(validateGpsFix(gps,{now}).accuracy,19.9);
 for(const patch of [{accuracy:20},{accuracy:0},{accuracy:-1},{accuracy:Infinity},{capturedAt:now-300001},{capturedAt:now+10001},{lat:91}])assert.throws(()=>validateGpsFix({...gps,...patch},{now}));
});
test('permission, coordinate, purpose permission and source are independent requirements',()=>{
 assert.equal(validatePrivateLocation(location,{now,fresh:true}).accuracyClaim,'USER_SELECTED_NOT_MEASURED');
 for(const patch of [{consent:false},{coords:null},{source:'verified'},{entranceNote:'x'.repeat(301)}])assert.throws(()=>validatePrivateLocation({...location,...patch},{now,fresh:true}));
 assert.equal(validatePrivateLocation({...location,coords:{lat:gps.lat,lng:gps.lng},source:'gps'},{now}).accuracyClaim,'DEVICE_REPORTED');
 assert.throws(()=>validatePrivateLocation({...location,source:'gps'},{now}),/GPS_PIN_MISMATCH/);
 assert.throws(()=>validatePrivateLocation({...location,gps:{...gps,capturedAt:now-300001}},{now,fresh:true}));
});
test('address requires both street and house/landmark, permits descriptive house text',async()=>{
 const catalog={provinces:async()=>[{code:1,name:'Province'}],wards:async()=>[{code:2,name:'Ward'}]},address={province:{code:1},ward:{code:2},house:'Opposite the school entrance',street:'Example Street',hamlet:'',note:'',type:'HOME'};
 assert.equal((await validateAddress(address,catalog)).house,address.house);
 for(const patch of [{house:''},{house:'  '},{street:''},{street:'  '}])await assert.rejects(validateAddress({...address,...patch},catalog),/ADDRESS_DETAIL_REQUIRED/);
});
test('accuracy geometry is closed and remains close to the GPS fix',()=>{
 const polygon=gpsAccuracyPolygon(gps,19);assert.equal(polygon.geometry.coordinates[0].length,65);
 const ring=polygon.geometry.coordinates[0];assert.ok(Math.abs(ring[0][0]-ring[64][0])<1e-9);assert.ok(Math.abs(ring[0][1]-ring[64][1])<1e-9);
});
test('precise private location and entrance photo never enter public catalog payload',()=>{
 const output=publicListingProjection({id:'asset',status:'available',locationDetails:{preciseLocation:location,coords:location.coords,house:'Secret',province:{code:1,name:'Province'},ward:{code:2,name:'Ward'}}});
 assert.equal(output.locationDetails.coords,undefined);assert.equal(output.locationDetails.preciseLocation,undefined);assert.equal(output.locationDetails.house,undefined);
});
test('private photo owner isolation, reference ownership and deletion stay bounded',async()=>{
 const root=await mkdtemp(join(tmpdir(),'reloo-private-photo-')),previous=process.env.RELOO_PRIVATE_LOCATION_MEDIA_DIR;process.env.RELOO_PRIVATE_LOCATION_MEDIA_DIR=root;
 try{
  const id='11111111-1111-4111-8111-111111111111';await mkdir(privatePhotoDirectory('alice'),{recursive:true});await writeFile(privatePhotoPath('alice',id),'fixture');
  const input={...location,photo:'/api/profile/location-photo/'+id};
  assert.equal((await requirePreciseLocation(input,'alice')).photo,null);assert.equal((await requirePreciseLocation({...input,confirmed:false},'alice')).consent,true);
  assert.notEqual(privatePhotoPath('alice',id),privatePhotoPath('bob',id));assert.throws(()=>privatePhotoPath('alice','../escape'));
  await deletePrivateLocationPhotos('bob');assert.equal((await readFile(privatePhotoPath('alice',id))).toString(),'fixture');
  await deletePrivateLocationPhotos('alice');await assert.rejects(readFile(privatePhotoPath('alice',id)));
 }finally{if(previous===undefined)delete process.env.RELOO_PRIVATE_LOCATION_MEDIA_DIR;else process.env.RELOO_PRIVATE_LOCATION_MEDIA_DIR=previous;await rm(root,{recursive:true,force:true})}
});
