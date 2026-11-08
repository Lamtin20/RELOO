import subprocess,json,pathlib,secrets,time,urllib.parse,hmac,hashlib,base64,uuid
ROOT=pathlib.Path('/srv/reloo/capacity-test');ROOT.mkdir(mode=0o700,exist_ok=True)
DB='reloo_capacity_20261018';NET='reloo-capacity-test'
def run(a,input=None,check=True):
 p=subprocess.run(a,input=input,text=True,capture_output=True)
 if check and p.returncode: raise RuntimeError('Command failed: '+a[0]+' '+p.stderr[-900:])
 return p.stdout
def inspect(n):return json.loads(run(['docker','inspect',n]))[0]
def env(n):return dict(x.split('=',1) for x in inspect(n)['Config']['Env'])
def dbsql(q,d=DB):return run(['docker','exec','-i','reloo-vn-db-1','psql','-v','ON_ERROR_STOP=1','-U','postgres','-d',d,'-At'],q)
if dbsql("select count(*) from pg_database where datname='"+DB+"'",'postgres').strip()!='0': raise RuntimeError('TEST_DATABASE_ALREADY_EXISTS')
dbsql('create database '+DB+';','postgres')
schema=run(['docker','exec','reloo-vn-db-1','pg_dump','-U','postgres','-d','postgres','--schema-only'])
run(['docker','exec','-i','reloo-vn-db-1','psql','-v','ON_ERROR_STOP=1','-U','postgres','-d',DB],schema)
migrations=run(['docker','exec','reloo-vn-db-1','pg_dump','-U','postgres','-d','postgres','--data-only','--table=auth.schema_migrations'])
run(['docker','exec','-i','reloo-vn-db-1','psql','-v','ON_ERROR_STOP=1','-U','postgres','-d',DB],migrations)
if dbsql("select count(*) from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','PUBLIC')").strip()!='0':raise RuntimeError('Unsafe schema grants; stop before serving sandbox')
run(['docker','network','create','--internal',NET]);run(['docker','network','connect',NET,'reloo-vn-db-1'])
secret=secrets.token_hex(32)
def jwt(payload):
 enc=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).decode().rstrip('=')
 s=enc({'alg':'HS256','typ':'JWT'})+'.'+enc(payload)
 return s+'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(),s.encode(),hashlib.sha256).digest()).decode().rstrip('=')
keys={r:jwt({'role':r,'iss':'supabase','iat':int(time.time()),'exp':int(time.time())+14400}) for r in ['anon','service_role']}
def dburl(s):
 u=urllib.parse.urlsplit(s);return urllib.parse.urlunsplit((u.scheme,u.netloc.rsplit('@',1)[0]+'@reloo-vn-db-1:5432','/'+DB,u.query,u.fragment))
def container(name,image,e,extra=[]):
 f=ROOT/(name+'.env');f.write_text('\n'.join(k+'='+str(v) for k,v in e.items())+'\n');f.chmod(0o600)
 return run(['docker','run','-d','--name',name,'--label','reloo.capacity-test=true','--network',NET,'--security-opt','no-new-privileges','--cap-drop','ALL','--memory','512m','--env-file',str(f)]+extra+[image])
r=env('reloo-vn-rest-1');r['PGRST_DB_URI']=dburl(r['PGRST_DB_URI']);r['PGRST_JWT_SECRET']=secret
container('reloo-capacity-rest',inspect('reloo-vn-rest-1')['Config']['Image'],r)
a=env('reloo-vn-auth-1');a={k:v for k,v in a.items() if not any(s in k for s in ['SMTP','EXTERNAL_GOOGLE'])};a.update(GOTRUE_DB_DATABASE_URL=dburl(a['GOTRUE_DB_DATABASE_URL']),GOTRUE_JWT_SECRET=secret,GOTRUE_EXTERNAL_GOOGLE_ENABLED='false',GOTRUE_MAILER_AUTOCONFIRM='true',GOTRUE_SMTP_HOST='',GOTRUE_SITE_URL='http://localhost:4538',API_EXTERNAL_URL='http://reloo-capacity-gateway',GOTRUE_JWT_ISSUER='http://reloo-capacity-gateway/auth/v1')
container('reloo-capacity-auth',inspect('reloo-vn-auth-1')['Config']['Image'],a)
conf=ROOT/'nginx.conf';conf.write_text('pid /tmp/nginx.pid; events {}\nhttp { client_body_temp_path /tmp/client_temp; proxy_temp_path /tmp/proxy_temp; fastcgi_temp_path /tmp/fcgi_temp; uwsgi_temp_path /tmp/uwsgi_temp; scgi_temp_path /tmp/scgi_temp; server { listen 8080; location /rest/v1/ { proxy_pass http://reloo-capacity-rest:3000/; } location /auth/v1/ { proxy_pass http://reloo-capacity-auth:9999/; } } }')
container('reloo-capacity-gateway',inspect('reloo-k3s-static')['Config']['Image'],{},['--user','101:101','--mount','type=bind,src='+str(conf)+',dst=/etc/nginx/nginx.conf,readonly'])
e={'NODE_ENV':'production','HOSTNAME':'0.0.0.0','PORT':'3000','APP_ORIGIN':'http://localhost:4538','TRUST_PROXY':'false','SUPABASE_INTERNAL_URL':'http://reloo-capacity-gateway:8080','SUPABASE_SERVICE_ROLE_KEY':keys['service_role'],'SUPABASE_SECRET_KEY':keys['service_role'],'SUPABASE_PUBLISHABLE_KEY':keys['anon'],'NEXT_PUBLIC_SUPABASE_ANON_KEY':keys['anon'],'NEXT_PUBLIC_SUPABASE_URL':'http://reloo-capacity-gateway:8080','RELOO_PRIVATE_DATA_KEY':secrets.token_hex(32),'RELOO_MEDIA_DIR':'/public-media','RELOO_CALENDAR_ENABLED':'false'}
container('reloo-capacity-app',inspect('reloo-web-app-1')['Image'],e,['--memory','2g','--read-only','--tmpfs','/tmp:rw,size=256m,uid=1000,gid=1000','--tmpfs','/app/.next/cache:rw,size=128m,uid=1000,gid=1000','--tmpfs','/public-media:rw,size=128m,uid=1000,gid=1000','-p','127.0.0.1:4538:3000'])
# Synthetic accounts: no signup/email, no copied customer records. Auth still validates JWT through real GoTrue.
users=[]
for i in range(201):
 uid=str(uuid.uuid4());pid='capacity-user-'+str(i);email='capacity-'+str(i)+'@example.invalid'
 dbsql("insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values ('"+uid+"','00000000-0000-0000-0000-000000000000','authenticated','authenticated','"+email+"',now(),now(),now(),'{\"provider\":\"email\",\"providers\":[\"email\"]}','{}'); insert into profiles(id,auth_user_id,email,name,phone,role,activation_status,phone_screening_status,screening_valid_until) values ('"+pid+"','"+uid+"','"+email+"','CAPACITY TEST', '090'||lpad('"+str(i)+"',7,'0'),'both','ACTIVE','NO_MATCH',now()+interval '1 day');")
 users.append({'id':pid,'token':jwt({'sub':uid,'aud':'authenticated','role':'authenticated','email':email,'iat':int(time.time()),'exp':int(time.time())+14400})})
dbsql("insert into assets(id,owner_id,title,description,category,daily_price,market_value,images,location,specs) select 'capacity-asset-'||g,'capacity-user-0','CAPACITY TEST product '||g,'Synthetic capacity test only','camping',50000,1000000,'[]','TEST','{\"brand\":\"Test\",\"capacity\":\"4\",\"weight\":\"2 kg\",\"weather\":\"Test\",\"included\":\"Test\"}' from generate_series(1,1000) g; insert into chat_threads(id,lender_id,buyer_id,listing_id) select 'capacity-thread-'||g,'capacity-user-0','capacity-user-'||g,'capacity-asset-1' from generate_series(1,200) g;")
dbsql("update auth.users set confirmation_token='',recovery_token='',email_change_token_new='',email_change='',phone_change='',phone_change_token='',email_change_token_current='',reauthentication_token='',encrypted_password='';")
(ROOT/'users.json').write_text(json.dumps(users));(ROOT/'users.json').chmod(0o600)
print(json.dumps({'ready':True,'database':DB,'users':len(users),'assets':1000,'isolation':'internal Docker network; synthetic-only database; no worker or external providers','port':'loopback 4538'}))

