// Run on the Linux deployment host only, after provisioning and release approval.
import {assertComplianceRelease} from '../compliance/assert-release.mjs';
import {copyFileSync,existsSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
if(process.platform!=='linux'||process.getuid()!==0)throw Error('LINUX_ROOT_REQUIRED');
assertComplianceRelease();
if(!existsSync('/srv/reloo-maps/photon/state/active.json'))throw Error('BOOTSTRAP_AND_BACKEND_POINTER_VERIFICATION_REQUIRED');
execFileSync('/opt/reloo-photon/venv/bin/python',['-c','import zstandard'],{stdio:'inherit'});
execFileSync('docker',['network','inspect','reloo-map-private'],{stdio:'ignore'});
mkdirSync('/opt/reloo-photon',{recursive:true});
copyFileSync('deploy/maps/photon_weekly_update.py','/opt/reloo-photon/photon_weekly_update.py');
for(const suffix of ['service','timer'])copyFileSync(`deploy/systemd/reloo-photon-update.${suffix}`,`/etc/systemd/system/reloo-photon-update.${suffix}`);
execFileSync('systemctl',['daemon-reload'],{stdio:'inherit'});
execFileSync('systemctl',['enable','--now','reloo-photon-update.timer'],{stdio:'inherit'});
execFileSync('systemctl',['list-timers','reloo-photon-update.timer'],{stdio:'inherit'});
