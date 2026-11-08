// Synthetic read-only catalog in browser. No credentials, live orders or payment writes.
async page=>{
 page.setDefaultTimeout(60000);await page.unrouteAll({behavior:'wait'});
 const base='http://127.0.0.1:4522',root='output/playwright/mini-continuation-20261023',checks=[],mutations=[];
 const check=(id,ok)=>{checks.push({id,ok});if(!ok)throw Error(id)};
 const listing={id:'guardian-navigation-fixture',ownerId:'fixture-owner',title:'SYNTHETIC · Máy ảnh kiểm tra điều hướng',description:'Dữ liệu thử giao diện. Không mở bán.',category:'dien-tu',images:['/images/reloo-camping.webp'],dailyPrice:80000,salePrice:2000000,marketValue:3000000,deposit:500000,condition:'good',status:'available',transactionMode:'BOTH',createdAt:new Date().toISOString(),location:'Quận 1, Thành phố Hồ Chí Minh',rentalDetails:{pickupAvailable:true,deliveryAvailable:false,depositAmount:500000,billingUnit:'DAY'}};
 await page.route('**/api/auth/session',r=>r.fulfill({json:{ok:true,user:null}}));
 await page.route('**/api/db/bootstrap',r=>r.fulfill({json:{ok:true,configured:true,viewerId:null,listings:[listing,...Array.from({length:11},(_,i)=>({...listing,id:listing.id+'-'+i}))],users:[{id:'fixture-owner',name:'SYNTHETIC owner',role:'lender'}],orders:[],settings:{}}}));
 await page.route('**/api/rent/**',r=>{mutations.push(r.request().method());return r.fulfill({status:503,json:{ok:false,error:'Synthetic navigation only'}})});
 await page.route('**/api/purchases',r=>{mutations.push(r.request().method());return r.fulfill({status:503,json:{ok:false,error:'Synthetic navigation only'}})});
 await page.goto(base+'/');await page.waitForFunction(()=>document.querySelector('.consent-banner')||localStorage.getItem('reloo-cookie-consent'));
 const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 for(const [app,mode] of [['rentals','RENT'],['used','SALE']]){
  const origin='/explore?transaction='+mode+'&q=SYNTHETIC&sort=newest';await page.goto(base+origin);
  const link=page.locator('a.lc__open').first();await link.waitFor();
  await page.setViewportSize({width:390,height:900});await page.evaluate(()=>window.scrollTo(0,240));await page.waitForFunction(()=>scrollY>=200);
  await page.locator('.mini-world-account').click();await page.waitForURL(/\/account\?/);await page.locator('.mini-world-return').click();await page.waitForURL(base+origin);await page.waitForFunction(()=>scrollY>=200);check(app+'-list-scroll-restored',true);
  check(app+'-rendered-detail-href-keeps-context',new URL(await link.getAttribute('href'),base).searchParams.get('app')===app);
  await link.click();await page.waitForURL(/\/product\//);await page.locator('.mini-world--'+app).waitFor();
  check(app+'-detail-context',new URL(page.url()).searchParams.get('app')===app);
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});check(app+'-detail-no-overflow-'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:root+'/'+app+'-detail-'+width+'.png'})}
  const back=new URL(page.url()).searchParams.get('returnTo');check(app+'-filter-return-preserved',back===origin);
  if(app==='used'){
   // Follow the actual primary purchase action if present; browser locator identifies rendered controls.
   const action=page.getByRole('button',{name:'Gửi yêu cầu mua',exact:true}).first();await action.click();await page.waitForURL(/\/purchase\//);
  }else{await page.goto(base+'/checkout/'+listing.id+'?app=rentals&returnTo='+encodeURIComponent(origin)+'&start=2026-11-24&end=2026-11-25&pickupTime=10%3A00&returnTime=10%3A00');await page.waitForURL(/\/rent\//);}
  await page.locator('.mini-world--'+app).waitFor();check(app+'-checkout-context',new URL(page.url()).searchParams.get('app')===app);
  if(app==='used'){
   await page.locator('textarea').fill('SYNTHETIC · meeting-area draft');await page.locator('.mini-world-account').click();await page.waitForURL(/\/account\?/);await page.goBack();await page.waitForURL(/\/purchase\//);check('purchase-draft-survives-account-return',await page.locator('textarea').inputValue()==='SYNTHETIC · meeting-area draft');
   await page.getByRole('button',{name:'Đăng nhập để mua',exact:true}).click();await page.waitForURL(/\/auth\?/);
   const resumePath=new URL(page.url()).searchParams.get('next'),resumeUrl=new URL(resumePath,base),token=resumeUrl.searchParams.get('resume');
   check('purchase-auth-handoff-url-contains-no-address',!!token&&!page.url().includes('meeting-area'));
   await page.goto(base+resumePath);await page.locator('textarea').waitFor();check('purchase-draft-survives-full-document-return',await page.locator('textarea').inputValue()==='SYNTHETIC · meeting-area draft');
   await page.route('**/api/auth/session',r=>r.fulfill({json:{ok:true,user:{id:'synthetic-buyer',name:'SYNTHETIC buyer',role:'renter',profileComplete:true,activationStatus:'ACTIVE'}}}));
   await page.reload();await page.getByRole('button',{name:'Gửi yêu cầu mua',exact:true}).waitFor();
   check('purchase-explicit-handoff-restores-to-synthetic-actor',await page.locator('textarea').inputValue()==='SYNTHETIC · meeting-area draft');
   await page.waitForFunction(token=>sessionStorage.getItem('reloo-purchase-resume:'+token)===null,token);check('purchase-resume-consumed-on-actor-return',true);
   await page.unroute('**/api/auth/session');await page.route('**/api/auth/session',r=>r.fulfill({json:{ok:true,user:null}}));await page.reload();
  }
  await page.screenshot({path:root+'/'+app+'-checkout.png'});
  await page.locator('.mini-world-account').click();await page.waitForURL(/\/account\?/);await page.locator('.mini-world--'+app).waitFor();
  const signIn=page.getByRole('link',{name:'Đăng nhập',exact:true}).first();await signIn.click();await page.waitForURL(/\/auth\?/);
  const next=new URL(new URL(page.url()).searchParams.get('next'),base);check(app+'-auth-next-retains-world',next.searchParams.get('app')===app);
  await page.locator('.mini-world-return').click();await page.waitForURL(base+origin);check(app+'-return-restores-query',page.url()===base+origin);
 }
 await page.locator('.mini-world-exit').click();await page.waitForURL(base+'/');check('exit-clears-context',await page.locator('.mini-world').count()===0);
 check('no-transaction-mutations',mutations.length===0);
 return {checks,scope:'Synthetic catalog and auth-session fixture; full document return and draft handoff exercised, no actual OAuth/provider credentials, order/payment or auth submission; real tenant/provider flows NOT_TESTED',at:new Date().toISOString()};
}
