import importlib.util,json,os,pathlib,secrets,sys,threading,types,unittest,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
class FakeWeb:
 def _exa_search(self,**kwargs):return [{'url':'https://evil.invalid/private'},{'url':'https://www.sony.com/ilce-7m4'}]
 def _jina_read(self,**kwargs):return [{'title':'Sony ILCE-7M4','text':'ILCE-7M4 has a full frame CMOS sensor.'}]
web=types.ModuleType('agent_reach.channels.web');web.WebChannel=FakeWeb
sys.modules['agent_reach']=types.ModuleType('agent_reach');sys.modules['agent_reach.channels']=types.ModuleType('agent_reach.channels');sys.modules['agent_reach.channels.web']=web
os.environ['RELOO_PRODUCT_RESEARCH_TOKEN']=secrets.token_urlsafe(36)
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,ROOT/file);value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
service=module('reloo_research','deploy/listing-ai/research_service.py');renderer=module('reloo_overlay','deploy/listing-ai/render_app_overlay.py')
class ResearchTests(unittest.TestCase):
 def test_brand_scope_and_private_destinations(self):
  for url in ['http://sony.com/a','https://sony.com.evil.invalid/','https://127.0.0.1/','https://sony.com:444/a','https://user@sony.com/a']:self.assertFalse(service.official(url,'Sony'))
  self.assertTrue(service.official('https://www.sony.com/a','Sony'));self.assertFalse(service.official('https://apple.com/a','Sony'))
 def test_identity_never_becomes_a_command_or_personal_query(self):
  for model in ['0912345678','https://127.0.0.1/','token=secret','Jane Smith','$(whoami)']:
   with self.assertRaises(ValueError):service.identity({'brand':'Sony','model':model,'category':'may-anh'})
 def test_lookup_only_reads_approved_product_pages(self):
  value=service.lookup({'brand':'Sony','model':'ILCE-7M4','category':'may-anh'});self.assertEqual(len(value['sources']),1);self.assertEqual(value['sources'][0]['url'],'https://www.sony.com/ilce-7m4');self.assertNotIn('image',value)
 def test_speaker_identity_never_uses_a_camera_brand_or_category(self):
  self.assertTrue(service.model_present('Acton II','Acton II Bluetooth'));self.assertFalse(service.model_present('Acton II','Acton III'))
  self.assertEqual(service.identity({'brand':'Marshall','model':'Acton II','category':'am-thanh'}),('Marshall','Acton II'))
  self.assertTrue(service.official('https://www.marshall.com/a','Marshall'));self.assertFalse(service.official('https://www.fujifilm.com/a','Marshall'))
  for value in [{'brand':'Fujifilm','model':'Loa Marshall Acton 2','category':'may-anh'},{'brand':'Marshall','model':'Acton II','category':'may-anh'},{'brand':'Fujifilm','model':'Acton II','category':'may-anh'}]:
   with self.assertRaises(ValueError):service.identity(value)
 def test_overlay_preserves_all_existing_private_networks(self):
  old={'default':{},'management':{'aliases':['old-alias']},'identity-ocr':{},'frontend':{}};value=renderer.overlay({'services':{'app':{'networks':old}}},'x'*36);new=value['services']['app']['networks'];self.assertTrue(set(old).issubset(new));self.assertEqual(new['management']['aliases'],['old-alias'])
 def test_http_requires_token_and_bounded_body(self):
  server=service.ThreadingHTTPServer(('127.0.0.1',0),service.Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  def post(body,key):
   try:
    with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:'+str(server.server_port)+'/lookup',data=body,headers={'Content-Type':'application/json','X-Research-Token':key}),timeout=3) as r:return r.status
   except urllib.error.HTTPError as e:return e.code
  try:
   # Empty bodies isolate header authentication from an early-close TCP reset
   # caused by intentionally unread unauthorized request bodies on Windows.
   self.assertEqual(post(b'','bad'),403);self.assertEqual(post(b'','é'),403);self.assertEqual(post(b'x'*4097,service.TOKEN),413);self.assertEqual(post(json.dumps({'brand':'Sony','model':'ILCE-7M4','category':'may-anh'}).encode(),service.TOKEN),200)
  finally:server.shutdown();server.server_close();thread.join(timeout=2)
if __name__=='__main__':unittest.main()
