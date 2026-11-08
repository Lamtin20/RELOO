// CLI browser QA: actual local pages, with synthetic booking data and no real transactions.
async page => {
 page.setDefaultTimeout(60000);
 const base='http://127.0.0.1:4522',root='output/playwright/design-20261023',screens=[],failures=[],checks=[],exceptions=[];
 page.on('pageerror',e=>exceptions.push(e.message));
 await page.goto(base+'/');
 await page.waitForFunction(()=>document.querySelector('.consent-banner')||localStorage.getItem('reloo-cookie-consent'));
 const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 const routes=['/','/tim-kiem?q=vali','/dang-tin','/giao-dich','/viec-lam','/dat-phong','/dat-phong/quan-ly','/dat-phong/chu-nha','/explore?transaction=RENT','/explore?transaction=SALE','/noi-khu','/account','/auth','/auth/register','/notifications','/help','/crm/login','/admin/risk'];
 for(const [i,route] of routes.entries()){
  try{
   const response=await page.goto(base+route);await page.locator('body').waitFor();
   for(const width of [390,768,1440]){
    await page.setViewportSize({width,height:900});
    const dimensions=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
    const ok=dimensions.document<=width;if(!ok)failures.push({route,width,reason:'HORIZONTAL_OVERFLOW',dimensions});
    const screenshot='screen-'+i+'-'+width+'.png';await page.screenshot({path:root+'/'+screenshot});
    screens.push({route,width,status:response.status(),overflow:!ok,screenshot});
   }
  }catch(e){failures.push({route,reason:e.message.slice(0,200)})}
 }
 const check=(id,ok)=>{checks.push({id,ok});if(!ok)failures.push({reason:id})};
 try{
 await page.goto(base+'/design-preview');await page.getByRole('button',{name:'Open dialog',exact:true}).waitFor();await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Open dialog',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'Sample dialog',exact:true});await dialog.waitFor();
 check('dialog-initial-focus',await dialog.evaluate(el=>el.contains(document.activeElement)));
 await page.keyboard.press('Shift+Tab');check('dialog-tab-wrap',await page.getByRole('button',{name:'Done',exact:true}).evaluate(el=>el===document.activeElement));
 await page.getByRole('button',{name:'Open nested dialog',exact:true}).click();await page.getByRole('dialog',{name:'Nested sample',exact:true}).waitFor();
 check('unique-dialog-labels',await page.locator('[data-reloo-modal]').evaluateAll(nodes=>new Set(nodes.map(n=>n.getAttribute('aria-labelledby'))).size===nodes.length));
 await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Nested sample',exact:true}).waitFor({state:'hidden'});
 check('nested-close-keeps-parent-scroll-lock',await page.evaluate(()=>document.body.style.overflow==='hidden'));
 await page.screenshot({path:root+'/dialog-mobile.png'});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 check('dialog-restores-trigger-focus',await page.getByRole('button',{name:'Open dialog',exact:true}).evaluate(el=>el===document.activeElement));
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Open dialog',exact:true}).click();
 check('reduced-motion-dialog',await page.locator('.modal').evaluate(el=>getComputedStyle(el).animationName==='none'));await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(base+'/tim-kiem?q=vali');await page.getByRole('search').waitFor();await page.getByRole('combobox',{name:'Dịch vụ RELOO',exact:true}).selectOption('rentals');await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
 await page.waitForURL(/\/explore\?/);check('search-submit-keeps-query-domain',new URL(page.url()).searchParams.get('q')==='vali'&&new URL(page.url()).searchParams.get('transaction')==='RENT');
 await page.evaluate(()=>localStorage.setItem('reloo-ui-language:guest','en-US'));await page.goto(base+'/');await page.getByRole('heading',{name:'What do you need today?',exact:true}).waitFor();await page.screenshot({path:root+'/home-english.png'});checks.push({id:'english-shared-locale',ok:true});await page.evaluate(()=>localStorage.setItem('reloo-ui-language:guest','vi-VN'));
 }catch(e){failures.push({reason:'INTERACTION_CHECK_FAILED',detail:e.message.slice(0,400)})}
 return {screens,checks,failures,exceptions,scope:'Local rendering and keyboard QA. Auth-restricted pages verified as access guards only. Not hosted staging/native acceptance.',at:new Date().toISOString()};
}
