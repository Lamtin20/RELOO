async page=>{
 page.setDefaultTimeout(60000);const checks=[],check=(id,ok)=>{checks.push({id,ok});if(!ok)throw Error(id)};
 await page.addInitScript(()=>{window.CapacitorCustomPlatform={name:'fixture-native'};});
 await page.route('**/api/auth/session',async r=>{await new Promise(resolve=>setTimeout(resolve,1200));await r.fulfill({json:{ok:true,user:null}})});
 await page.route('**/api/db/bootstrap',r=>r.fulfill({json:{ok:true,configured:true,listings:[],users:[],orders:[],settings:{}}}));
 await page.goto('http://127.0.0.1:4522/');
 await page.evaluate(()=>{localStorage.removeItem('reloo-app-intro-v1');localStorage.removeItem('reloo-experience-install-v1')});await page.reload();
 await page.setViewportSize({width:390,height:844});
 const dialog=page.locator('.app-launch');await dialog.getByRole('heading',{name:'Chào bạn, đến với RELOO',exact:true}).waitFor();
 await dialog.locator('img').evaluate(async img=>{await img.decode();if(!img.naturalWidth)throw Error('welcome image failed')});
 await page.screenshot({path:'output/playwright/launch-20261024/slide-1.png'});
 await dialog.getByRole('button',{name:'Tiếp tục',exact:true}).click();await dialog.getByRole('heading',{name:'Một RELOO, nhiều trải nghiệm'}).waitFor();
 await page.screenshot({path:'output/playwright/launch-20261024/slide-2.png'});
 await dialog.getByRole('button',{name:'Tiếp tục',exact:true}).click();
 await dialog.locator('img').evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode()))});
 const options=dialog.locator('.app-intro__interests button');for(let i=0;i<5;i++)await options.nth(i).click();
 check('five-interests-limit',await options.nth(5).isDisabled());
 await options.nth(0).click();check('selection-can-be-reversed',await options.nth(5).isEnabled());
 await page.screenshot({path:'output/playwright/launch-20261024/slide-3.png'});
 await dialog.getByRole('button',{name:'Đăng nhập / Đăng ký',exact:true}).click();await page.waitForURL(/\/auth/);
 check('first-run-auth-after-intro',true);check('guest-interests-saved',await page.evaluate(()=>JSON.parse(localStorage.getItem('reloo-declared-guest-v1')).categories.length===4));
 await page.goto('http://127.0.0.1:4522/');await page.locator('.app-welcome').waitFor();
 await page.screenshot({path:'output/playwright/launch-20261024/returning-welcome.png'});
 await page.locator('.app-launch').waitFor({state:'hidden'});check('returning-no-intro-repeat',true);
 check('no-horizontal-overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 return {checks,scope:'Synthetic native browser; delayed auth fixture exercises actual pending state. No account creation or real-device acceptance.'};
}
