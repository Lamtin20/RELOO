import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve,basename,dirname} from 'node:path';
const git=spawnSync('powershell',['-NoProfile','-Command','(Get-Command git).Source'],{encoding:'utf8'}).stdout.trim();
const bash=join(dirname(dirname(git)),'bin','bash.exe'),source=await readFile('deploy/reloo-healthcheck.sh','utf8');
const mocks=String.raw`
id(){ echo 0; }
date(){ echo "$RELOO_TEST_NOW"; }
logger(){ :; }
flock(){ :; }
systemctl(){ return 0; }
timeout(){ shift; "$@"; }
python3(){ local body;body=$(cat);[[ $body == *'"status":"ok"'* ]]; }
docker(){
 case "$1" in
 info) return 0;;
 inspect) if [[ $RELOO_TEST_SCENARIO == stopped && $* == *reloo-web-app-1 ]];then echo false;else echo true;fi;;
 start|restart) echo "$*" >> "$RELOO_TEST_CALLS";;
 esac
}
curl(){
 if [[ $* == *'127.0.0.1'* ]];then
  if [[ $RELOO_TEST_SCENARIO == app-fail ]];then echo '{}';else echo '{"service":"reloo","status":"ok"}';fi
 else
  local out='';while (($#));do if [[ $1 == --output ]];then shift;out=$1;fi;shift;done
  case "$RELOO_TEST_SCENARIO" in tunnel-fail) echo 'Error 1033' > "$out";printf '530';;network-fail) : > "$out";return 28;;*) echo '{"service":"reloo","status":"ok"}' > "$out";printf '200';;esac
 fi
}
`;
test('health watchdog restarts only the affected container after repeated failures and observes cooldown/maintenance',async()=>{
 const base=await mkdtemp(join(tmpdir(),'reloo-recovery-test-')),calls=join(base,'calls.txt');
 try{
  await mkdir(join(base,'state'));await writeFile(calls,'');
  const script=mocks+'\n'+source.replace('[[ -d /srv/reloo/apps/web ]] || exit 1','true # fixture has application directory');
  async function run(scenario,now){const result=spawnSync(bash,['-s'],{input:script,encoding:'utf8',env:{...process.env,RELOO_RECOVERY_STATE_DIR:join(base,'state').replaceAll('\\','/'),RELOO_TEST_CALLS:calls.replaceAll('\\','/'),RELOO_TEST_SCENARIO:scenario,RELOO_TEST_NOW:String(now)}});assert.ok([0,1].includes(result.status),result.stderr);return readFile(calls,'utf8');}
  assert.equal(await run('healthy',1700000000),'');
  assert.equal((await run('stopped',1700000000)).trim(),'start reloo-web-app-1');
  assert.equal((await run('stopped',1700000030)).trim(),'start reloo-web-app-1');
  await writeFile(calls,'');
  await run('tunnel-fail',1700000060);await run('tunnel-fail',1700000120);let log=await run('tunnel-fail',1700000180);assert.equal(log.trim(),'restart --time 20 reloo_cloudflared');
  log=await run('tunnel-fail',1700000240);assert.equal(log.trim().split('\n').length,1);
  await run('app-fail',1700000300);await run('app-fail',1700000360);log=await run('app-fail',1700000420);assert.ok(log.includes('restart --time 30 reloo-web-app-1'));assert.ok(!log.includes('reloo-vn-db'));
  const before=log;await run('network-fail',1700000480);await run('network-fail',1700000540);assert.equal(await run('network-fail',1700000600),before);
  await writeFile(join(base,'state','maintenance'),'');assert.equal(await run('app-fail',1700001300),before);
 }finally{assert.ok(basename(base).startsWith('reloo-recovery-test-'));assert.equal(dirname(resolve(base)),resolve(tmpdir()));await rm(base,{recursive:true,force:true});}
});
