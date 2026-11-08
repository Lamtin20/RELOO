// Read-only synthetic API fixtures; does not save CRM or publish legal documents.
async page=>{
 page.setDefaultTimeout(60000);await page.unrouteAll({behavior:'wait'});
 const base='http://127.0.0.1:4522',checks=[],context=page.context();let entity={legalName:null,taxId:null,address:null,representative:null,supportEmail:null,privacyEmail:null},version=1;
 const business=route=>route.fulfill({json:{ok:true,version,entity,entityReady:false,deposit:{enabled:false}}});
 await context.route('**/api/business',business);
 await context.route('**/api/legal/terms',route=>route.fulfill({json:{ok:true,document:{title:'SYNTHETIC legal draft',operator:entity.legalName||'RELOO',entitySnapshot:entity,entityVersion:version,draft:true,hash:'synthetic-'+version,sections:[{title:'SYNTHETIC operator',paragraphs:[entity.legalName||'Not declared']}],sources:[],updatedAt:'2026-10-23'}}}));
 const check=(id,ok)=>{checks.push({id,ok});if(!ok)throw Error(id)};
 await page.goto(base+'/');await page.waitForFunction(()=>document.querySelector('.consent-banner')||localStorage.getItem('reloo-cookie-consent'));const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 check('undeclared-entity-does-not-render-literal-null',!(await page.locator('footer').innerText()).includes('[null]'));
 entity={...entity,legalName:'SYNTHETIC CRM company',taxId:'0123456789',address:'SYNTHETIC address',privacyEmail:'privacy@example.invalid'};version++;
 await page.evaluate(()=>window.dispatchEvent(new Event('reloo-business-changed')));await page.locator('footer').getByText(/SYNTHETIC CRM company/).waitFor();check('same-tab-refreshes-canonical-company',true);
 const privacy=await context.newPage();await privacy.goto(base+'/cms/privacy');await privacy.getByText('SYNTHETIC CRM company',{exact:false}).first().waitFor();
 entity={...entity,legalName:'SYNTHETIC CRM company updated'};version++;
 await page.evaluate(()=>{const c=new BroadcastChannel('reloo-business-changed');c.postMessage('refresh');c.close()});
 await privacy.getByText(/SYNTHETIC CRM company updated/).first().waitFor();check('cross-tab-privacy-identity-refreshes',true);
 await privacy.goto(base+'/cms/data-collection');await privacy.getByText(/SYNTHETIC CRM company updated/).first().waitFor();check('data-collection-uses-same-company',true);
 await privacy.goto(base+'/cms/terms');await privacy.getByText('SYNTHETIC CRM company updated',{exact:true}).first().waitFor();check('legal-draft-refreshes-with-entity-version',await privacy.locator('.legal-document').innerText().then(t=>t.includes('SYNTHETIC')));
 await privacy.setViewportSize({width:390,height:844});await privacy.screenshot({path:'output/legal-review/company-draft-mobile.png'});check('legal-draft-no-horizontal-overflow',await privacy.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await privacy.close();await context.unroute('**/api/business',business);await context.unroute('**/api/legal/terms');
 return {checks,scope:'Synthetic null/company/CRM signal and draft document API fixtures. No actual CRM write, publication or real company assertion. Does not verify all historical/static company references.',at:new Date().toISOString()};
}
