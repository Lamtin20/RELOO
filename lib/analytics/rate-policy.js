export function retryDelay(value,now=Date.now()){
 const seconds=Number(value);if(value&&Number.isFinite(seconds))return Math.min(300,Math.max(1,Math.ceil(seconds)));
 const date=Date.parse(value||'');return Number.isFinite(date)?Math.min(300,Math.max(1,Math.ceil((date-now)/1000))):60;
}
