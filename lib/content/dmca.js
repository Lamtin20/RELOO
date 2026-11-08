export function dmcaCertificate(id,confirmed){
 if(confirmed!=='true'||typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))return null;
 return 'https://www.dmca.com/Protection/Status.aspx?ID='+id;
}
export function dmcaPageCertificate(certificate,path){
 if(typeof certificate!=='string'||!/^https:\/\/www\.dmca\.com\/Protection\/Status\.aspx\?ID=[a-f0-9-]{36}$/i.test(certificate)||typeof path!=='string'||!path.startsWith('/')||path.startsWith('//')||/[?#]/.test(path)||/^\/(crm|dashboard|account|auth|checkout|rent|purchase|api)(\/|$)/.test(path))return null;
 return certificate+'&refurl='+encodeURIComponent('https://reloo.vn'+path);
}
