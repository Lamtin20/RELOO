import subprocess,json,pathlib,shutil,time,urllib.request
root=pathlib.Path('/srv/reloo/capacity-test');samples=[];failed=0;stop=None
names=['reloo-capacity-generator','reloo-capacity-app','reloo-capacity-renderer-1','reloo-capacity-renderer-2','reloo-capacity-rest','reloo-capacity-auth','reloo-vn-db-1','reloo-web-app-1','reloo-web-worker-1','reloo-web-news-ai-1','reloo-web-ai-1']
while True:
 mem={p[0].strip(':'):int(p[1]) for p in (x.split() for x in pathlib.Path('/proc/meminfo').read_text().splitlines())};available=mem['MemAvailable']//1024;disk=shutil.disk_usage('/mnt/c').free
 status=None
 try:status=urllib.request.urlopen('http://127.0.0.1:3000/api/health',timeout=5).status
 except:pass
 failed=failed+1 if status!=200 else 0
 stats=subprocess.run(['docker','stats','--no-stream','--format','{{json .}}']+names,capture_output=True,text=True).stdout
 samples.append({'at':time.time(),'availableMiB':available,'swapFreeMiB':mem['SwapFree']//1024,'diskCFree':disk,'productionHealth':status,'cpu':pathlib.Path('/proc/stat').read_text().splitlines()[0],'stats':stats})
 if available<1800:stop='RAM guard'
 if disk<15*1024**3:stop='Disk guard'
 if failed>=3:stop='Production health guard'
 if stop:subprocess.run(['docker','stop','-t','5','reloo-capacity-generator'],capture_output=True)
 state=subprocess.run(['docker','inspect','--format','{{.State.Running}}','reloo-capacity-generator'],capture_output=True,text=True).stdout.strip()
 (root/'origin-monitor.json').write_text(json.dumps({'samples':samples,'stopReason':stop},indent=2))
 completed='"event":"complete"' in subprocess.run(['docker','logs','--tail','1','reloo-capacity-generator'],capture_output=True,text=True).stdout
 if state!='true' or completed:break
 time.sleep(8)
print(json.dumps({'samples':len(samples),'stopReason':stop}))
