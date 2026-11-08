// Local UI fixtures only. Native shell simulation is not device acceptance.
async page=>{
 page.setDefaultTimeout(60000);
 const root='output/playwright/header-20261024',checks=[];
 const check=(name,ok)=>{checks.push({name,ok});if(!ok)throw Error(name)};
 let member=false;
 await page.route('**/api/auth/session',r=>r.fulfill({json:{ok:true,user:member?{id:'synthetic-header-member',name:'DEMO',role:'renter',profileComplete:true,activationStatus:'ACTIVE'}:null}}));
 await page.route('**/api/db/bootstrap',r=>r.fulfill({json:{ok:true,configured:true,listings:[],users:[],orders:[],settings:{}}}));
 await page.route('**/api/weather',r=>r.fulfill({json:{ok:true,temperature:27,condition:'rain',forecastAt:new Date().toISOString(),source:'Windy'}}));
 await page.goto('http://127.0.0.1:4522/');
 await page.locator('.native-header .header-weather--compact').waitFor({state:'attached'});
 const skip=page.getByRole('button',{name:/Bỏ qua/});try{await skip.waitFor({timeout:5000});await skip.click()}catch{}
 const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  check('web-no-bottom-'+width,await page.locator('.bottom-nav:visible').count()===0);
  check('web-no-overflow-'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width<900){check('header-at-top-'+width,Math.abs((await page.locator('.site-header-shell').boundingBox()).y)<1);check('weather-visible-'+width,await page.locator('.native-header .header-weather--compact').isVisible());}
  await page.screenshot({path:root+'/guest-web-'+width+'.png'});
 }
 await page.setViewportSize({width:390,height:844});member=true;await page.reload();
 await page.locator('.native-home-account').waitFor();
 check('member-news-next-to-notifications',await page.locator('.native-home-news').isVisible());
 check('forecast-used-not-fabricated',await page.locator('.native-header [data-weather=rain]').innerText().then(s=>s.includes('27')));
 await page.screenshot({path:root+'/member-web-390.png'});
 await page.goto('http://127.0.0.1:4522/dat-phong');await page.locator('.mini-world-nav').waitFor();
 check('mini-web-navigation-is-not-bottom-fixed',await page.locator('.mini-world-nav').evaluate(n=>getComputedStyle(n).position!=='fixed'));
 await page.screenshot({path:root+'/mini-web-390.png'});
 return {checks,scope:'Browser guest/member fixtures; native fullscreen and keyboard NOT_TESTED on device'};
}
