// Native layout simulation with web implementations; no hardware acceptance claim.
async page=>{
 page.setDefaultTimeout(60000);let member=false;
 const checks=[],check=(name,ok)=>{checks.push({name,ok});if(!ok)throw Error(name)};
 await page.addInitScript(()=>{window.CapacitorCustomPlatform={name:'fixture-native'};});
 await page.route('**/api/auth/session',r=>r.fulfill({json:{ok:true,user:member?{id:'synthetic-header-member',name:'DEMO',role:'renter',profileComplete:true,activationStatus:'ACTIVE'}:null}}));
 await page.route('**/api/db/bootstrap',r=>r.fulfill({json:{ok:true,configured:true,listings:[],users:[],orders:[],settings:{}}}));
 await page.route('**/api/weather',r=>r.fulfill({status:503,json:{ok:false,code:'WEATHER_UNAVAILABLE'}}));
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:4522/');await page.locator('.bottom-nav').waitFor();
 const skip=page.getByRole('button',{name:/Bỏ qua/});try{await skip.waitFor({timeout:5000});await skip.click()}catch{}
 const continueSetup=page.getByRole('button',{name:'Tiếp tục dùng RELOO',exact:true});if(await continueSetup.isVisible())await continueSetup.click();
 const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 check('guest-native-news-tab',await page.locator('.bottom-nav a[href="/news"]').count()===1);
 check('guest-native-no-transaction-tab',await page.locator('.bottom-nav a[href="/giao-dich"]').count()===0);
 check('native-root-detected',await page.locator('html.reloo-native').count()===1);
 check('unavailable-weather-not-invented',await page.locator('.native-header [data-weather=unknown]').innerText().then(s=>s.includes('Chưa có dự báo')));
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  const b=await page.locator('.site-header-shell').boundingBox();
  check('native-header-full-width-'+width,b.x===0&&Math.abs(b.width-width)<1&&b.y===0);
  await page.screenshot({path:'output/playwright/header-20261024/guest-native-'+width+'.png'});
 }
 member=true;await page.reload();await page.locator('.native-home-account').waitFor();
 if(await skip.isVisible())await skip.click();
 if(await continueSetup.isVisible())await continueSetup.click();
 if(await consent.isVisible())await consent.click();
 check('member-native-news-in-header',await page.locator('.native-home-news').isVisible());
 check('member-native-no-news-bottom-tab',await page.locator('.bottom-nav a[href="/news"]').count()===0);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/playwright/header-20261024/member-native-390.png'});
 await page.emulateMedia({reducedMotion:'reduce'});
 check('reduced-motion-background-static',await page.locator('.site-header-shell').evaluate(n=>getComputedStyle(n).transitionDuration==='0s'));
 return {checks,scope:'Simulated native detection and synthetic auth; OS bars, cutouts, keyboard and real-device fullscreen NOT_TESTED'};
}
