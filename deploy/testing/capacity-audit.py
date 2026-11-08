import subprocess,json,urllib.request,pathlib
def run(a,input=None):return subprocess.check_output(a,text=True,input=input)
q="select json_build_object('profiles',(select count(*) from profiles),'assets',(select count(*) from assets),'createdListings',(select count(*) from assets where id not like 'capacity-asset-%'),'messages',(select count(*) from chat_messages),'media',(select count(*) from media_assets),'nonSyntheticProfiles',(select count(*) from profiles where email not like '%@example.invalid'),'unsafeAnonGrants',(select count(*) from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','PUBLIC')));"
counts=json.loads(run(['docker','exec','-i','reloo-vn-db-1','psql','-U','postgres','-d','reloo_capacity_20261018','-At'],q).strip())
ip=json.loads(run(['docker','inspect','reloo-capacity-app']))[0]['NetworkSettings']['Networks']['reloo-capacity-test']['IPAddress']
html=urllib.request.urlopen('http://'+ip+':3000/product/capacity-asset-1').read().decode()
counts.update(productRenderedActualTitle='CAPACITY TEST product 1' in html,productionHealthStatus=urllib.request.urlopen('http://127.0.0.1:3000/api/health').status)
counts['soakMediaFilesOnDisk']=len(list(pathlib.Path('/srv/reloo/capacity-test/media').glob('*.webp')))
counts['forbiddenProbeMessages']=int(run(['docker','exec','reloo-vn-db-1','psql','-U','postgres','-d','reloo_capacity_20261018','-Atc',"select count(*) from chat_messages where body='MUST NOT BE SAVED'"]).strip())
print(json.dumps(counts))
