#!/usr/bin/env python3
"""Root-only fixed-target collector; never exports Docker env, logs or user data."""
import datetime, json, os, shutil, subprocess, time, urllib.request, urllib.error
from pathlib import Path

CONTAINERS = {'web':'reloo-web-app-1','worker':'reloo-web-worker-1','tunnel':'reloo_cloudflared','database':'reloo-vn-db-1','auth':'reloo-vn-auth-1','storage':'reloo-vn-storage-1','rest':'reloo-vn-rest-1','edge':'reloo-web-edge-1','browser':'reloo-web-browser-1','kyc':'reloo-web-kyc-1','localAI':'reloo-web-ai-1','localNewsAI':'reloo-web-news-ai-1','redis':'reloo_redis','monitoring':'reloo_prometheus'}

def cpu():
    with open('/proc/stat', encoding='ascii') as file:
        values = list(map(int, file.readline().split()[1:]))
    return sum(values[:8]), values[3] + values[4]

def collect():
    now = datetime.datetime.now(datetime.timezone.utc)
    first = cpu(); time.sleep(0.25); second = cpu()
    total, idle = second[0]-first[0], second[1]-first[1]
    with open('/proc/meminfo', encoding='ascii') as file:
        memory = {line.split(':')[0]:int(line.split()[1])*1024 for line in file}
    disk = shutil.disk_usage('/srv/reloo')
    result = {'scope':'LINUX_SERVER','cpuPercent':round(100*(1-idle/total),1) if total else None,'memoryTotalMb':round(memory['MemTotal']/1048576),'memoryUsedMb':round((memory['MemTotal']-memory['MemAvailable'])/1048576),'diskTotalGb':round(disk.total/1073741824,1),'diskUsedGb':round(disk.used/1073741824,1),'containers':[]}
    try: result['hostDiskFreeGb'] = round(shutil.disk_usage('/mnt/c').free/1073741824,1)
    except OSError: result['hostDiskFreeGb'] = None
    try:
        path=Path('/var/lib/reloo-k3s/status.json')
        if path.stat().st_size > 32768: raise ValueError('SNAPSHOT_TOO_LARGE')
        k=json.loads(path.read_text()); hpa=k.get('autoscaler',{}); pods=k.get('pods',[])[:16]
        result['kubernetes']={'observedAt':k.get('observedAt'),'readyPods':sum(p.get('ready') is True for p in pods),'totalPods':len(pods),'desiredReplicas':hpa.get('desiredReplicas'),'maxReplicas':hpa.get('maxReplicas'),'autoscalingActive':any(c.get('type')=='ScalingActive' and c.get('status')=='True' for c in hpa.get('conditions',[])),'publicPageRouting':k.get('publicPageRouting') is True,'singlePhysicalHost':k.get('singlePhysicalHost') is True}
    except (OSError,ValueError,TypeError,AttributeError): result['kubernetes'] = None
    for key, name in CONTAINERS.items():
        try:
            p = subprocess.run(['docker','inspect','--format','{{json .State}}|{{.RestartCount}}',name],capture_output=True,text=True,timeout=3,check=True)
            raw, restarts = p.stdout.strip().rsplit('|',1); state = json.loads(raw)
            status = state.get('Status'); health = state.get('Health',{}).get('Status')
            result['containers'].append({'id':key,'status':status if status in ('running','exited','restarting','paused','created','dead') else 'unknown','health':health if health in ('healthy','unhealthy','starting') else None,'restarts':int(restarts)})
        except (subprocess.SubprocessError,ValueError,KeyError):
            result['containers'].append({'id':key,'status':'unknown','health':None,'restarts':None})
    try:
        request = urllib.request.Request('https://reloo.vn/api/health',headers={'User-Agent':'RELOO-Operations/1.0 (+https://reloo.vn)'})
        with urllib.request.urlopen(request,timeout=6) as response:
            result['publicHttpStatus'] = response.status
    except urllib.error.HTTPError as error:
        result['publicHttpStatus'] = error.code
    except Exception:
        result['publicHttpStatus'] = None
    # Only bounded, generated operational primitives go into SQL, never inspect payloads.
    payload = json.dumps(result,separators=(',',':')).replace("'","''")
    sql = "update public.operations_heartbeats set observations='"+payload+"'::jsonb,observed_at=now() where id='operations';"
    subprocess.run(['docker','exec','-i','reloo-vn-db-1','psql','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],input=sql,text=True,capture_output=True,timeout=10,check=True)
    print(json.dumps({'collectedAt':now.isoformat(),'containerCount':len(result['containers']),'status':'STORED'}))

if __name__ == '__main__':
    if os.geteuid() != 0: raise SystemExit('ROOT_REQUIRED')
    collect()
