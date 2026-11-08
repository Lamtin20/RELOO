import {mkdir,readFile,writeFile,rename,access} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {connect} from '../laptop-ssh.mjs';
const destination=resolve('output/security-hardening/offsite');await mkdir(destination,{recursive:true});
const c=await connect(process.env.RELOO_BUILD_PUBLISH_PASSWORD);
try{
 const listing=await new Promise((ok,no)=>c.sftp.readdir('/srv/reloo/backups/automatic',(error,files)=>error?no(error):ok(files)));
 const latest=listing.map(f=>f.filename).filter(n=>/^reloo-\d{8}T\d{6}Z\.tar\.gz\.gpg$/.test(n)).sort().at(-1);
 if(!latest)throw Error('NO_VERIFIED_ENCRYPTED_BACKUP');
 const remote='/srv/reloo/backups/automatic/'+latest,local=join(destination,latest);
 const expected=(await c.read(remote+'.sha256')).toString().trim().split(/\s+/)[0];
 const secret=(await c.read('/srv/reloo/secrets/backup-passphrase')).toString().trim();
 const keyId=createHash('sha256').update(secret).digest('hex').slice(0,16),keyPath=join(destination,'backup-key-'+keyId+'.credential.xml');
 const escaped=keyPath.replaceAll("'","''");
 const command=`$ErrorActionPreference='Stop'; $secret=[Console]::In.ReadToEnd(); ConvertTo-SecureString -String $secret -AsPlainText -Force | Export-Clixml -LiteralPath '${escaped}'`;
 const encrypted=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{input:secret,windowsHide:true,stdio:['pipe','pipe','pipe']});
 if(encrypted.status!==0)throw Error('OFFSITE_KEY_ENCRYPTION_FAILED');
 let exists=false;try{await access(local);exists=true;}catch{}
 if(!exists){console.log('Copying encrypted backup to development machine:',latest);await new Promise((ok,no)=>c.sftp.fastGet(remote,local+'.partial',{concurrency:8},error=>error?no(error):ok()));}
 const hash=createHash('sha256');for await(const chunk of createReadStream(exists?local:local+'.partial'))hash.update(chunk);
 if(hash.digest('hex')!==expected)throw Error('OFFSITE_CHECKSUM_FAILED');
 if(!exists)await rename(local+'.partial',local);
 await writeFile(join(destination,'last-success.json'),JSON.stringify({copiedAt:new Date().toISOString(),file:latest,sha256:expected,keyId,keyProtection:'Windows DPAPI, current user',source:'reloo-homelab',verified:true},null,2));
 console.log('Off-machine encrypted backup and checksum verified.');
}finally{c.close();}
