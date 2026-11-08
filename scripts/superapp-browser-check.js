// Run through playwright-cli after opening the isolated local stays preview.
async page => {
 page.setDefaultTimeout(60000);
 const base='http://127.0.0.1:4522',root='output/playwright/superapp',checks=[];
 const check=(id,ok)=>{if(!ok)throw Error(id);checks.push(id)};
 await page.goto(base+'/');
 const services=page.getByRole('navigation',{name:'Dịch vụ RELOO',exact:true});await services.waitFor();
 await page.waitForFunction(()=>document.querySelector('.consent-banner')||localStorage.getItem('reloo-cookie-consent'));
 const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 check('four-service-entries',await services.getByRole('link').count()===4);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  check('home-no-horizontal-overflow-'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:root+'/home-'+width+'.png'});
  if(width<=768){const nav=page.getByRole('navigation',{name:'Điều hướng di động',exact:true});check('five-public-nav-items-'+width,await nav.getByRole('link').count()===5)}
 }
 await page.setViewportSize({width:390,height:844});
 const search=page.getByRole('search',{name:'Bạn đang cần gì?',exact:true});await search.getByRole('textbox').fill('Balo & lều');await search.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
 await page.getByRole('heading',{name:'Bạn muốn tìm trong dịch vụ nào?',exact:true}).waitFor();
 check('ambiguous-intent-shows-domains',new URL(page.url()).searchParams.get('q')==='Balo & lều');
 const used=page.locator('.sa-app--used');check('sale-query-preserved',new URL(await used.getAttribute('href'),base).searchParams.get('transaction')==='SALE'&&new URL(await used.getAttribute('href'),base).searchParams.get('q')==='Balo & lều');
 await page.screenshot({path:root+'/search-mobile.png',fullPage:true});
 await page.goto(base+'/dang-tin');await page.getByRole('heading',{name:'Bạn muốn đăng gì?',exact:true}).waitFor();await page.locator('.sa-app--used').click();
 await page.getByRole('textbox',{name:'Tên món đồ',exact:true}).waitFor();check('posting-sale-route-intent',new URL(page.url()).searchParams.get('intent')==='SALE');
 await page.goto(base+'/giao-dich');await page.getByRole('heading',{name:'Giao dịch của bạn',exact:true}).waitFor();await page.getByRole('link',{name:'Đăng nhập để xem giao dịch',exact:true}).waitFor();checks.push('guest-transactions-retains-auth-continuation');
 await page.screenshot({path:root+'/transactions-mobile.png',fullPage:true});
 await page.goto(base+'/viec-lam?role=employer');await page.getByRole('button',{name:'Tôi tìm người làm',exact:true}).waitFor();check('employer-role-context',await page.getByRole('button',{name:'Tôi tìm người làm',exact:true}).getAttribute('aria-pressed')==='true');
 await page.getByRole('button',{name:'Full-time',exact:true}).click();await page.getByText('Chưa có tin tuyển dụng được mở trên RELOO.',{exact:true}).waitFor();checks.push('jobs-closed-no-fake-applications');
 await page.screenshot({path:root+'/jobs-mobile.png',fullPage:true});
 await page.goto(base+'/dat-phong?tab=orders');await page.getByRole('heading',{name:'Đơn của tôi',exact:true}).waitFor();checks.push('booking-transactions-deep-link');
 await page.evaluate(()=>localStorage.setItem('reloo-ui-language:guest','en-US'));
 await page.goto(base+'/');await page.getByRole('heading',{name:'What do you need today?',exact:true}).waitFor();
 await page.getByRole('navigation',{name:'RELOO services',exact:true}).waitFor();checks.push('english-from-existing-locale-provider');await page.screenshot({path:root+'/home-english.png'});
 await page.evaluate(()=>localStorage.setItem('reloo-ui-language:guest','vi-VN'));
 return {checks,mode:'Local isolated preview. Existing auth service unavailable; no real payment/notifications. No hosted staging/native acceptance.',at:new Date().toISOString()};
}
