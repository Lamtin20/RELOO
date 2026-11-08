"""Give the isolated soak test a persistent media directory, like production."""
import subprocess,pathlib,json,time
root=pathlib.Path('/srv/reloo/capacity-test');media=root/'media'
def run(a):return subprocess.check_output(a,text=True)
c=json.loads(run(['docker','inspect','reloo-capacity-app']))[0]
assert c['Config']['Labels'].get('reloo.capacity-test')=='true'
assert media.resolve()==pathlib.Path('/srv/reloo/capacity-test/media') and not media.is_symlink()
media.mkdir(mode=0o750,exist_ok=True)
copy=subprocess.Popen(['docker','exec','reloo-capacity-app','tar','-C','/public-media','-cf','-','.'],stdout=subprocess.PIPE)
extract=subprocess.run(['tar','-xf','-','-C',str(media)],stdin=copy.stdout,capture_output=True)
copy.stdout.close()
if copy.wait() or extract.returncode:raise RuntimeError('Failed to preserve sandbox tmpfs media')
run(['chown','-R','1000:1000',str(media)])
e=dict(x.split('=',1) for x in c['Config']['Env']);f=root/'reloo-capacity-app.env';f.write_text('\n'.join(k+'='+v for k,v in e.items())+'\n');f.chmod(0o600)
run(['docker','rm','-f','reloo-capacity-app'])
run(['docker','run','-d','--name','reloo-capacity-app','--label','reloo.capacity-test=true','--network','reloo-capacity-test','--security-opt','no-new-privileges','--cap-drop','ALL','--env-file',str(f),'--memory','2g','--read-only','--tmpfs','/tmp:rw,size=256m,uid=1000,gid=1000','--tmpfs','/app/.next/cache:rw,size=128m,uid=1000,gid=1000','--mount','type=bind,src='+str(media)+',dst=/public-media',c['Image']])
for i in range(30):
 p=subprocess.run(['docker','exec','reloo-capacity-app','node','-e',"fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],capture_output=True)
 if not p.returncode:break
 time.sleep(1)
else:raise RuntimeError('Sandbox backend did not become ready')
run(['docker','restart','reloo-capacity-edge'])
print(json.dumps({'persistentTestMedia':True,'filesPreserved':len(list(media.iterdir())),'productionMediaUntouched':True}))
