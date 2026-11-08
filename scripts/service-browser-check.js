// UI-only synthetic transport fixture. SQL and live HTTPS tests are separate.
async page=>{
 const origin='http://127.0.0.1:4522',id='41000000-0000-4000-8000-000000000001',checks=[],check=(id,ok)=>{checks.push({id,ok});if(!ok)throw Error(id)};
 let sends=0,requests=[];const offer={id,title:'DEMO · Lắp ráp bàn và kệ',category:'assembly',city:'HCM',rate:120000,unit:'HOUR',demo:true};
 await page.route('**/api/auth/session',r=>r.fulfill({json:{ok:true,user:{id:'uat-reviewer',name:'DEMO reviewer',role:'renter',activationStatus:'PENDING',serverAuthenticated:true}}}));
 await page.route('**/api/db/bootstrap',r=>r.fulfill({json:{ok:true,configured:true,listings:[],users:[],orders:[],settings:{}}}));
 await page.route('**/api/services',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{ok:true,available:true,demo:true,actor:'uat-reviewer',offers:[offer],mine:[],requests}});
  const d=route.request().postDataJSON();if(d.action==='clarify')return route.fulfill({json:{ok:true,category:'assembly',city:'HCM',question:'B\u1ea1n mu\u1ed1n b\u1eaft \u0111\u1ea7u l\u00fac n\u00e0o v\u00e0 c\u1ea7n bao nhi\u00eau gi\u1edd?'}});if(d.action==='send'){sends++;requests=[{id:'42000000-0000-4000-8000-000000000001',requester_id:'uat-reviewer',provider_id:'provider',offer_id:id,status:'SENT',need:{...d.need,listedRate:120000,offerTitle:offer.title},service_events:[{id:1,kind:'SENT',created_at:new Date().toISOString()}],expires_at:new Date(Date.now()+86400000).toISOString()}];return route.fulfill({json:{ok:true,id:requests[0].id}})}return route.fulfill({status:400,json:{code:'INVALID_INPUT'}});
 });
 await page.goto(origin+'/viec-lam/dich-vu');const decline=page.getByRole('button',{name:/Chỉ cookie cần thiết|Necessary cookies only/});if(await decline.isVisible())await decline.click();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1200});check(width+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.service-hub').screenshot({path:'output/playwright/services-20261024/discover-'+width+'.png'});}
 await page.setViewportSize({width:390,height:1200});await page.getByLabel('Bạn cần hỗ trợ việc gì?').fill('Lắp bàn ở TP. Hồ Chí Minh');await page.getByRole('button',{name:'Làm rõ nhu cầu',exact:true}).click();
 await page.getByText('Bạn muốn bắt đầu lúc nào và cần bao nhiêu giờ?',{exact:true}).waitFor();check('clarifying one next question',await page.getByText('Bạn muốn bắt đầu lúc nào và cần bao nhiêu giờ?',{exact:true}).isVisible());
 const start=new Date(Date.now()+2*86400000).toISOString().slice(0,10)+'T10:00';await page.locator('input[name="service-start"]').fill(start);
 await page.getByRole('button',{name:'Xem người phù hợp',exact:true}).click();check('matched demo offer shown',await page.getByRole('heading',{name:offer.title}).isVisible());
 await page.getByRole('button',{name:'Kiểm tra & gửi yêu cầu thử',exact:true}).click();check('review has no premature request',sends===0);
 const dialog=page.getByRole('dialog');await dialog.locator('button[type="submit"]').click();check('unchecked terms prevent send',sends===0);
 await dialog.getByRole('checkbox').check();await dialog.locator('button[type="submit"]').click();await page.getByText('Đã gửi',{exact:true}).waitFor();check('single reviewed request',sends===1);
 await page.locator('.service-hub').screenshot({path:'output/playwright/services-20261024/request-390.png'});
 await page.getByRole('button',{name:'Tôi cung cấp dịch vụ',exact:true}).click();check('provider form has no DOB or gender',await page.getByLabel('Tên gói').isVisible()&&await page.getByText('Ngày sinh',{exact:true}).count()===0);
 await page.getByRole('button',{name:'Tìm dịch vụ',exact:true}).click();check('form progress preserved between tabs',await page.locator('input[name="service-start"]').inputValue()===start);
 await page.emulateMedia({reducedMotion:'reduce'});check('reduced motion',await page.locator('.service-primary').first().evaluate(el=>getComputedStyle(el).transitionDuration==='0s'));
 return {checks,scope:'Synthetic browser UI fixture only. No real provider dispatch, payment or subscription.'};
}
