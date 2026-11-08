#!/usr/bin/env python3
"""Root-only bridge from the existing healthy Docker release to stateless K3s renderers.
Never prints environment values, kubeconfig, tokens, document paths or customer data.
"""
import base64, copy, datetime, fcntl, hashlib, ipaddress, json, os, pathlib, subprocess, sys, tempfile, time, urllib.request
ROOT=pathlib.Path('/srv/reloo/kubernetes')
STATE=pathlib.Path('/var/lib/reloo-k3s')
LIVE=pathlib.Path('/srv/reloo/apps/web')

def run(args,data=None,check=True,timeout=35):
 p=subprocess.run(args,input=data,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout)
 if check and p.returncode: raise RuntimeError('COMMAND_FAILED:'+args[0]+':'+str(p.returncode))
 return p.stdout
def inspect(name): return json.loads(run(['docker','inspect',name]))[0]
def node_address():
 value=run(['tailscale','ip','-4']).strip().splitlines()[0]
 if ipaddress.ip_address(value) not in ipaddress.ip_network('100.64.0.0/10'): raise RuntimeError('PRIVATE_NODE_REQUIRED')
 return value
def kube(args,data=None,check=True,timeout=35):
 return run(['k3s','kubectl','--server=https://'+node_address()+':6443']+args,data,check,timeout)
def apply(obj,dry=False):
 args=['apply','--server-side','--field-manager=reloo-renderer','-f','-']
 if dry: args+=['--dry-run=server']
 return kube(args,json.dumps(obj))
def material():
 stats=os.statvfs('/mnt/c')
 if stats.f_bavail*stats.f_frsize<15*1024**3: raise RuntimeError('HOST_DISK_LOW')
 app=inspect('reloo-web-app-1');gateway=inspect('reloo-vn-gateway-1')
 if app['State'].get('Health',{}).get('Status')!='healthy': raise RuntimeError('PRIMARY_NOT_HEALTHY')
 if not gateway['State']['Running']: raise RuntimeError('DATABASE_GATEWAY_NOT_RUNNING')
 common=set(app['NetworkSettings']['Networks'])&set(gateway['NetworkSettings']['Networks'])
 if not common: raise RuntimeError('PRIVATE_DOCKER_BRIDGE_REQUIRED')
 network=sorted(common)[0];address=gateway['NetworkSettings']['Networks'][network]['IPAddress']
 if ipaddress.ip_address(address) not in ipaddress.ip_network('172.16.0.0/12'): raise RuntimeError('PRIVATE_BACKEND_REQUIRED')
 networks=[]
 for name in app['NetworkSettings']['Networks']:
  for value in json.loads(run(['docker','network','inspect',name]))[0]['IPAM'].get('Config',[]):
   subnet=value.get('Subnet','')
   if subnet and ipaddress.ip_network(subnet).subnet_of(ipaddress.ip_network('172.16.0.0/12')): networks.append(subnet)
 if not networks: raise RuntimeError('PRIVATE_NETWORK_REQUIRED')
 env=dict(value.split('=',1) for value in app['Config']['Env'])
 env_hash=hashlib.sha256(json.dumps(env,sort_keys=True).encode()).hexdigest()
 image='reloo-web-app:k8s-'+app['Image'].split(':')[1][:16]
 run(['docker','image','tag',app['Image'],image])
 assets=pathlib.Path('/srv/reloo/data/web-static/_next/static');assets.mkdir(mode=0o755,parents=True,exist_ok=True)
 with open('/var/lock/reloo-renderer-assets.lock','a') as asset_lock:
  fcntl.flock(asset_lock,fcntl.LOCK_EX)
  marker=STATE/'static-image.id'
  if not marker.exists() or marker.read_text()!=app['Image']:
   run(['docker','cp','reloo-web-app-1:/app/.next/static/.',str(assets)],timeout=90)
   for directory,dirs,files in os.walk(assets):
    os.chmod(directory,0o755)
    for file in files:os.chmod(os.path.join(directory,file),0o644)
   marker.write_text(app['Image']);marker.chmod(0o600)
 # Isolated containerd avoids Kubernetes garbage collection touching Docker rollback images.
 known=run(['k3s','ctr','--namespace','k8s.io','images','list','--quiet']).splitlines()
 if not any(x==image or x.endswith('/'+image) for x in known):
  export=subprocess.Popen(['docker','image','save',image],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
  try:
   imported=subprocess.run(['k3s','ctr','--namespace','k8s.io','images','import','-'],stdin=export.stdout,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=180)
  finally: export.stdout.close()
  if export.wait()!=0 or imported.returncode: raise RuntimeError('ISOLATED_IMAGE_IMPORT_FAILED')
 resources=json.loads((ROOT/'resources-base.json').read_text())
 for item in resources['items']:
  if item['kind']=='EndpointSlice': item['endpoints'][0]['addresses']=[address]
  if item['kind']=='Deployment':
   item['spec']['template']['spec']['containers'][0]['image']=image
   item['spec']['template']['metadata']['annotations']={'reloo.vn/runtime-hash':env_hash}
  if item['kind']=='NetworkPolicy':
   item['spec']['ingress'][0]['from']=[{'ipBlock':{'cidr':node_address()+'/32'}}]+[{'ipBlock':{'cidr':x}} for x in networks]
   item['spec']['egress'][1]['to']=[{'ipBlock':{'cidr':address+'/32'}}]
 secret={'apiVersion':'v1','kind':'Secret','metadata':{'name':'reloo-renderer-runtime','namespace':'reloo','annotations':{'reloo.vn/runtime-hash':env_hash}},'type':'Opaque','data':{k:base64.b64encode(v.encode()).decode() for k,v in env.items()}}
 return resources,secret,image,env_hash
def canary():
 opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
 for path in ['/api/health','/api/db/bootstrap','/account','/explore']:
  req=urllib.request.Request('http://'+node_address()+':31080'+path,headers={'Host':'reloo.vn'})
  for attempt in range(3):
   try:
    with opener.open(req,timeout=25) as response:
     if response.status!=200: raise RuntimeError('CANARY_FAILED')
     if path=='/api/db/bootstrap':
      data=json.load(response)
      if not isinstance(data,dict) or not data.get('ok'): raise RuntimeError('BACKEND_BRIDGE_NOT_VALID')
    break
   except Exception:
    if attempt==2: raise
    time.sleep(2**attempt)
def init():
 resources,secret,image,h=material()
 apply(resources['items'][0]);apply(secret)
 apply(resources,True);apply(resources)
 kube(['rollout','status','deployment/reloo-renderer','-n','reloo','--timeout=180s'],timeout=190)
 canary()
 print('RENDERERS_READY_NO_PUBLIC_SWITCH')
def sync():
 stats=os.statvfs('/mnt/c')
 if stats.f_bavail*stats.f_frsize<10*1024**3:
  status();raise RuntimeError('HOST_DISK_LOW')
 resources,secret,image,h=material()
 deployment=json.loads(kube(['get','deployment/reloo-renderer','-n','reloo','-o','json']))
 template=deployment['spec']['template'];current=template['spec']['containers'][0]['image']
 if template['metadata'].get('annotations',{}).get('reloo.vn/runtime-hash')!=h: apply(secret)
 for obj in resources['items']:
  if obj['kind'] in ['EndpointSlice','NetworkPolicy']: apply(obj)
 if current!=image or template['metadata'].get('annotations',{}).get('reloo.vn/runtime-hash')!=h:
  patch={'spec':{'template':{'metadata':{'annotations':{'reloo.vn/runtime-hash':h}},'spec':{'containers':[{'name':'web','image':image}]}}}}
  kube(['patch','deployment/reloo-renderer','-n','reloo','--type=strategic','-p',json.dumps(patch)])
  kube(['rollout','status','deployment/reloo-renderer','-n','reloo','--timeout=180s'],timeout=190)
  canary();print('RENDERER_RELEASE_SYNCHRONIZED')
 if (STATE/'edge-enabled').exists(): edge(True)
 status()
def render_edge():
 run(['docker','exec','reloo-web-edge-1','sh','-c',"envsubst '${RELOO_EDGE_SECRET}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -t && nginx -s reload"])
def edge(enable):
 expected=json.loads((ROOT/'edge-metadata.json').read_text())
 path=LIVE/'deploy/edge.conf.template';original=path.read_text().replace('\r\n','\n');h=hashlib.sha256(original.encode()).hexdigest()
 target=(ROOT/('edge-enabled.template' if enable else 'edge-before.template')).read_text()
 allowed={expected['originalSha256'],expected.get('previousEnabledSha256'),hashlib.sha256((ROOT/'edge-before.template').read_bytes()).hexdigest(),hashlib.sha256((ROOT/'edge-enabled.template').read_bytes()).hexdigest()}
 if h not in allowed: raise RuntimeError('EDGE_CHANGED_REQUIRES_REVIEW')
 if original==target: return
 if enable:
  canary()
  deployment=json.loads(kube(['get','deployment/reloo-renderer','-n','reloo','-o','json']))
  if deployment.get('status',{}).get('availableReplicas',0)<2: raise RuntimeError('TWO_READY_REPLICAS_REQUIRED')
  hpa=json.loads(kube(['get','hpa/reloo-renderer','-n','reloo','-o','json']))
  if not any(c.get('type')=='ScalingActive' and c.get('status')=='True' for c in hpa.get('status',{}).get('conditions',[])): raise RuntimeError('AUTOSCALER_METRICS_REQUIRED')
 with open('/var/lock/reloo-release.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  maintenance=pathlib.Path('/var/lib/reloo-recovery/maintenance');maintenance.touch()
  try:
   path.write_text(target);render_edge()
   for url in ['https://reloo.vn/api/health','https://reloo.vn/account','https://crm.reloo.vn/crm']:
    code=run(['curl','--max-time','20','-sS','-o','/dev/null','-w','%{http_code}',url]).strip()
    if code!='200': raise RuntimeError('PUBLIC_CHECK_FAILED')
  except Exception:
   path.write_text(original);render_edge();raise
  finally: maintenance.unlink(missing_ok=True)
 if enable: (STATE/'edge-enabled').touch()
 else: (STATE/'edge-enabled').unlink(missing_ok=True)
 print('KUBERNETES_PAGE_ROUTING_ENABLED' if enable else 'COMPOSE_ROUTING_RESTORED')
def status():
 pods=json.loads(kube(['get','pods','-n','reloo','-l','app=reloo-renderer','-o','json']))['items']
 hpa=json.loads(kube(['get','hpa/reloo-renderer','-n','reloo','-o','json']))
 deployment=json.loads(kube(['get','deployment/reloo-renderer','-n','reloo','-o','json']))
 stats=os.statvfs('/mnt/c');free=stats.f_bavail*stats.f_frsize
 kube(['taint','node','reloo-homelab-01','reloo.vn/host-disk-low=true:NoSchedule','--overwrite'] if free<10*1024**3 else ['taint','node','reloo-homelab-01','reloo.vn/host-disk-low-'],check=False)
 report={'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'singlePhysicalHost':True,'publicPageRouting':(STATE/'edge-enabled').exists(),'scope':'GET/HEAD pages; API, upload and sockets retain existing Docker backend','hostDiskFreeGiB':round(free/1024**3,1),'pods':[{'name':p['metadata']['name'],'phase':p['status']['phase'],'ready':any(c['type']=='Ready' and c['status']=='True' for c in p['status'].get('conditions',[])),'restarts':sum(c.get('restartCount',0) for c in p['status'].get('containerStatuses',[]))} for p in pods],'autoscaler':{**hpa.get('status',{}),'desiredReplicas':deployment['spec']['replicas'],'maxReplicas':hpa['spec']['maxReplicas']}}
 path=STATE/'status.json'
 with tempfile.NamedTemporaryFile(mode='w',prefix='status-',dir=STATE,delete=False) as file:
  json.dump(report,file,indent=2);temporary=file.name
 os.replace(temporary,path);path.chmod(0o600)
 print(json.dumps(report))
if __name__=='__main__':
 try:
  {'init':init,'sync':sync,'canary':canary,'status':status,'edge-enable':lambda:edge(True),'edge-disable':lambda:edge(False)}[sys.argv[1]]()
 except Exception as e:
  # Do not serialize subprocess stderr, env objects or the exception response body.
  print('RELOO_KUBERNETES_FAILED:'+type(e).__name__,file=sys.stderr);sys.exit(1)
