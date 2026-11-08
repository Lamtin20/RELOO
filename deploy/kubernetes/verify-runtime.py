#!/usr/bin/env python3
"""Small, read-only HTTP canary and isolated failure tests before public switching."""
import concurrent.futures, json, os, pathlib, subprocess, tempfile, time, urllib.request
import reconcile as r
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
result={'publicTrafficSwitched':False,'tests':{}}
def check(url,path='/api/health',origin=None):
 headers={'Host':'reloo.vn'}
 if origin:headers['Origin']=origin
 start=time.monotonic()
 try:
  with opener.open(urllib.request.Request(url+path,headers=headers),timeout=12) as x:return x.status,round((time.monotonic()-start)*1000)
 except urllib.error.HTTPError as e:return e.code,round((time.monotonic()-start)*1000)
def pods():return json.loads(r.kube(['get','pods','-n','reloo','-l','app=reloo-renderer','-o','json']))['items']
def ready(p):return not p['metadata'].get('deletionTimestamp') and any(c['type']=='Ready' and c['status']=='True' for c in p['status'].get('conditions',[]))
def wait_ready(count=2):
 for _ in range(90):
  if sum(ready(p) for p in pods())>=count:return
  time.sleep(2)
 raise RuntimeError('READY_TIMEOUT')
if __name__=='__main__':
 r.canary();before=[p for p in pods() if ready(p)]
 if len(before)<2:raise RuntimeError('TWO_READY_PODS_REQUIRED')
 endpoint='http://'+r.node_address()+':31080'
 old_uid=before[0]['metadata']['uid'];r.kube(['delete','pod',before[0]['metadata']['name'],'-n','reloo','--wait=false'])
 observed=[]
 for _ in range(75):
  observed.append(check(endpoint)[0]);current=pods()
  if old_uid not in [p['metadata']['uid'] for p in current] and sum(ready(p) for p in current)>=2:break
  time.sleep(2)
 else:raise RuntimeError('SELF_HEAL_TIMEOUT')
 result['tests']['selfHealing']={'passed':all(x==200 for x in observed),'probes':len(observed),'failedProbes':sum(x!=200 for x in observed)}
 if not result['tests']['selfHealing']['passed']:raise RuntimeError('SELF_HEAL_INTERRUPTED')
 # Verify both pod endpoint NAT chains actually receive requests.
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:status=list(pool.map(lambda _:check(endpoint,'/account')[0],range(12)))
 nat=r.run(['iptables-save','-c','-t','nat'])
 rules=[x for x in nat.splitlines() if '--to-destination ' in x and 'reloo/reloo-renderer:http' in x]
 counts=[]
 for line in rules:
  try:counts.append(int(line.split(']')[0].lstrip('[').split(':')[0]))
  except ValueError:pass
 result['tests']['distribution']={'passed':all(x==200 for x in status) and sum(x>0 for x in counts)>=2,'requests':len(status),'activeEndpointCounters':sum(x>0 for x in counts)}
 if not result['tests']['distribution']['passed']:raise RuntimeError('DISTRIBUTION_NOT_PROVEN')
 # Test fallback via a temporary private proxy; production edge remains untouched.
 edge=r.inspect('reloo-web-edge-1');network=sorted(edge['NetworkSettings']['Networks'])[0]
 env=dict(x.split('=',1) for x in edge['Config']['Env'])
 name='reloo-k3s-canary-edge';hpa=next(x for x in json.loads((r.ROOT/'resources-base.json').read_text())['items'] if x['kind']=='HorizontalPodAutoscaler')
 candidate=r.ROOT/'edge-enabled.template';candidate.chmod(0o644)
 container_created=False;autoscaler_paused=False
 try:
  with tempfile.NamedTemporaryFile(mode='w',prefix='reloo-k3s-edge-',dir='/run',delete=False) as f:
   os.chmod(f.name,0o600)
   for key in ['RELOO_EDGE_SECRET','NGINX_ENVSUBST_FILTER']:
    if key in env:f.write(key+'='+env[key]+chr(10))
   envfile=f.name
  r.run(['docker','run','-d','--name',name,'--network',network,'--user','101:101','--cap-drop','ALL','--security-opt','no-new-privileges:true','--read-only','--pids-limit','64','--memory','64m','--cpus','0.25','--tmpfs','/etc/nginx/conf.d:uid=101,gid=101,mode=0755','--tmpfs','/var/cache/nginx:uid=101,gid=101,mode=0755','--tmpfs','/var/run:uid=101,gid=101,mode=0755','--env-file',envfile,'-p','127.0.0.1:18080:8080','-v',str(candidate)+':/etc/nginx/templates/default.conf.template:ro',edge['Image']])
  container_created=True;pathlib.Path(envfile).unlink()
  for _ in range(20):
   try:
    if check('http://127.0.0.1:18080','/account')[0]==200:break
   except Exception:pass
   time.sleep(1)
  else:raise RuntimeError('CANARY_EDGE_NOT_READY')
  api_status=check('http://127.0.0.1:18080','/api/dashboard/orders')[0]
  origin_status=check('http://127.0.0.1:18080','/socket.io/?EIO=4&transport=polling','https://invalid.example')[0]
  result['tests']['authAndSocketBoundary']={'passed':api_status==401 and origin_status==403,'privateApi':api_status,'foreignSocketOrigin':origin_status}
  if not result['tests']['authAndSocketBoundary']['passed']:raise RuntimeError('AUTH_BOUNDARY_FAILED')
  r.kube(['delete','hpa/reloo-renderer','-n','reloo']);autoscaler_paused=True
  r.kube(['scale','deployment/reloo-renderer','-n','reloo','--replicas=0'])
  for _ in range(45):
   current=pods()
   if not any(ready(p) for p in current):break
   time.sleep(1)
  fallback=[check('http://127.0.0.1:18080','/account') for _ in range(3)]
  result['tests']['privateFallback']={'passed':all(x[0]==200 for x in fallback),'statuses':[x[0] for x in fallback],'latencyMs':[x[1] for x in fallback]}
  if not result['tests']['privateFallback']['passed']:raise RuntimeError('FALLBACK_FAILED')
 finally:
  if autoscaler_paused:
   r.kube(['scale','deployment/reloo-renderer','-n','reloo','--replicas=2']);r.apply(hpa);wait_ready()
  if container_created:r.run(['docker','rm','-f',name],check=False)
  if 'envfile' in locals():pathlib.Path(envfile).unlink(missing_ok=True)
 r.canary();result['publicProbes']=[]
 for _ in range(3):
  value=r.run(['curl','--max-time','8','-sS','-o','/dev/null','-w','%{http_code}','https://reloo.vn/api/health'],check=False).strip()
  result['publicProbes'].append(int(value) if value.isdigit() else 0)
  if result['publicProbes'][-1]==200:break
  time.sleep(1)
 result['publicHealth']=result['publicProbes'][-1];result['passed']=all(x['passed'] for x in result['tests'].values()) and result['publicHealth']==200
 (r.STATE/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
