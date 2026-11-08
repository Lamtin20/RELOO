// Local runtime check. No real inventory, auth, purchase or payment request.
async page=>{
 const checks=[];
 const check=(id,ok)=>{checks.push({id,ok});if(!ok)throw Error(id)};
 const get=async path=>{const r=await page.request.get('http://127.0.0.1:4522'+path);return {status:r.status(),headers:r.headers(),body:await r.json()}};
 const manifest=await get('/.well-known/reloo-agent');
 check('manifest served',manifest.status===200);
 check('transaction capabilities denied',manifest.body.capabilities.pay===false&&manifest.body.capabilities.purchase===false);
 const contract=await get(manifest.body.openapi);
 check('OpenAPI served',contract.status===200&&contract.body.openapi==='3.1.1');
 check('all published operations are reads',Object.values(contract.body.paths).every(p=>Object.keys(p).every(k=>k==='get')));
 const invalid=await get('/api/agent/catalog?limit=41');
 check('invalid bounds rejected before database access',invalid.status===400&&invalid.body.code==='INVALID_QUERY');
 const wrong=await get('/api/agent/catalog?unknown=1');
 check('unknown query rejected',wrong.status===400);
 const unavailable=await get('/api/agent/catalog');
 check('unconfigured isolated backend fails closed',unavailable.status===503&&unavailable.body.code==='AUTH_NOT_CONFIGURED');
 check('live data not cached',unavailable.headers['cache-control'].includes('no-store'));
 const id=await get('/api/agent/catalog/invalid%20id');
 check('invalid detail ID rejected',id.status===400);
 const write=await page.request.post('http://127.0.0.1:4522/api/agent/catalog',{data:{buy:true}});
 check('no transaction handler',write.status()===405);
 return {scope:'isolated local HTTP runtime; successful DB catalog covered by projection tests only',checks};
}
