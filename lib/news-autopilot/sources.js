import {load} from 'cheerio';
import robotsParser from 'robots-parser';
import {downloadImage} from '../images/import-source.js';
import {canonicalNewsUrl,sourceIsFresh,sourceHash} from './policy.js';
import {VIETNAM_SOURCES} from './vietnam-sources.js';
export const DEFAULT_SOURCES=VIETNAM_SOURCES;
export const LEGACY_FOREIGN_SOURCES=[
 {id:'apple-newsroom',name:'Apple Newsroom',feed_url:'https://www.apple.com/newsroom/rss-feed.rss',allowed_hosts:['www.apple.com'],keywords:['iphone','ipad','mac','camera','display','home','accessor']},
 {id:'samsung-global',name:'Samsung Global Newsroom',feed_url:'https://news.samsung.com/global/feed',allowed_hosts:['news.samsung.com'],keywords:['galaxy','camera','laptop','display','monitor','tablet','projector','audio','wearable','home']},
 {id:'google-pixel',name:'Google Blog — Pixel',feed_url:'https://blog.google/products/pixel/rss/',allowed_hosts:['blog.google'],keywords:['pixel','camera','phone','watch','device']},
 {id:'fed-monetary',name:'Federal Reserve — Hoa Kỳ',feed_url:'https://www.federalreserve.gov/feeds/press_monetary.xml',allowed_hosts:['www.federalreserve.gov'],keywords:[],category:'Tin tài chính và đầu tư',topic:'INVESTMENT_NEWS',jurisdiction:'Hoa Kỳ; không phải quy định hay lãi suất áp dụng tại Việt Nam'},
 {id:'nasa-environment',name:'NASA',feed_url:'https://www.nasa.gov/news-release/feed/',allowed_hosts:['www.nasa.gov'],keywords:['earth','climate','environment','carbon','ocean','water','forest'],category:'Môi trường và tiêu dùng bền vững',topic:'ENVIRONMENT'},
];
// Reuses the bounded HTTPS fetcher: pinned public DNS, timeout, size/redirect caps.
export async function fetchPublicText(url,hosts){const bytes=await downloadImage(url,0,hosts,{userAgent:'RelooNewsBot/1.0 (+https://reloo.vn)'});return bytes.toString('utf8');}
export async function fetchArticleText(url,hosts){
 const robotsUrl=new URL('/robots.txt',url).href;
 const robots=(await downloadImage(robotsUrl,0,hosts,{allowNotFound:true,userAgent:'RelooNewsBot/1.0 (+https://reloo.vn)'})).toString('utf8');
 if(robotsParser(robotsUrl,robots).isAllowed(url,'RelooNewsBot')===false)throw Error('SOURCE_ROBOTS_DISALLOWED');
 return fetchPublicText(url,hosts);
}
export function parseNewsFeed(xml,source,{maxAgeHours=168,now=Date.now()}={}){
 const $=load(xml,{xmlMode:true}),items=[];
 $('item,entry').slice(0,60).each((_i,node)=>{
  const entry=$(node),title=entry.children('title').first().text().trim();
  const link=entry.children('link').filter((_i,e)=>!$(e).attr('rel')||$(e).attr('rel')==='alternate').first();
  const raw=link.attr('href')||link.text().trim();
  const date=entry.children('pubDate,published,updated').first().text();
  const topicMatch=source.topic==='ENVIRONMENT'&&/phát thải|sản xuất xanh|nông nghiệp xanh|kinh tế tuần hoàn|tiêu dùng bền vững/i.test(title);
  if(!title||!sourceIsFresh(date,maxAgeHours,now)||source.keywords?.length&&!topicMatch&&!source.keywords.some(k=>title.toLowerCase().includes(k.toLowerCase())))return;
  if(/health|medical|blood|disease|election|politic|lawsuit|sức khỏe/i.test(title))return;
  if(/tuyển dụng|tuyển tư vấn|mời thầu/i.test(title))return;
  if(source.topic!=='INVESTMENT_NEWS'&&/\bstock\b|\binvest/i.test(title))return;
  try{items.push({title,canonical_url:canonicalNewsUrl(raw,source.allowed_hosts),source_published_at:new Date(date).toISOString(),source_id:source.id});}catch{}
 });return items;
}
export function extractSource(html){
 const $=load(html);
 const title=($('meta[property="og:title"]').attr('content')||$('h1').first().text()||$('h3.title').first().text()||$('title').first().text()).replace(/\s+/g,' ').trim();
 $('script,style,nav,header,footer,aside,form,noscript').remove();
 const containers=['.main-content','.news-detail-content','.ck-content','.entry','.detail-content','.article-content','.article-body','.body-copy','.entry-content','article','main'];
 let text='';for(const selector of containers){const area=$(selector).first();const paragraphs=[...new Set(area.find('p,li,h2,h3').filter((_i,n)=>!$(n).find('p,li,h2,h3').length).map((_i,n)=>$(n).text().replace(/\s+/g,' ').trim()).get().filter(t=>t.length>35))];let candidate=paragraphs.join('\n');if(['.news-detail-content','.ck-content'].includes(selector)&&candidate.length<1000)candidate=area.text().replace(/\s+/g,' ').trim();if(candidate.length>text.length)text=candidate;if(text.length>1500)break;}
 text=text.slice(0,18000);
 if(title.length<8||text.length<1000)throw Error('SOURCE_TEXT_INSUFFICIENT');
 return {title,text};
}
export function vietnamPublishedDate(value){
 const text=String(value||'').trim();
 if(/^\d{4}-\d{2}-\d{2}(?:(?:T| )\d{2}:\d{2}|$)/.test(text)){
  const [y,m,d]=text.slice(0,10).split('-').map(Number);if(m<1||m>12||d<1||d>new Date(Date.UTC(y,m,0)).getUTCDate())return null;
  const normalized=text.length===10?text+'T00:00:00':text.replace(' ','T');const date=new Date(/(?:Z|[+-]\d\d:\d\d)$/i.test(normalized)?normalized:normalized+'+07:00');
  return Number.isFinite(date.getTime())?date.toISOString():null;
 }
 const m=text.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
 if(!m)return null;const[day,month,year,hour,minute]=[m[1],m[2],m[3],m[4]||'0',m[5]||'0'].map(Number);
 if(month<1||month>12||day<1||day>31||hour>23||minute>59)return null;
 const date=new Date(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00+07:00`);
 if(!Number.isFinite(date.getTime())||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',day:'numeric'}).format(date)!==String(day))return null;
 return date.toISOString();
}
export function articlePublishedDate(html,source={}){
 const $=load(html);let value=null;
 const visit=node=>{if(!node||typeof node!=='object'||value)return;if((Array.isArray(node['@type'])?node['@type'].join(' '):String(node['@type']||'')).match(/Article|BlogPosting/)&&node.datePublished)value=vietnamPublishedDate(node.datePublished);for(const child of Object.values(node))if(child&&typeof child==='object')Array.isArray(child)?child.forEach(visit):visit(child);};
 $('script[type="application/ld+json"]').each((_,n)=>{try{visit(JSON.parse($(n).text()));}catch{}});
 if(value)return value;
 const title=$('h1').first().text().normalize('NFKC').replace(/\s+/g,' ').trim();
 const findPageArticle=node=>{if(!node||typeof node!=='object'||value)return;if(typeof node.title==='string'&&node.title.normalize('NFKC').replace(/\s+/g,' ').trim()===title&&node.published_at)value=vietnamPublishedDate(node.published_at);for(const child of Object.values(node))if(child&&typeof child==='object')Array.isArray(child)?child.forEach(findPageArticle):findPageArticle(child);};
 try{findPageArticle(JSON.parse($('#__NEXT_DATA__').text()));}catch{}
 if(value)return value;
 if(source.date_selector){const date=vietnamPublishedDate($(source.date_selector).first().text());if(date)return date;}
 return vietnamPublishedDate($('meta[property="article:published_time"],meta[itemprop="datePublished"]').first().attr('content')||$('article time[datetime]').first().attr('datetime'));
}
export function discoverVietnamLinks(html,source){
 const sitemap=source.source_kind==='SITEMAP',$=load(html,{xmlMode:sitemap}),items=[];
 const pattern=new RegExp(source.link_pattern,'i');
 function add(raw,priority=''){
  try{const url=new URL(raw,source.feed_url);if(url.protocol==='http:'&&source.allowed_hosts.includes(url.hostname))url.protocol='https:';
   const canonical=canonicalNewsUrl(url.href,source.allowed_hosts);
   if(!pattern.test(url.pathname)||/tu-vi|crypto|tien-ao|vay-nhanh|ca-cuoc|game|suc-khoe|dang-uy|chinh-tri/i.test(url.pathname))return;
   if(!items.some(i=>i.url===canonical))items.push({url:canonical,priority});
  }catch{}
 }
 if(sitemap)$('url').each((_,n)=>add($(n).find('loc').text(),$(n).find('lastmod').text()));
 else $('a[href]').each((_,n)=>add($(n).attr('href')));
 // lastmod only orders discovery. It is NEVER used as an article publication date.
 return items.sort((a,b)=>(Date.parse(b.priority)||0)-(Date.parse(a.priority)||0)).slice(0,36).map(i=>i.url);
}
export async function collectVietnamSource(source,{maxAgeHours=168,read=fetchArticleText,now=Date.now(),knownUrls=[]}={}){
 const listing=await read(source.feed_url,source.allowed_hosts),urls=discoverVietnamLinks(listing,source),documents=[],candidates=[];
 const known=new Set(knownUrls);
 // Keep a bounded fetch budget, but advance beyond documents already inspected.
 for(const url of urls.filter(url=>!known.has(url)).slice(0,3)){
  try{const html=await read(url,source.allowed_hosts),article=extractSource(html),date=articlePublishedDate(html,source),promotionalFinance=['PERSONAL_FINANCE','INVESTMENT_NEWS'].includes(source.topic)&&/\bvay\b|khuyến mãi|ưu đãi|hoàn tiền/i.test(article.title),fresh=date&&sourceIsFresh(date,maxAgeHours,now)&&!promotionalFinance;
   documents.push({source_id:source.id,canonical_url:url,title:article.title,source_published_at:date,content_hash:sourceHash(article.text),verified_at:new Date(now).toISOString(),reference_only:!fresh});
   if(fresh)candidates.push({source_id:source.id,canonical_url:url,title:article.title,source_published_at:date});
  }catch{}
 }
 return {documents,candidates,discovered:urls.length};
}
