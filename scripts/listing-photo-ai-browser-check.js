// Synthetic browser transport checks; not live recognition accuracy or Google access.
async page=>{
 page.setDefaultTimeout(60000);
 const base='http://127.0.0.1:4537',root='output/verification/one-shot-listing-20261107';
 const checks=[],errors=[],check=(name,ok)=>{checks.push({name,ok});if(!ok)throw Error(name)};
 page.on('pageerror',error=>errors.push(error.message));
 let mode='fast',photoCount=0,researchCount=0,publishCount=0,releasePhoto,releaseResearch,startedPhoto,startedResearch;
 let photoStarted,researchStarted;
 function barriers(){photoStarted=new Promise(resolve=>startedPhoto=resolve);researchStarted=new Promise(resolve=>startedResearch=resolve);}
 barriers();
 const sony={brand:'Sony',model:'ILCE-7M4',category:'may-anh'},marshall={brand:'Marshall',model:'Acton II',category:'am-thanh'};
 const proposal=identity=>({ok:true,status:'IDENTIFIED',identity,patch:{},sources:[],candidates:[],reviewRequired:true});
 const sourced=identity=>({ok:true,status:'SOURCED',identity,patch:{title:identity.brand+' '+identity.model,category:identity.category,description:'DEMO · Source-backed product description',specs:identity.brand==='Sony'?{brand:'Sony',model:'ILCE-7M4',sensor:'DEMO · Full-frame CMOS'}:{brand:'Marshall',type:'Loa / Acton II',power:'DEMO · 30 Watt amplifier'}},sources:[{url:identity.brand==='Sony'?'https://www.sony.com/electronics/ilce-7m4':'https://www.marshall.com/support/acton-ii',title:'DEMO · Official source',retrievedAt:'2026-11-07T10:00:00Z'}],research:{provider:'google'},reviewRequired:true});
 await page.addInitScript(()=>{
  if(navigator.mediaDevices)Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const canvas=document.createElement('canvas');canvas.width=800;canvas.height=500;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,800,500);ctx.fillStyle='black';ctx.font='42px sans-serif';ctx.fillText('DEMO Sony ILCE-7M4',30,220);return canvas.captureStream(5)}});
 });
 await page.route('**/api/auth/session',route=>route.fulfill({json:{ok:true,user:null}}));
 await page.route('**/api/db/bootstrap',route=>route.fulfill({json:{ok:true,configured:true,listings:[],users:[],orders:[],settings:{}}}));
 await page.route('**/api/listings',route=>{if(route.request().method()==='POST')publishCount++;return route.fulfill({status:503,json:{ok:false}})});
 let switchIdentity=0,swapResearch=0;
 await page.route('**/api/listings/assist',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{ok:true,enabled:mode!=='unavailable',noticeVersion:'listing-photo-assist-v2',primarySearch:'google',searchReady:true,imageStaysLocal:true}});
  const body=route.request().postDataJSON();check('current-purpose-notice',body.noticeVersion==='listing-photo-assist-v2');check('request-has-idempotency-key',/^[a-f0-9-]{36}$/i.test(body.requestId));
  if(mode==='network')return route.abort('timedout');
  if(body.action==='identify'){
   photoCount++;startedPhoto?.();
   if(mode==='delayed')await new Promise(resolve=>releasePhoto=resolve);
   if(mode==='ambiguous')return route.fulfill({json:{...proposal({...sony,model:''}),status:'NEEDS_DETAIL',candidates:['ILCE-7M4','ILCE-7M3']}});
   if(mode==='mismatch')return route.fulfill({json:{ok:true,status:'NEEDS_DETAIL',identity:null,candidates:[],patch:{},sources:[]}});
   if(mode==='swap')return route.fulfill({json:proposal(switchIdentity++===0?sony:marshall)});
   return route.fulfill({json:proposal(sony)});
  }
  researchCount++;startedResearch?.();
  check('research-does-not-send-image-or-account',!body.image&&!body.userId&&!body.email&&!body.phone&&Object.keys(body.identity).every(key=>['brand','model','category'].includes(key)));
  if(mode==='delayed'||mode==='cancel'||mode==='swap'&&swapResearch++===0)await new Promise(resolve=>releaseResearch=resolve);
  if(mode==='research-error')return route.fulfill({status:503,json:{ok:false,code:'RESEARCH_UNAVAILABLE'}});
  try{return await route.fulfill({json:sourced(body.identity)})}catch{/* A cancelled request must never update the page. */}
 });
 await page.goto(base+'/lend');await page.evaluate(()=>{localStorage.setItem('reloo-ui-language:guest','vi-VN');document.cookie='reloo-ui-language=vi-VN; Path=/; SameSite=Lax';sessionStorage.removeItem('reloo-owner-draft-v3:guest')});await page.reload();await page.locator('.listing-photo-assist').waitFor();
 const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 async function fresh(next){mode=next;barriers();await page.evaluate(()=>sessionStorage.removeItem('reloo-owner-draft-v3:guest'));await page.goto(base+'/lend');await page.locator('.listing-photo-assist').waitFor();await page.locator('#owner-title').waitFor();}
 const upload=(index=0)=>page.locator('.owner-upload input[type=file]').first().setInputFiles(root+'/photo-'+index+'.webp');
 const done=()=>page.locator('.listing-photo-result').getByText(/Đã điền|details filled/).waitFor();
 check('notice-before-photo',await page.locator('.listing-photo-notice').isVisible());check('no-analysis-before-photo',photoCount===0&&researchCount===0);
 // Real composer capture path, synthetic local camera stream, fixture recognition.
 await page.getByRole('button',{name:'Chụp ảnh',exact:true}).click();await page.getByRole('button',{name:'Chụp & dùng ảnh',exact:true}).click();await done();
 check('one-camera-capture-starts-identification-and-research',photoCount===1&&researchCount===1);check('one-shot-fills-title',await page.locator('#owner-title').inputValue()==='Sony ILCE-7M4');check('condition-is-not-guessed',await page.locator('#owner-condition').inputValue()==='');
 check('no-extra-ai-start-or-confirm-button',await page.getByRole('button',{name:'Xác nhận · Điền thông tin',exact:true}).count()===0&&await page.getByRole('button',{name:'Gợi ý từ ảnh này',exact:true}).count()===0);
 await fresh('delayed');await upload();await photoStarted;
 await page.locator('#owner-title').fill('DEMO · My manual title');releasePhoto();await researchStarted;
 check('research-starts-without-second-click',true);await page.locator('#owner-category').selectOption('may-anh');await page.locator('#owner-description').fill('DEMO · My manual description');await page.locator('#spec-sensor').fill('DEMO · My sensor');releaseResearch();await done();
 check('late-result-preserves-manual-title',await page.locator('#owner-title').inputValue()==='DEMO · My manual title');check('late-result-preserves-description',await page.locator('#owner-description').inputValue()==='DEMO · My manual description');check('late-result-preserves-specification',await page.locator('#spec-sensor').inputValue()==='DEMO · My sensor');check('supported-brand-model-autofilled',await page.locator('#spec-brand').inputValue()==='Sony'&&await page.locator('#spec-model').inputValue()==='ILCE-7M4');
 check('source-link-safe',await page.locator('.listing-photo-sources a').first().getAttribute('rel')==='noopener noreferrer');
 check('source-retrieval-date-visible',(await page.locator('.listing-photo-sources').innerText()).includes('2026-11-07'));
 await page.locator('#owner-description').fill('');await page.getByRole('checkbox',{name:'Bật gợi ý',exact:true}).uncheck();await page.reload();await page.locator('.listing-photo-assist').waitFor();
 check('opt-out-and-cleared-draft-persist',!await page.getByRole('checkbox',{name:'Bật gợi ý',exact:true}).isChecked()&&await page.locator('#owner-description').inputValue()==='');
 const touched=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('reloo-owner-draft-v3:guest')).photoAssistTouched);check('manual-field-protection-is-saved',touched.includes('description')&&touched.includes('title'));
 mode='fast';await page.getByRole('checkbox',{name:'Bật gợi ý',exact:true}).check();await done();check('cleared-field-not-overwritten-after-reload',await page.locator('#owner-description').inputValue()==='');
 await page.locator('#owner-description').fill('DEMO · Owner description');await page.locator('#owner-condition').selectOption('good');await page.locator('#spec-accessories').fill('DEMO · No accessories');
 const before=photoCount;await page.locator('.owner-form__actions').getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.locator('#owner-transaction').waitFor();
 for(const transaction of ['SALE','RENT','BOTH']){await page.locator('#owner-transaction').selectOption(transaction);check(transaction+'-price-fields',await page.locator('#owner-sale-price').count()===(transaction==='RENT'?0:1)&&await page.locator('#owner-price').count()===(transaction==='SALE'?0:1));}
 await page.locator('#owner-price').fill('150000');await page.locator('#owner-sale-price').fill('12000000');await page.locator('#owner-value').fill('20000000');await page.locator('.owner-form__actions').getByRole('button',{name:'Quay lại',exact:true}).click();await page.locator('#owner-title').waitFor();check('returning-to-photo-step-does-not-rerun',photoCount===before);
 await page.locator('.owner-form__actions').getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.locator('#owner-price').waitFor();check('rental-and-sale-prices-preserved',await page.locator('#owner-price').inputValue()==='150000'&&await page.locator('#owner-sale-price').inputValue()==='12000000');
 await page.locator('.owner-form__actions').getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.locator('.owner-review-confirmation').waitFor();
 check('publication-confirmation-starts-unchecked',!await page.locator('.owner-review-confirmation input').isChecked());await page.locator('.owner-form__actions button[type=submit]').click();check('no-auto-publication',publishCount===0);check('unchecked-final-confirmation-shows-error',await page.locator('.owner-review-confirmation [role=alert]').count()===1);
 await fresh('ambiguous');const priorResearch=researchCount;await upload();await page.locator('[name=photo-model-confirmation]').waitFor();check('ambiguous-model-not-guessed',await page.locator('#owner-title').inputValue()===''&&researchCount===priorResearch);await page.locator('[name=photo-model-confirmation]').fill('ILCE-7M4');await page.locator('[name=photo-model-confirmation]').press('Enter');await done();check('only-missing-model-confirmation-needed',await page.locator('#owner-title').inputValue()==='Sony ILCE-7M4');
 await fresh('research-error');await upload();await done();check('research-outage-keeps-grounded-photo-identity',await page.locator('#owner-title').inputValue()==='Sony ILCE-7M4'&&await page.locator('#owner-description').inputValue()==='Máy ảnh Sony ILCE-7M4.');check('unverified-specification-stays-empty',await page.locator('#spec-sensor').inputValue()==='');
 await fresh('cancel');await upload();await researchStarted;await page.getByRole('button',{name:'Tiếp tục tự nhập',exact:true}).click();await page.locator('#owner-title').fill('DEMO · Cancelled');releaseResearch();await page.locator('.listing-photo-progress').waitFor({state:'detached'});check('cancel-preserves-photo-and-manual-draft',await page.locator('#owner-title').inputValue()==='DEMO · Cancelled'&&await page.locator('.dashboard-image-list__item').count()===1);
 await fresh('swap');switchIdentity=0;swapResearch=0;await upload();await researchStarted;await upload(1);await done();releaseResearch();check('new-photo-invalidates-old-research',await page.locator('#owner-title').inputValue()==='Marshall Acton II'&&await page.locator('#owner-category').inputValue()==='am-thanh');
 await fresh('network');await upload();await page.getByRole('button',{name:'Thử lại với ảnh này',exact:true}).waitFor();check('network-timeout-keeps-manual-entry',await page.locator('#owner-title').isEnabled()&&await page.locator('.dashboard-image-list__item').count()===1);
 await fresh('unavailable');const unavailableCount=photoCount;await upload();await page.getByText('Hỗ trợ ảnh chưa sẵn sàng. Bạn vẫn có thể tự điền.',{exact:false}).waitFor();check('unavailable-service-keeps-old-manual-flow',await page.locator('#owner-title').isEnabled()&&photoCount===unavailableCount);
 await fresh('fast');await upload();await done();await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
 for(const locale of ['vi-VN','en-US']){
  await page.evaluate(locale=>{localStorage.setItem('reloo-ui-language:guest',locale);document.cookie='reloo-ui-language='+locale+'; Path=/; SameSite=Lax'},locale);
  await page.reload();await page.locator('.listing-photo-assist').waitFor();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});check(locale+'-no-overflow-'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.owner-upload').scrollIntoViewIfNeeded();await page.screenshot({path:root+'/listing-'+locale+'-'+width+'.png',animations:'disabled'});}
 }
 await page.emulateMedia({reducedMotion:'reduce'});check('reduced-motion',await page.locator('.listing-photo-assist').evaluate(el=>!el.querySelector('.spin')||getComputedStyle(el.querySelector('.spin')).animationName==='none'));
 check('assistance-never-publishes',publishCount===0);check('no-browser-exceptions',errors.length===0);
 return {checks,errors,photoCount,researchCount,publishCount,scope:'Synthetic camera and service transport only. Not real vision accuracy, Google credentials, device camera or production publication.'};
}

