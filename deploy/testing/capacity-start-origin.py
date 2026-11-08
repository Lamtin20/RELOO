import pathlib,subprocess,json,os
root=pathlib.Path('/srv/reloo/capacity-test')
levels=[int(v) for v in os.environ.get('CAPACITY_LEVELS','25,50,100,200,300,500').split(',')]
seconds=int(os.environ.get('CAPACITY_SECONDS','60'))
if not levels or any(v<1 or v>1000 for v in levels) or seconds<15 or seconds>600:raise RuntimeError('Invalid bounded test configuration')
def run(a):return subprocess.check_output(a,text=True)
image=json.loads(run(['docker','inspect','reloo-capacity-app']))[0]['Image']
command=['docker','run','-d','--name','reloo-capacity-generator','--label','reloo.capacity-test=true','--network','reloo-capacity-test','--user','0:0','--no-healthcheck','--security-opt','no-new-privileges','--cap-drop','ALL','--read-only','--memory','512m','--cpus','1','--entrypoint','node','--env','CAPACITY_LEVELS='+os.environ.get('CAPACITY_LEVELS','25,50,100,200,300,500'),'--env','CAPACITY_SECONDS='+os.environ.get('CAPACITY_SECONDS','60'),'--log-opt','max-size=5m','--log-opt','max-file=1']
for src,dest in [('capacity-origin.mjs','/capacity-origin.mjs'),('users.json','/users.json'),('listing.json','/listing.json')]:command+=['--mount','type=bind,src='+str(root/src)+',dst='+dest+',readonly']
command +=[image,'/capacity-origin.mjs']
print(run(command).strip())
