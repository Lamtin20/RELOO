const KEY='reloo-support-conversation';
export function rememberSupportReference(storage,id,actor,now=Date.now()){storage.setItem(KEY,JSON.stringify({id,actor:actor||null,at:now}))}
export function restoreSupportReference(storage,actor,now=Date.now()){try{const r=JSON.parse(storage.getItem(KEY)||'null');return r?.actor===(actor||null)&&Number.isFinite(r.at)&&now>=r.at&&now-r.at<86400000&&/^[a-f0-9-]{36}$/i.test(r.id||'')?r.id:null}catch{return null}}
