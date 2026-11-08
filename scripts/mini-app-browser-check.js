async page=>{
 page.setDefaultTimeout(60000);const base='http://127.0.0.1:4522',root='output/playwright/mini-world-20261023',checks=[];
 const check=(id,ok)=>{checks.push({id,ok});if(!ok)throw Error(id)};
 for(const [id,path] of [['stays','/dat-phong'],['rentals','/explore?transaction=RENT'],['used','/explore?transaction=SALE'],['jobs','/viec-lam']]){
  await page.goto(base+path);await page.locator('.mini-world-nav').waitFor();
  await page.waitForFunction(()=>document.querySelector('.consent-banner')||localStorage.getItem('reloo-cookie-consent'));
  const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
  check(id+'-own-shell',await page.locator('.mini-world--'+id).count()===1);
  check(id+'-no-global-bottom-nav',await page.locator('.bottom-nav:visible').count()===0);
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});check(id+'-no-overflow-'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:root+'/'+id+'-'+width+'.png'})}
 }
 await page.locator('.mini-world-nav').getByRole('link',{name:'Tìm người',exact:true}).click();await page.waitForURL(/role=employer/);
 check('jobs-role-url',await page.locator('.sa-role-switch button').nth(1).getAttribute('aria-pressed')==='true');
 await page.locator('.mini-world-exit').click();await page.waitForURL(base+'/');check('exit-restores-global-shell',await page.locator('.mini-world').count()===0);
 return {checks,scope:'Local service entries only; no booking/payment/application or authenticated flow performed',at:new Date().toISOString()};
}
