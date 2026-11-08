// Shared by transient preview and the authoritative, post-confirmation review.
// Never send QR claims to OCR, and never log document content.
export async function readIdentityDocuments(images){
 const form=new FormData();
 for(const kind of ['front','back'])form.set(kind,new Blob([images[kind]],{type:'image/jpeg'}),kind+'.jpg');
 const response=await fetch((process.env.KYC_OCR_SERVICE_URL||process.env.KYC_SERVICE_URL)+'/ocr',{method:'POST',headers:{'X-KYC-Token':process.env.KYC_SERVICE_TOKEN},body:form,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('OCR_SERVICE_UNAVAILABLE');
 const reader=response.body?.getReader();if(!reader)throw Error('OCR_SERVICE_UNAVAILABLE');let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768)throw Error('OCR_RESPONSE_TOO_LARGE');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
