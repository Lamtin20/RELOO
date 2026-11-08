import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Image edit protocol confirmed by previous successful Vibi Image API calls.
// Exactly one request per image: never automatically retry billable generation.
export async function editImage({prompt,reference,output}) {
 const config=JSON.parse(await readFile('output/imagegen/provider-config.json','utf8'));
 const base=process.env.VIBI_BASE_URL||config.baseUrl;
 const model=process.env.VIBI_IMAGE_MODEL||config.model;
 const key=process.env.VIBI_API_KEY;
 if(!key)throw Error('VIBI_API_KEY missing; use the encrypted workspace credential launcher.');
 const form=new FormData();
 form.set('model',model);form.set('prompt',prompt);form.set('size','1024x1024');form.set('quality','medium');form.set('output_format','png');
 form.set('image',new Blob([await readFile(reference)],{type:'image/png'}),'approved-reference.png');
 let response;
 try{response=await fetch(base.replace(/\/$/,'')+'/images/edits',{method:'POST',headers:{Authorization:'Bearer '+key},body:form,signal:AbortSignal.timeout(180000)});}
 catch{throw Error('Image request timed out or transport failed. No retry performed; check provider billing/status before another request.');}
 if(!response.ok){const code=response.status;throw Error(code===401?'Vibi authentication failed':code===403?'Model permission denied':code===429?'Quota or rate limit reached':`Vibi image request failed (HTTP ${code}); no automatic retry.`);}
 const result=await response.json();
 const encoded=result.data?.[0]?.b64_json;
 if(!encoded)throw Error('Provider response differs from confirmed base64 Image API protocol. Output not saved; no retry.');
 await writeFile(resolve(output),Buffer.from(encoded,'base64'));
 return {model,protocol:'POST images/edits, multipart image reference, synchronous base64 PNG',output};
}
