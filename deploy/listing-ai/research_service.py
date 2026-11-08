"""RELOO public-product research: pinned Agent-Reach WebChannel only.
No installer/setup/session/browser/LLM command is exposed by this process.
"""
import datetime,hashlib,hmac,json,os,re,threading,time
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from agent_reach.channels.web import WebChannel

POLICY=json.loads(Path(__file__).with_name('manufacturer-policy.json').read_text())
TOKEN=os.environ.get('RELOO_PRODUCT_RESEARCH_TOKEN','')
if len(TOKEN)<32:raise RuntimeError('Research token must be configured')
SLOT=threading.BoundedSemaphore(1);CACHE={};CHANNEL=WebChannel()
def normalized(value):return re.sub(r'[^a-z0-9]','',str(value).lower())
def model_present(model,value):
 tokens=re.findall(r'[a-z0-9]+',str(model).lower())
 return bool(tokens) and re.search(r'(?<![a-z0-9])'+r'[^a-z0-9]*'.join(tokens)+r'(?![a-z0-9])',str(value).lower()) is not None
def identity(value):
 brand=value.get('brand');model=value.get('model');category=value.get('category')
 if brand not in POLICY['brands'] or category not in POLICY['categories'] or not isinstance(model,str) or not 1<=len(model)<=80:raise ValueError('IDENTITY_INVALID')
 if not re.fullmatch(r'[\w ._()+/−-]+',model) or re.search(r'(?i)https?|www|token|password|otp|(?:\d[ .-]?){9}',model):raise ValueError('IDENTITY_INVALID')
 if any(other!=brand and re.search(r'(?i)(?<!\w)'+re.escape(other)+r'(?!\w)',model) for other in POLICY['brands']):raise ValueError('IDENTITY_INVALID')
 if brand in ['Marshall','Bose','JBL'] and category not in ['am-thanh','dien-tu']:raise ValueError('IDENTITY_INVALID')
 if re.match(r'(?i)^(Acton|Stanmore|Woburn|Kilburn|Stockwell|Emberton|Middleton|Tufton)(\s|$)',model) and brand!='Marshall':raise ValueError('IDENTITY_INVALID')
 if not re.search(r'\d',model) and not re.fullmatch(r'(?i)((Acton|Stanmore|Woburn|Kilburn|Stockwell|Emberton|Willen|Middleton|Tufton|Major|Minor|Monitor|Motif)( [IVX]+)?|switch( oled| lite)?|steam deck( oled)?|xbox series [xs])',model):raise ValueError('IDENTITY_INVALID')
 return brand,model
def official(url,brand=None):
 try:
  p=urlsplit(url);host=p.hostname or ''
  if len(url)>1000 or p.scheme!='https' or p.username or p.password or p.port not in (None,443):return False
  return any(host==d or host.endswith('.'+d) for d in (POLICY['brandHosts'].get(brand,[]) if brand else POLICY['hosts']))
 except (TypeError,ValueError):return False
def lookup(value):
 brand,model=identity(value);key=hashlib.sha256((brand+'\0'+model).encode()).hexdigest();old=CACHE.get(key)
 if old and old[0]>time.monotonic():return old[1]
 query=brand+' '+model+' official product specifications'
 rows=CHANNEL._exa_search(query=query,limit=5,timeout=10);sources=[]
 for row in rows:
  url=row.get('url')
  if not isinstance(url,str) or not official(url,brand):continue
  try:
   items=CHANNEL._jina_read(target=url,timeout=8);item=items[0] if items else {};text=str(item.get('text') or '')[:18000]
   # Exact compact model presence is mandatory; no general homepage-as-evidence.
   if not model_present(model,str(item.get('title') or '')+' '+text):continue
   sources.append({'url':url,'title':str(item.get('title') or row.get('title') or brand)[:180],'text':text[:7000],'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
  except Exception:continue
  if len(sources)==2:break
 result={'sources':sources,'provider':'Agent-Reach/public-web','status':'SOURCES_FOUND' if sources else 'NO_OFFICIAL_MATCH'}
 if len(CACHE)>=128:CACHE.pop(next(iter(CACHE)))
 if sources:CACHE[key]=(time.monotonic()+21600,result)
 return result
class Handler(BaseHTTPRequestHandler):
 protocol_version='HTTP/1.0'
 def log_message(self,*args):pass
 def send(self,status,data):
  body=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers()
  try:self.wfile.write(body)
  except (BrokenPipeError,ConnectionResetError):pass
 def do_GET(self):
  if self.path!='/health':return self.send(404,{'ok':False})
  self.send(200,{'ok':True,'provider':'Agent-Reach/public-web','sourceCommit':POLICY['commit'],'browserSessions':False,'paidFallback':False})
 def do_POST(self):
  if self.path!='/lookup':return self.send(404,{'ok':False})
  if not hmac.compare_digest(self.headers.get('X-Research-Token','').encode(),TOKEN.encode()):return self.send(403,{'ok':False})
  try:length=int(self.headers.get('Content-Length','0'))
  except ValueError:return self.send(400,{'ok':False})
  if not 0<length<=4096:return self.send(413,{'ok':False})
  if self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.send(415,{'ok':False})
  try:
   value=json.loads(self.rfile.read(length));identity(value)
  except (ValueError,TypeError,AttributeError):return self.send(400,{'ok':False,'code':'IDENTITY_INVALID'})
  if not SLOT.acquire(blocking=False):return self.send(429,{'ok':False,'code':'RESEARCH_BUSY'})
  try:self.send(200,lookup(value))
  except Exception:self.send(503,{'ok':False,'code':'RESEARCH_UNAVAILABLE'})
  finally:SLOT.release()
if __name__=='__main__':ThreadingHTTPServer(('0.0.0.0',8011),Handler).serve_forever()
