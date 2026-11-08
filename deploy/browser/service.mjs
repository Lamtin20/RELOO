import { createServer } from 'node:http';
import { timingSafeEqual, createHash } from 'node:crypto';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
let busy = false;
function equal(a,b) { return a && b && timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest()); }
createServer(async (request, response) => {
  response.setHeader('Content-Type','application/json');
  if (request.url === '/health') { response.end('{"service":"reloo-lookup-browser"}'); return; }
  if (request.method !== 'POST' || request.url !== '/lookup' || !equal(request.headers['x-lookup-token'],process.env.LOOKUP_SERVICE_TOKEN)) { response.writeHead(401); response.end('{"error":"Unauthorized"}'); return; }
  if (busy) { response.writeHead(429); response.end('{"error":"Busy"}'); return; }
  let context;
  try {
    let body = '', size = 0;
    for await (const chunk of request) { size += chunk.length; if (size > 3000) throw new Error('Input limit'); body += chunk; }
    const input = JSON.parse(body), url = new URL(input.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['checkscam.vn','chongluadao.vn'].includes(url.hostname) || !['/','/analyze/'].includes(url.pathname)) throw new Error('Source not allowed');
    busy = true;
    context = await browser.newContext();
    const page = await context.newPage();
    const result = await page.goto(url.href, { waitUntil:'domcontentloaded', timeout:20000 });
    if (result?.ok()) await page.waitForFunction(() => {
      const text=document.body.innerText.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      return document.getElementById('email-breaches') || /\d+\s+lan lo lot|canh bao lien quan|khong tim thay|dich vu an danh\s*[:\-]?\s*(co|khong)\b/.test(text);
    },null,{timeout:url.searchParams.get('type')==='email'?25000:12000}).catch(()=>{});
    const text=(await page.locator('body').innerText()).slice(0,64000);
    const values=await page.locator('input').evaluateAll(elements=>elements.slice(0,20).map(element=>element.value.trim().slice(0,256)));
    const emailData=url.hostname==='chongluadao.vn'&&url.searchParams.get('type')==='email'?await page.evaluate(()=>{
      const heading=[...document.querySelectorAll('h3')].find(x=>x.textContent.trim()==='Kết quả kiểm tra email'),section=document.getElementById('email-breaches');
      const source=heading?.parentElement.querySelector('a[href="https://haveibeenpwned.com/"]');
      const countText=[...document.querySelectorAll('button')].map(x=>x.innerText.replace(/\s+/g,' ').trim()).find(x=>/^\d+\s*lần\s+lộ\s+lọt$/.test(x));
      return {hasResultHeading:!!heading,hasBreachSection:!!section,source:source?'HIBP_VIA_CLD':null,reportedCount:countText?Number(countText.match(/^\d+/)[0]):null,breaches:[...(section?.querySelectorAll('article')||[])].slice(0,100).map(card=>({name:card.querySelector('h5')?.textContent.trim().slice(0,200),date:card.querySelector('[class*="entryMetaItem"]')?.textContent.trim().slice(0,80),types:[...card.querySelectorAll('[class*="dataClassChip"]')].map(x=>x.textContent.trim().slice(0,100)).slice(0,20),logo:card.querySelector('img')?.src}))};
    }):null;
    await context.close();
    context = null;
    busy = false;
    response.end(JSON.stringify({status:result?.status()||0,text,values,emailData}));
  } catch { response.writeHead(503); response.end('{"error":"Source unavailable"}'); }
  finally { if(context) await context.close(); busy=false; }
}).listen(9001,'0.0.0.0');
