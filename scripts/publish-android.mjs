import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {connect} from './laptop-ssh.mjs';
import {assertComplianceRelease} from '../compliance/assert-release.mjs';
assertComplianceRelease();
const root=resolve(import.meta.dirname,'..'),info=JSON.parse((await readFile(resolve(root,'output/mobile/latest.json'),'utf8')).replace(/^\uFEFF/,''));
if(!/^reloo-\d+\.apk$/.test(info.filename))throw Error('ANDROID_ARTIFACT_INVALID');
const immutable=resolve(root,'output/mobile/releases',info.filename),apk=await readFile(immutable).then(()=>immutable).catch(()=>resolve(root,'output/mobile/RELOO-Android-test.apk')),bytes=await readFile(apk);
if(info.sha256!==createHash('sha256').update(bytes).digest('hex')||!/^reloo-\d+\.apk$/.test(info.filename))throw Error('ANDROID_ARTIFACT_INVALID');
if(!process.env.RELOO_BUILD_PUBLISH_PASSWORD)throw Error('ANDROID_PUBLISH_CONFIG_REQUIRED');
const client=await connect(process.env.RELOO_BUILD_PUBLISH_PASSWORD),directory='/srv/reloo/data/public-media/android-release';
try{const made=await client.exec('mkdir -p '+directory);if(made.code!==0)throw Error('ANDROID_RELEASE_DIRECTORY');await new Promise((ok,no)=>client.sftp.fastPut(apk,directory+'/'+info.filename,{concurrency:32},e=>e?no(e):ok()));const verified=await client.exec('sha256sum '+directory+'/'+info.filename);if(!verified.output.startsWith(info.sha256))throw Error('ANDROID_RELEASE_HASH');await client.write(directory+'/latest.pending.json',JSON.stringify(info));const saved=await client.exec('chmod 644 '+directory+'/'+info.filename+' '+directory+'/latest.pending.json && mv '+directory+'/latest.pending.json '+directory+'/latest.json');if(saved.code!==0)throw Error('ANDROID_RELEASE_METADATA');console.log('Verified Android release published: '+info.version+' ('+info.versionCode+')');}finally{client.close();}
