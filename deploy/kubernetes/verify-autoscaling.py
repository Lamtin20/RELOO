#!/usr/bin/env python3
"""Prove HPA with at most 0.2 CPU in an isolated namespace, without app secrets."""
import json, subprocess, time
import reconcile as r
name='reloo-hpa-validation';meta=lambda n:{'name':n,'namespace':name}
_,_,image,_=r.material();labels={'app':'hpa-validation'}
probe={'apiVersion':'apps/v1','kind':'Deployment','metadata':meta('probe'),'spec':{'replicas':1,'selector':{'matchLabels':labels},'template':{'metadata':{'labels':labels},'spec':{'automountServiceAccountToken':False,'nodeSelector':{'reloo.vn/renderer-enabled':'true'},'securityContext':{'runAsNonRoot':True,'runAsUser':1000,'runAsGroup':1000,'seccompProfile':{'type':'RuntimeDefault'}},'containers':[{'name':'probe','image':image,'imagePullPolicy':'Never','command':['node','-e',"require('node:http').createServer((q,s)=>s.end('ok')).listen(8080,'0.0.0.0')"],'securityContext':{'readOnlyRootFilesystem':True,'allowPrivilegeEscalation':False,'capabilities':{'drop':['ALL']}},'resources':{'requests':{'cpu':'20m','memory':'64Mi'},'limits':{'cpu':'100m','memory':'128Mi'}},'readinessProbe':{'httpGet':{'path':'/','port':8080},'periodSeconds':2}}]}}}}
hpa={'apiVersion':'autoscaling/v2','kind':'HorizontalPodAutoscaler','metadata':meta('probe'),'spec':{'scaleTargetRef':{'apiVersion':'apps/v1','kind':'Deployment','name':'probe'},'minReplicas':1,'maxReplicas':2,'metrics':[{'type':'Resource','resource':{'name':'cpu','target':{'type':'Utilization','averageUtilization':50}}}],'behavior':{'scaleUp':{'stabilizationWindowSeconds':0},'scaleDown':{'stabilizationWindowSeconds':30}}}}
result={'isolatedNamespace':name,'maxCpuTotal':'200m','usesCustomerData':False,'scaleUp':False,'scaleDown':False};load=None
try:
 r.apply({'apiVersion':'v1','kind':'Namespace','metadata':{'name':name,'labels':{'pod-security.kubernetes.io/enforce':'restricted'}}})
 r.apply({'apiVersion':'networking.k8s.io/v1','kind':'NetworkPolicy','metadata':meta('deny-all'),'spec':{'podSelector':{},'policyTypes':['Ingress','Egress']}})
 r.apply(probe);r.apply(hpa);r.kube(['rollout','status','deployment/probe','-n',name,'--timeout=90s'],timeout=100)
 pod=json.loads(r.kube(['get','pods','-n',name,'-o','json']))['items'][0]['metadata']['name']
 code="const until=Date.now()+110000;function tick(){const end=Date.now()+25;while(Date.now()<end)Math.sqrt(Math.random());if(Date.now()<until)setTimeout(tick,25)}tick()"
 load=subprocess.Popen(['k3s','kubectl','--server=https://'+r.node_address()+':6443','exec','-n',name,pod,'--','node','-e',code],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 print('ISOLATED_HPA_CPU_PROBE_STARTED',flush=True)
 start=time.monotonic()
 while time.monotonic()-start<180:
  observed=json.loads(r.kube(['get','hpa/probe','-n',name,'-o','json']))['status']
  if observed.get('desiredReplicas',1)>=2 and observed.get('currentReplicas',1)>=2:result['scaleUp']=True;print('HPA_SCALED_1_TO_2',flush=True);break
  time.sleep(5)
 if not result['scaleUp']:raise RuntimeError('SCALE_UP_NOT_OBSERVED')
 load.wait(timeout=130)
 start=time.monotonic()
 while time.monotonic()-start<180:
  observed=json.loads(r.kube(['get','hpa/probe','-n',name,'-o','json']))['status']
  if observed.get('desiredReplicas')==1 and observed.get('currentReplicas')==1:result['scaleDown']=True;print('HPA_SCALED_2_TO_1',flush=True);break
  time.sleep(5)
 result['passed']=result['scaleUp'] and result['scaleDown']
 (r.STATE/'autoscaling-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
finally:
 if load and load.poll() is None:load.terminate()
 r.kube(['delete','namespace',name,'--wait=false'],check=False)
