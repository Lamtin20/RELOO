import json,subprocess,pathlib
root=pathlib.Path('/srv/reloo/capacity-test')
def run(a):return subprocess.check_output(a,text=True)
def inspect(n):return json.loads(run(['docker','inspect',n]))[0]
def env(n):return dict(x.split('=',1) for x in inspect(n)['Config']['Env'])
def container(name,image,e,more=[]):
 p=root/(name+'.env');p.write_text('\n'.join(k+'='+v for k,v in e.items())+'\n');p.chmod(0o600)
 run(['docker','run','-d','--name',name,'--label','reloo.capacity-test=true','--network','reloo-capacity-test','--security-opt','no-new-privileges','--cap-drop','ALL','--env-file',str(p)]+more+[image])
for name in ['reloo-capacity-app','reloo-capacity-rest']:
 assert inspect(name)['Config']['Labels'].get('reloo.capacity-test')=='true','Sandbox label mismatch'
e=env('reloo-capacity-app');e['RELOO_DATA_REGION']='VN';image=inspect('reloo-capacity-app')['Image'];r=env('reloo-vn-rest-1');previous=env('reloo-capacity-rest');r['PGRST_DB_URI']=previous['PGRST_DB_URI'];r['PGRST_JWT_SECRET']=previous['PGRST_JWT_SECRET'];restImage=inspect('reloo-capacity-rest')['Config']['Image']
run(['docker','rm','-f','reloo-capacity-app','reloo-capacity-rest'])
container('reloo-capacity-rest',restImage,r,['--memory','512m'])
def app(name,renderer=False):
 opts=['--memory','1g' if renderer else '2g','--read-only','--tmpfs','/tmp:rw,size=256m,uid=1000,gid=1000','--tmpfs','/app/.next/cache:rw,size=128m,uid=1000,gid=1000','--tmpfs','/public-media:rw,size=128m,uid=1000,gid=1000']
 if renderer:opts+=['--cpus','1']
 container(name,image,e,opts)
app('reloo-capacity-app');app('reloo-capacity-renderer-1',True);app('reloo-capacity-renderer-2',True)
conf=root/'edge.conf';conf.write_text('pid /tmp/nginx.pid; events {} http { client_body_temp_path /tmp/client_temp; proxy_temp_path /tmp/proxy_temp; fastcgi_temp_path /tmp/fcgi_temp; uwsgi_temp_path /tmp/uwsgi_temp; scgi_temp_path /tmp/scgi_temp; upstream pages { server reloo-capacity-renderer-1:3000; server reloo-capacity-renderer-2:3000; keepalive 32; } server { listen 8080; client_max_body_size 4m; location /api/ { proxy_http_version 1.1; proxy_set_header Connection ""; proxy_pass http://reloo-capacity-app:3000; } location /socket.io/ { proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_pass http://reloo-capacity-app:3000; } location / { proxy_http_version 1.1; proxy_set_header Connection ""; proxy_pass http://pages; } } }')
container('reloo-capacity-edge',inspect('reloo-k3s-static')['Config']['Image'],{},['--user','101:101','--memory','128m','--mount','type=bind,src='+str(conf)+',dst=/etc/nginx/nginx.conf,readonly'])
print(json.dumps({'ready':True,'renderers':2,'rendererCpuLimit':1,'rendererMiBLimit':1024,'backendMiBLimit':2048,'apiTraceLogging':True,'restPool':'same configuration as production; no test override','autoScaling':'not emulated; fixed 2 renderer replicas','externalProviders':'disabled by network isolation/no worker'}))
