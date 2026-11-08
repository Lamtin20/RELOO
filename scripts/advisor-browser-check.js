// UI fixtures: no external chat, real contact or AI call.
async page=>{
 page.setDefaultTimeout(60000);let handoffs=0,turns=0,withdrawals=0,transcript=[],human=false;
 const checks=[],check=(id,ok)=>{checks.push({id,ok});if(!ok)throw Error(id)};
 await page.route('**/api/auth/session',r=>r.fulfill({json:{ok:true,user:null}}));
 await page.route('**/api/db/bootstrap',r=>r.fulfill({json:{ok:true,configured:true,listings:[],users:[],orders:[],settings:{}}}));
 await page.route('**/api/support*',async r=>{
  if(r.request().method()==='DELETE'){withdrawals++;human=false;return r.fulfill({json:{ok:true}})}
  if(r.request().method()==='GET')return r.fulfill({json:{ok:true,status:human?'WAITING':'OPEN',messages:transcript}});
  const d=r.request().postDataJSON();if(d.action==='handoff'){handoffs++;human=true;return r.fulfill({json:{ok:true,conversationId:'10000000-0000-4000-8000-000000000001',status:'WAITING',handoff:true,answer:'Đã lưu yêu cầu thử.'}})}
  if(human){transcript.push({role:'USER',body:d.message});return r.fulfill({json:{ok:true,conversationId:'10000000-0000-4000-8000-000000000001',status:'WAITING',queued:true,answer:null}})}
  turns++;transcript=[{role:'USER',body:d.message},{role:'ASSISTANT',body:'Trễ dưới 1 giờ: miễn phí. Không tự trừ tiền.'}];return r.fulfill({json:{ok:true,conversationId:'10000000-0000-4000-8000-000000000001',status:'OPEN',answer:'Trễ dưới 1 giờ: miễn phí. Không tự trừ tiền.',model:'RELOO_RULES',products:[],sources:[{title:'Thông tin thuê',url:'/cms/rental-guide'}]}});
 });
 await page.goto('http://127.0.0.1:4522/');
 await page.evaluate(()=>sessionStorage.removeItem('reloo-support-conversation'));
 await page.getByRole('button',{name:'Tư vấn RELOO',exact:true}).waitFor();
 const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 await page.getByRole('button',{name:'Tư vấn RELOO',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Tư vấn RELOO',exact:true});await dialog.waitFor();
 check('guest-can-chat-without-signin',await dialog.getByRole('textbox',{name:'Câu hỏi tư vấn'}).isEnabled());
 check('no-marketing-opt-in-by-default',!await dialog.locator('.advisor-optional input').isChecked());
 await dialog.getByRole('button',{name:'Trả trễ',exact:true}).click();await dialog.getByText('Trễ dưới 1 giờ: miễn phí. Không tự trừ tiền.',{exact:true}).waitFor();check('one-request-per-action',turns===1);
 await dialog.getByRole('button',{name:'Nhờ nhân viên liên hệ',exact:true}).click();
 check('contact-consent-unchecked',!await dialog.locator('[name=consent]').isChecked());
 await dialog.locator('[name=email]').fill('synthetic@example.invalid');await dialog.locator('[name=consent]').check();
 await dialog.getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await dialog.getByText('Đã lưu yêu cầu liên hệ.',{exact:true}).waitFor();
 check('handoff-keeps-customer-composer',await dialog.getByRole('textbox',{name:'Câu hỏi tư vấn'}).isEnabled());check('one-handoff',handoffs===1);
 await dialog.getByRole('textbox',{name:'Câu hỏi tư vấn'}).fill('SYNTHETIC · additional detail');await dialog.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await dialog.getByText('SYNTHETIC · additional detail',{exact:true}).waitFor();check('customer-can-continue-with-human',true);
 await dialog.getByRole('button',{name:'Rút yêu cầu liên hệ'}).click();await dialog.getByText('Đã rút yêu cầu và xóa liên hệ khỏi yêu cầu tư vấn.',{exact:true}).waitFor();check('withdraw-processed',withdrawals===1);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});check('no-overflow-'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'output/playwright/advisor-20261024/chat-'+width+'.png'})}
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});check('focus-restored',await page.getByRole('button',{name:'Tư vấn RELOO',exact:true}).evaluate(n=>n===document.activeElement));
 check('no-invitation-after-refusal',await page.locator('.advisor-invitation').count()===0);
 return {checks,scope:'Synthetic browser UI, lead opt-in/withdrawal, keyboard and responsive. AI provider and database tested separately.'};
}
