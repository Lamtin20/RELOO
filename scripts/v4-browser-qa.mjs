export default async function runV4BrowserQA(page){
 await page.context().addCookies([{name:'reloo-ui-language',value:'vi-VN',url:'http://127.0.0.1:4317'}]);await page.goto('http://127.0.0.1:4317/design-preview',{waitUntil:'domcontentloaded',timeout:60000});await page.evaluate(()=>localStorage.setItem('reloo-ui-language:guest','vi-VN'));
 await page.route(/^https?:\/\/(?!127\.0\.0\.1:4317)/,r=>r.abort());
 await page.route('**/v4-qa-axe.js',r=>r.fulfill({path:'node_modules/axe-core/axe.min.js',contentType:'application/javascript'}));
 await page.route('**/api/auth/session',r=>r.fulfill({json:{ok:true,user:null}}));
 await page.route('**/api/db/bootstrap',r=>r.fulfill({json:{ok:true,configured:true,listings:[],users:[],orders:[],settings:{}}}));
 await page.route('**/api/personalization**',r=>r.fulfill({json:{ok:true,enabled:false,interests:[],recommendations:[]}}));
 await page.route('**/api/maps/config',r=>r.fulfill({json:{ok:true,enabled:false,geocoding:false,routing:false}}));
 const results=[],accessibility=[];
 for(const [name,path] of [['home','/'],['explore','/explore'],['register','/auth/register']]){
  for(const [device,width,height] of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844]]){
   await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:4317'+path,{waitUntil:'domcontentloaded',timeout:60000});await page.locator('body').waitFor();if(name==='register')await page.locator('#register-password-rules').waitFor({state:'attached'});
   await page.screenshot({path:`output/v4/BEFORE_AFTER_SCREENSHOTS/after-${name}-${device}.png`,fullPage:true});
   if(device==='mobile'){await page.evaluate(()=>new Promise((resolve,reject)=>{const script=document.createElement('script'),nonce=document.querySelector('script[nonce]');if(nonce)script.nonce=nonce.nonce;script.src='/v4-qa-axe.js';script.onload=resolve;script.onerror=reject;document.head.append(script)}));accessibility.push({page:name,...await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return{passes:r.passes.length,incomplete:r.incomplete.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length})),violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,targets:v.nodes.slice(0,4).map(n=>n.target)}))}})});}
   results.push({page:name,device,...await page.evaluate(()=>({title:document.title,overflow:document.documentElement.scrollWidth>innerWidth+1,mainCount:document.querySelectorAll('main').length,duplicateSearchPanels:document.querySelectorAll('#search-suggest-panel').length,navigationMs:Math.round(performance.getEntriesByType('navigation')[0]?.duration||0)}))});
  }
 }
 await page.goto('http://127.0.0.1:4317/',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('main[data-reloo-ready=true]').waitFor();const skip=page.locator('.reloo-skip-link').first();await skip.focus();await skip.press('Enter');await page.waitForFunction(()=>document.activeElement?.tagName==='MAIN',{},{timeout:6000});
 await page.route('**/v4-qa-broken.webp',r=>r.fulfill({status:404,body:''}));await page.route('**/v4-qa-image.webp',r=>r.fulfill({path:'output/v4/qa-image.webp',contentType:'image/webp'}));
 await page.goto('http://127.0.0.1:4317/design-preview',{waitUntil:'domcontentloaded',timeout:60000});
 const one=page.getByPlaceholder('QA search one'),two=page.getByPlaceholder('QA search two');await one.click();const first=await one.getAttribute('aria-controls');if(!first)throw Error('no search linkage');
 await one.press('ArrowDown');if(!await page.evaluate(()=>document.activeElement?.tagName==='BUTTON'))throw Error('popup keyboard entry failed');await page.keyboard.press('Escape');if(!await one.evaluate(el=>document.activeElement===el)||await one.getAttribute('aria-expanded')!=='false')throw Error('Escape focus failed');
 await two.click();const second=await two.getAttribute('aria-controls');if(first===second)throw Error('duplicate search IDs');await two.press('Escape');
 const image=page.locator('img[alt="QA synthetic image recovery"][src="/v4-qa-image.webp"]');await image.waitFor();await image.evaluate(el=>el.decode());if(!await image.evaluate(el=>el.naturalWidth===240))throw Error('image recovery failed');
 if(await image.getAttribute('width')!=='240'||await image.getAttribute('height')!=='180')throw Error('dimension hints lost');
 await page.evaluate(()=>Object.defineProperty(window,'IntersectionObserver',{value:undefined,configurable:true}));await page.locator('#v4-remount-image').click();await image.evaluate(el=>el.decode());
 await page.screenshot({path:'output/v4/BEFORE_AFTER_SCREENSHOTS/after-shared-controls-mobile.png',fullPage:true});
 await page.evaluate(()=>localStorage.setItem('reloo-ui-language:guest','en-US'));await page.context().addCookies([{name:'reloo-ui-language',value:'en-US',url:'http://127.0.0.1:4317'}]);await page.reload({waitUntil:'domcontentloaded',timeout:60000});await one.waitFor();if(await one.getAttribute('aria-label')!=='Search products')throw Error('English search label missing');
 return {passed:results.every(r=>!r.overflow)&&accessibility.every(r=>r.violations.length===0),scope:'Local development fixtures; not production/native or field CWV',results,accessibility,checks:{skipFocus:true,uniqueSearchIds:true,keyboardEntry:true,escapeFocus:true,imageRecovery:true,dimensionHints:true,noIntersectionObserver:true,englishLabel:true,passwordDescription:true}};
}
