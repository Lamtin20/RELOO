// Tab-memory only. Never persist private form fields in URL/localStorage.
export function createMiniAppDraftStore({ttl=20*60*1000,max=50,now=()=>Date.now()}={}){
 const entries=new Map();
 return {
  read(key){const item=entries.get(key);if(!item||now()-item.at>=ttl){entries.delete(key);return null}return structuredClone(item.value)},
  write(key,value){entries.delete(key);entries.set(key,{at:now(),value:structuredClone(value)});while(entries.size>max)entries.delete(entries.keys().next().value)},
  clear(key){entries.delete(key)}
 };
}
