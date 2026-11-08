// Synthetic API fixture; never authenticates as a real staff member.
async page=>{
 const checks=[],check=(id,ok)=>{checks.push({id,ok});if(!ok)throw Error(id)},root='http://127.0.0.1:4522',id='51000000-0000-4000-8000-000000000001';let saved=null,preview=0;
 const brain={enabled:true,modelEnabled:false,name:'RELOO',subtitle:'Advice',greeting:{'vi-VN':'Bạn đang cần gì?','en-US':'What can we help you find?'},quickPrompts:{'vi-VN':['Gặp nhân viên'],'en-US':['Talk to staff']},modules:['rentals','used','stays','jobs','general'],engagement:{waitSeconds:15,priceViews:2,priceSeconds:30,productPages:2,productSeconds:45,maxInvites:1,expiresSeconds:120,dismissHours:24}};
 await page.route('**/api/auth/session',r=>r.fulfill({json:{ok:true,user:null}}));await page.route('**/api/db/bootstrap',r=>r.fulfill({json:{ok:true,configured:false,listings:[],users:[],orders:[],settings:{}}}));
 await page.route('**/api/crm/ai/**',async route=>{const u=new URL(route.request().url()),resource=u.pathname.split('/').pop();let d={ok:true};
 if(resource==='session')d={...d,user:{id:'fixture-manager',name:'DEMO manager'},permissions:['*'],expiresAt:Date.now()+3600000,environment:'staging'};
 if(resource==='overview')d={...d,summary:{events:0,waiting:0,human:0,fallbacks:0},coverage:[{id:'support',label:'Customer advisor',status:'INSTRUMENTED'},{id:'peer',label:'Private messages',status:'PRIVATE_NOT_MIRRORED'}]};
 if(resource==='versions')d={...d,legacy:true,active:null,versions:saved?[{id,version:1,status:'DRAFT',created_at:new Date().toISOString()}]:[],defaults:brain,selected:saved?{id,version:1,config:saved.config,knowledge:saved.knowledge}:null};
 if(resource==='catalog')d.products=[];if(['events','audit','leads','inbox'].includes(resource)){d.rows=[];d.nextCursor=null}
 if(resource==='draft'){saved=route.request().postDataJSON();d={...d,id,version:1}}
 if(resource==='preview'){preview++;d={...d,answer:'DEMO grounded answer',products:[],model:'RELOO_RULES',trace:{decision:'RULE_MATCH'}}}
 return route.fulfill({json:d});});
 await page.goto(root+'/chat-control');await page.locator('.cc-metrics').waitFor();check('overview real zero values, not fabricated counts',await page.locator('.cc-metrics strong').allTextContents().then(v=>v.every(s=>s==='0')));
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1100});check('overview '+width+' no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'output/playwright/chat-control-20261024/overview-'+width+'.png',fullPage:true});}
 await page.getByRole('button',{name:/Bộ não & kiến thức|Brain & knowledge/}).click();await page.getByRole('button',{name:/Lưu bản nháp|Save draft/,exact:true}).click();await page.locator('.cc-notice').waitFor();check('draft saved to isolated fixture',!!saved&&saved.config.name==='RELOO');
 await page.locator('.cc-editor-tabs button').last().click();await page.locator('[name=preview-question]').fill('Find a camera');await page.locator('.cc-preview-grid form button').click();await page.getByText('DEMO grounded answer',{exact:true}).waitFor();check('preview separate from customer conversation',preview===1);
 await page.screenshot({path:'output/playwright/chat-control-20261024/preview-1440.png',fullPage:true});
 await page.getByRole('button',{name:/Xuất bản \/ kích hoạt|Publish \/ activate/}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();check('publication requires explicit review',await dialog.getByRole('checkbox').isChecked()===false);await page.keyboard.press('Escape');check('Escape closes dialog',await dialog.isVisible()===false);
 await page.getByRole('button',{name:/Hội thoại|Conversations/,exact:true}).click();check('empty inbox state',await page.locator('.cc-desk').isVisible());await page.setViewportSize({width:390,height:1100});check('inbox no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'output/playwright/chat-control-20261024/inbox-390.png',fullPage:true});
 await page.keyboard.press('Tab');check('keyboard focus visible',await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle!=='none'));
 return {checks,scope:'Synthetic transport only; no real MFA, publication, contact or customer response.'};
}
