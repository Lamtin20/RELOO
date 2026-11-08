import {ENGAGEMENT_RULES} from '../support/engagement.js';
export const BRAIN_MODULES=['rentals','used','stays','jobs','general'];
export const DEFAULT_BRAIN=Object.freeze({enabled:true,modelEnabled:true,name:'RELOO',subtitle:'Tư vấn theo nhu cầu',greeting:{'vi-VN':'Bạn đang cần gì?','en-US':'What can we help you find?'},quickPrompts:{'vi-VN':['Giá thuê','Tiền cọc','Trả trễ','Gặp nhân viên'],'en-US':['Rental price','Deposit','Late return','Talk to staff']},modules:BRAIN_MODULES,engagement:{...ENGAGEMENT_RULES}});
export const normalizeBrainText=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim();
const sensitive=/\b(?:bearer|api[_ -]?key|password|token|otp)\s*[:=]|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[ .-]?){9,}/i;
const financial=/\b(tien|coc|phi|thue|hoan|huy|ngan hang|bao dam|dam bao|xac minh|an toan tuyet doi|so 1|tot nhat|trach nhiem|phap ly|bao hiem|cam ket|payments?|refunds?|cancell?ations?|cancel|deposits?|guarantee[ds]?|identity|availability|available|tax(?:es)?|prices?|rents?|fees?|charges?|discounts?|polic(?:y|ies)|legal|terms|insurance)\b|[%₫$€]|\b(vnd|dong|usd)\b/i;
function text(v,max,min=1){if(typeof v!=='string'||v.trim().length<min||v.length>max||sensitive.test(v)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw Error('TEXT_INVALID_OR_SENSITIVE');return v.trim();}
export function validateBrain(input){
 if(!input||Object.keys(input).some(k=>!Object.hasOwn(DEFAULT_BRAIN,k))||typeof input.enabled!=='boolean'||typeof input.modelEnabled!=='boolean')throw Error('BRAIN_INVALID');
 const result={enabled:input.enabled,modelEnabled:input.modelEnabled,name:text(input.name,40),subtitle:text(input.subtitle,120),greeting:{},quickPrompts:{},modules:[],engagement:{}};
 for(const locale of ['vi-VN','en-US']){result.greeting[locale]=text(input.greeting?.[locale],240);const prompts=input.quickPrompts?.[locale];if(!Array.isArray(prompts)||prompts.length<1||prompts.length>4)throw Error('PROMPTS_INVALID');result.quickPrompts[locale]=prompts.map(p=>text(p,60));}
 if(!Array.isArray(input.modules)||input.modules.length>5||input.modules.some(m=>!BRAIN_MODULES.includes(m)))throw Error('MODULES_INVALID');result.modules=[...new Set(input.modules)];
 const ranges={waitSeconds:[15,120],priceViews:[2,10],priceSeconds:[30,600],productPages:[2,10],productSeconds:[45,600],maxInvites:[0,1],expiresSeconds:[30,120],dismissHours:[24,168]};
 if(Object.keys(input.engagement||{}).some(k=>!ranges[k]))throw Error('ENGAGEMENT_INVALID');
 for(const [key,[min,max]] of Object.entries(ranges)){const n=input.engagement?.[key];if(!Number.isInteger(n)||n<min||n>max)throw Error('ENGAGEMENT_INVALID');result.engagement[key]=n;}
 return result;
}
export function validateKnowledge(rows,{publish=false}={}){
 if(!Array.isArray(rows)||rows.length>40)throw Error('KNOWLEDGE_LIMIT');
 return rows.map((r,i)=>{if(!r||Object.keys(r).some(k=>!['question','answer','source','rightsConfirmed'].includes(k)))throw Error('KNOWLEDGE_INVALID');const question=text(r.question,180,5),answer=text(r.answer,1200,5),source=r.source||'/help';if(!/^\/(?:help|safety|cms\/[a-z0-9-]+|news\/[a-z0-9-]+)$/.test(source))throw Error('SOURCE_NOT_PUBLIC');if(typeof r.rightsConfirmed!=='boolean')throw Error('RIGHTS_REQUIRED');const reviewRequired=financial.test(normalizeBrainText(question+' '+answer));if(publish&&(!r.rightsConfirmed||reviewRequired))throw Error(reviewRequired?'NEEDS_LEGAL_REVIEW':'RIGHTS_REQUIRED');return {question,answer,source,rightsConfirmed:r.rightsConfirmed,...(!publish?{reviewRequired,index:i}:{})};});
}
export function knowledgeForStorage(rows){return validateKnowledge(rows).map(({question,answer,source,rightsConfirmed})=>({question,answer,source,rightsConfirmed}));}
export function brainVersionForEditor(row){if(!row)return null;const knowledge=knowledgeForStorage(row.knowledge);return {...row,knowledge,knowledgeReview:validateKnowledge(knowledge).map(({index,reviewRequired})=>({index,reviewRequired}))};}
export function validatePublication(config,knowledge){const safe=validateBrain(config);if(financial.test(normalizeBrainText([safe.name,safe.subtitle,...Object.values(safe.greeting)].join(' '))))throw Error('NEEDS_LEGAL_REVIEW');validateKnowledge(knowledge,{publish:true});return safe;}
export function matchKnowledge(query,rows){
 const q=normalizeBrainText(query),words=[...new Set(q.split(/[^a-z0-9]+/).filter(w=>w.length>2&&!['cho','toi','cua','the','what','the','you','can'].includes(w)))];
 return validateKnowledge(rows,{publish:true}).map(r=>{const target=normalizeBrainText(r.question),hits=words.filter(w=>target.includes(w)).length;return {...r,score:target===q?2:words.length>=2&&hits>=2?hits/words.length:0};}).filter(r=>r.score>=.65).sort((a,b)=>b.score-a.score)[0]||null;
}
export function brainModule(path=''){return path.startsWith('/dat-phong')?'stays':path.startsWith('/viec-lam')?'jobs':path.startsWith('/product/')||path.startsWith('/rent/')||path==='/explore'?'rentals':'general';}
export function publicBrain(brain){return {version:brain.id,enabled:brain.config.enabled,name:brain.config.name,subtitle:brain.config.subtitle,greeting:brain.config.greeting,quickPrompts:brain.config.quickPrompts,engagement:brain.config.engagement};}
export const CONTROL_COVERAGE=[{id:'support',label:'Tư vấn khách hàng',status:'INSTRUMENTED'},{id:'analysis',label:'Phân tích vận hành',status:'INSTRUMENTED'},{id:'news',label:'AI nội dung',status:'INSTRUMENTED_METADATA_ONLY'},{id:'services',label:'Làm rõ nhu cầu dịch vụ',status:'INSTRUMENTED_METADATA_ONLY'},{id:'peer',label:'Tin nhắn riêng giữa khách',status:'PRIVATE_NOT_MIRRORED'},{id:'world',label:'RELOO World',status:'NOT_INSTRUMENTED'},{id:'invitations',label:'Lời mời trên thiết bị',status:'LOCAL_CONSENT_ONLY'}];
