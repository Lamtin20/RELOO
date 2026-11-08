"""Render a private additive app overlay from resolved baseline compose JSON.
Creates no containers and changes no live configuration. Writes mode0600.
"""
import argparse,json,os,pathlib
def overlay(baseline,token):
 if len(token)<32 or '\n' in token or '\r' in token:raise ValueError('Invalid private research token')
 old=baseline['services']['app'].get('networks',{'default':{}})
 networks=dict(old) if isinstance(old,dict) else {name:{} for name in old}
 networks.update({'product-ai':{},'product-research':{}})
 return {'services':{'app':{'networks':networks,'environment':{'RELOO_LISTING_PHOTO_AI':'1','PRIMARY_SEARCH_PROVIDER':'agent-reach','FALLBACK_SEARCH_ENABLED':'true','RELOO_LISTING_AI_DAILY_LIMIT':'100','RELOO_LISTING_AI_USER_DAILY_LIMIT':'20','RELOO_ADVISOR_AI_URL':'http://product-ai:11434','RELOO_ADVISOR_AI_MODEL':'qwen3.5:4b','RELOO_PRODUCT_RESEARCH_URL':'http://product-research:8011','RELOO_PRODUCT_RESEARCH_TOKEN':token}}}}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('baseline');parser.add_argument('output');parser.add_argument('--token-file',required=True);args=parser.parse_args()
 value=overlay(json.loads(pathlib.Path(args.baseline).read_text()),pathlib.Path(args.token_file).read_text().strip());out=pathlib.Path(args.output)
 fd=os.open(out,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as f:json.dump(value,f)
 print('Private overlay rendered; existing app networks preserved. Not deployed.')
