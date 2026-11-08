// Invariant, self-describing facts only. Bare megapixel counts, storage and
// configuration variants are intentionally not treated as item specifications.
export function extractInvariantFacts(identity,sources){
 const facts=[];for(let index=0;index<sources.length;index++){
  const text=String(sources[index].text||'');let match,value,field;
  if(identity.category==='am-thanh'){
   match=text.match(/\b(?:One\s+|Two\s+|\d+\s*[x×]\s*)?\d{1,3}\s*(?:Watt|W)\b[^\n]{0,65}?\bamplifier\b(?:\s+for\s+(?:the\s+)?(?:woofer|tweeters?|speakers?))?/i);if(match){value=match[0].trim();field='power';}
  }else if(['may-anh','may-quay','livestream'].includes(identity.category)){
   match=text.match(/[^\n]{0,45}\b(?:full[ -]?frame|APS[- ]?C|Micro Four Thirds)\b[^\n]{0,90}\b(?:CMOS|CCD|sensor)\b[^\n]{0,15}/i);
   if(match){value=match[0].replace(/^[\s*#|]+/,'').trim();field='sensor';}
   else{match=text.match(/(?:effective pixels|pixels\s*\(effective\)|effective resolution)[^\n]{0,50}(?:\n[\s*]*)?(\d{1,3}(?:[.,]\d+)?\s*(?:megapixels?|MP))\b/i);if(match){value=match[1];field='sensor';}}
  }else{match=text.match(/\b(?:Bluetooth\s*\d+(?:\.\d+)?|Wi[-‑ ]?Fi\s*[67]E?)\b/i);if(match){value=match[0];field='specs';}}
  if(match&&value&&value.length<=120){const vicinity=text.slice(Math.max(0,match.index-70),match.index+match[0].length+70);if(/optional|varies by|depending on|tùy (?:chọn|phiên bản)|tuỳ (?:chọn|phiên bản)/i.test(vicinity))continue;facts.push({field,value,evidence:match[0],sourceIndex:index});}
 }
 return facts;
}
