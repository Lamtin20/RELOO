import {createHash} from 'node:crypto';
import {financialFailures} from './topics.js';
export function vietnamDay(now=new Date()){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return {day,start:new Date(day+'T00:00:00+07:00').toISOString(),end:new Date(Date.parse(day+'T00:00:00+07:00')+86400000).toISOString()};
}
export function canonicalNewsUrl(value,hosts){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port||!hosts.includes(url.hostname))throw Error('SOURCE_URL_NOT_ALLOWED');
 url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/.test(key))url.searchParams.delete(key);
 return url.href;
}
export const sourceHash=text=>createHash('sha256').update(text).digest('hex');
export const normalize=text=>String(text||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
export function titleSimilarity(a,b){const tokens=s=>new Set(normalize(s).split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>2));const x=tokens(a),y=tokens(b);return [...x].filter(t=>y.has(t)).length/Math.max(1,new Set([...x,...y]).size);}
export const MAX_SOURCE_AGE_HOURS=7*24;
export function newestSourceFirst(a,b){return Date.parse(b.source_published_at)-Date.parse(a.source_published_at)||Number(b.status==='READY')-Number(a.status==='READY');}
export function sourceIsFresh(date,hours=MAX_SOURCE_AGE_HOURS,now=Date.now()){const value=typeof date==='string'&&date.trim()?Date.parse(date):NaN,window=Math.min(MAX_SOURCE_AGE_HOURS,Number(hours));return Number.isFinite(value)&&Number.isFinite(window)&&window>0&&value<=now+300000&&value>=now-window*3600000;}
export function validateGenerated(g,source){
 const failures=[];const sourceText=normalize(source.text+' '+source.title+' '+(source.date||''));
 if(!g||typeof g!=='object')return ['OUTPUT_NOT_OBJECT'];
 for(const [key,min,max]of [['title',12,150],['excerpt',50,300],['context',200,2200],['readerAdvice',120,1500]])if(typeof g[key]!=='string'||g[key].length<min||g[key].length>max)failures.push('INVALID_'+key.toUpperCase());
 if(!Array.isArray(g.facts)||g.facts.length<3||g.facts.length>6)failures.push('FACT_COUNT');
 for(const fact of g.facts||[]){
  if(typeof fact.statement!=='string'||fact.statement.length<40||fact.statement.length>650||typeof fact.evidence!=='string'||fact.evidence.split(/\s+/).length<5||fact.evidence.split(/\s+/).length>24||!sourceText.includes(normalize(fact.evidence)))failures.push('UNSUPPORTED_FACT');
 }
 const output=JSON.stringify(g);
 const numericToken=n=>n.replace(/,/g,'.').replace(/^0+(?=\d)/,'');
 const sourceNumbers=new Set((sourceText.match(/\d+(?:[.,]\d+)*/g)||[]).map(numericToken));
 for(const number of output.match(/\d+(?:[.,]\d+)*/g)||[])if(!sourceNumbers.has(numericToken(number)))failures.push('UNSUPPORTED_NUMBER');
 if(/<\/?[a-z]|https?:\/\/|!\[|\]\(/i.test(output))failures.push('MODEL_MARKUP_OR_LINK');
 if(/(?:giảm giá|hoàn tiền|bảo hành|đã có mặt tại việt nam|reloo (?:cam kết|đảm bảo)|chữa bệnh)/i.test(output))failures.push('REQUIRES_MANUAL_REVIEW');
 failures.push(...financialFailures(g));
 if(/thuê (?:luôn|chắc chắn|bao giờ cũng) rẻ hơn|(?:giảm|tiết kiệm)\s+\d+(?:[.,]\d+)?\s*(?:%|kg|tấn).*?(?:co2|carbon|phát thải)/i.test(output))failures.push('UNVERIFIED_BENEFIT_CLAIM');
 if(typeof g.title==='string'&&!/[àáảãạăâđêôơư]/i.test(g.title+' '+g.excerpt))failures.push('VIETNAMESE_REQUIRED');
 return [...new Set(failures)];
}
