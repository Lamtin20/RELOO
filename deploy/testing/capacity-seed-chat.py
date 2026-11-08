import subprocess
q="update assets a set owner_id='capacity-user-'||(g.i*2+1) from generate_series(0,99) g(i) where a.id='capacity-asset-'||(g.i+2); insert into chat_threads(id,lender_id,buyer_id,listing_id) select 'capacity-pair-'||g,'capacity-user-'||(g*2+1),'capacity-user-'||(g*2+2),'capacity-asset-'||(g+2) from generate_series(0,99) g on conflict do nothing;"
p=subprocess.run(['docker','exec','-i','reloo-vn-db-1','psql','-v','ON_ERROR_STOP=1','-U','postgres','-d','reloo_capacity_20261018'],input=q,text=True,capture_output=True)
print(p.stdout,p.stderr);assert p.returncode==0
