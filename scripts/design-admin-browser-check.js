// Browser-only synthetic session for visual QA. Never grants real API permissions.
async page => {
 page.setDefaultTimeout(60000);
 const base='http://127.0.0.1:4522',root='output/playwright/design-20261023',checks=[];
 const check=(id,ok)=>{if(!ok)throw Error(id);checks.push(id)};
 await page.route('**/api/auth/session',route=>route.fulfill({json:{ok:true,user:{id:'ui-test-admin',name:'QA Admin · SYNTHETIC',role:'admin',profileComplete:true,activationStatus:'ACTIVE'}}}));
 await page.goto(base+'/admin/risk');await page.getByText('QA Admin · SYNTHETIC',{exact:true}).waitFor();
 const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 await page.setViewportSize({width:390,height:844});
 const menu=page.getByRole('button',{name:'Mở menu',exact:true});await menu.click();
 check('mobile-sidebar-visible',await page.locator('#reloo-admin-sidebar').isVisible());
 await page.waitForFunction(()=>Math.abs(document.getElementById('reloo-admin-sidebar').getBoundingClientRect().left)<1);
 check('mobile-sidebar-initial-focus',await page.locator('#reloo-admin-sidebar').evaluate(el=>el.contains(document.activeElement)));
 await page.screenshot({path:root+'/admin-mobile-menu.png'});await page.keyboard.press('Escape');
 check('mobile-sidebar-closes',!(await page.locator('.admin-shell').getAttribute('class')).includes('admin-shell--menu-open'));
 await page.getByRole('button',{name:/QA Admin/}).click();
 check('no-demo-role-switcher',!(await page.locator('.admin-user-menu').innerText()).includes('demo'));
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Thông báo',exact:true}).click();await page.getByRole('dialog',{name:/Thông báo/}).waitFor();
 checks.push('admin-notification-button-opens-real-component');await page.keyboard.press('Escape');
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:root+'/admin-desktop-error-state.png'});
 check('admin-desktop-no-horizontal-overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.unroute('**/api/auth/session');await page.goto(base+'/admin/risk');await page.getByRole('heading',{name:'Bạn chưa có quyền truy cập',exact:true}).waitFor();checks.push('actual-guest-guard-restored');
 return {checks,auth:'UI SESSION INTERCEPTED ONLY. Data APIs still use real local authorization and may be unavailable; no production/admin permission test claimed.',at:new Date().toISOString()};
}
