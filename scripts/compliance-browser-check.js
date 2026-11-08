// Real local browser interactions. All measurement writes intercepted as synthetic.
async page=>{
 page.setDefaultTimeout(60000);await page.unrouteAll({behavior:'wait'});
 const root='output/compliance',base='http://127.0.0.1:4522',checks=[],posts=[],external=[];
 const check=(id,ok)=>{checks.push({id,ok});if(!ok)throw Error(id)};
 await page.context().clearCookies();await page.goto(base+'/');await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('reloo-ui-language:guest','vi-VN')});
 await page.route('**/api/journey',async route=>{if(route.request().method()==='POST'){posts.push(new URL(route.request().url()).pathname);await route.fulfill({json:{ok:true}})}else await route.fulfill({json:{enabled:true}})});
 await page.route(/^https?:\/\/(?!127\.0\.0\.1:4522)/,route=>{external.push(new URL(route.request().url()).hostname);return route.abort()});
 await page.goto(base+'/');await page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true}).waitFor();await page.waitForLoadState('networkidle');
 check('fresh-no-measurement-post',posts.length===0);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:root+'/consent-mobile.png'});
 await page.getByRole('button',{name:'Tùy chỉnh',exact:true}).click();
 check('optional-checkboxes-default-off',await page.locator('.consent-settings input[type=checkbox]').evaluateAll(nodes=>nodes.length===2&&nodes.every(n=>!n.checked)));
 await page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true}).click();await page.goto(base+'/explore');await page.waitForLoadState('networkidle');
 check('rejected-no-measurement-post',posts.length===0);
 await page.evaluate(()=>window.dispatchEvent(new Event('reloo-cookie-settings')));await page.locator('.consent-settings').waitFor();
 await page.locator('.consent-settings input[type=checkbox]').first().check();
 const sent=page.waitForRequest(r=>r.method()==='POST'&&new URL(r.url()).pathname==='/api/journey');
 await page.getByRole('button',{name:'Lưu lựa chọn',exact:true}).click();await sent;
 check('explicit-analytics-consent-produces-synthetic-measurement',posts.length>0);
 await page.evaluate(()=>window.dispatchEvent(new Event('reloo-cookie-settings')));await page.locator('.consent-settings').waitFor();await page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true}).click();await page.waitForLoadState('networkidle');
 const before=posts.length;await page.goto(base+'/');await page.waitForLoadState('networkidle');check('withdrawal-stops-measurement-post',posts.length===before);
 check('withdrawal-clears-optional-identifiers',await page.evaluate(()=>!localStorage.getItem('reloo_analytics_visitor')&&!sessionStorage.getItem('reloo_analytics_session_v2')));
 const guest=await page.request.get(base+'/api/admin/compliance');check('actual-guest-api-does-not-disclose-report',guest.status()!==200);
 await page.route('**/api/auth/session',route=>route.fulfill({json:{ok:true,user:{id:'guardian-ui-fixture',name:'Guardian QA · SYNTHETIC',role:'admin',profileComplete:true,activationStatus:'ACTIVE'}}}));
 await page.route('**/api/admin/compliance',route=>route.fulfill({path:'output/compliance/latest.json',contentType:'application/json'}));
 await page.goto(base+'/admin/compliance');await page.getByRole('heading',{name:'Compliance Guardian',exact:true}).waitFor();await page.getByRole('table').waitFor();
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});check('dashboard-no-document-overflow-'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:root+'/dashboard-'+width+'.png'})}
 await page.unroute('**/api/auth/session');await page.unroute('**/api/admin/compliance');
 return {checks,externalRequestsAborted:[...new Set(external)],scope:'Local only; measurement POSTs intercepted, no analytics stored; dashboard session and report intercepted only for UI. Guest real API denied; no positive backend admin authorization claim.',at:new Date().toISOString()};
}
