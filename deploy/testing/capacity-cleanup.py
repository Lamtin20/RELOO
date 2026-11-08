"""Remove only the named synthetic capacity sandbox; never customer rows/databases."""
import subprocess,json,pathlib,shutil
names=['reloo-capacity-generator','reloo-capacity-edge','reloo-capacity-renderer-1','reloo-capacity-renderer-2','reloo-capacity-app','reloo-capacity-gateway','reloo-capacity-auth','reloo-capacity-rest']
def run(a,check=True):return subprocess.run(a,check=check,capture_output=True,text=True)
for name in names:
 p=run(['docker','inspect',name],False)
 if not p.returncode:
  c=json.loads(p.stdout)[0]
  if c['Config']['Labels'].get('reloo.capacity-test')!='true':raise RuntimeError('Sandbox label mismatch: '+name)
  run(['docker','rm','-f',name])
run(['docker','network','disconnect','reloo-capacity-test','reloo-vn-db-1'],False)
run(['docker','network','rm','reloo-capacity-test'],False)
run(['docker','exec','reloo-vn-db-1','dropdb','-U','postgres','--if-exists','reloo_capacity_20261018'])
root=pathlib.Path('/srv/reloo/capacity-test')
for name in names:
 (root/(name+'.env')).unlink(missing_ok=True)
(root/'users.json').unlink(missing_ok=True)
(root/'nginx.conf').unlink(missing_ok=True)
(root/'edge.conf').unlink(missing_ok=True)
(root/'listing.json').unlink(missing_ok=True)
media=root/'media'
if media.exists():
 if media.is_symlink() or media.resolve()!=pathlib.Path('/srv/reloo/capacity-test/media'):raise RuntimeError('Unsafe media cleanup path')
 shutil.rmtree(media)
print(json.dumps({'sandboxRemoved':True,'testDatabaseRemoved':True,'ephemeralCredentialsRemoved':True}))
