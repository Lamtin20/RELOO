// Synthetic UI acceptance only. No real leads, bookings, model calls or payments.
async page=>{
 page.setDefaultTimeout(60000);const id='10000000-0000-4000-8000-000000000001',checks=[],check=(name,ok)=>{checks.push({name,ok});if(!ok)throw Error(name)};
 let transcript=[],posts=0,orders=0,offline=false,ownedId=null;
 const products=[1,2,3].map(n=>({id:'demo-camera-'+n,title:'DEMO · Máy ảnh '+n,href:'/product/demo-camera-'+n,price:150000,unit:'DAY',images:['/images/test-catalog-20261021/01-camera-1.webp'],location:'TP. Hồ Chí Minh'}));
 await page.route('**/api/auth/session',r=>r.fulfill({json:{ok:true,user:null}}));
 await page.route('**/api/db/bootstrap',r=>r.fulfill({json:{ok:true,configured:true,listings:[],users:[],orders:[],settings:{}}}));
 await page.route('**/api/support*',async r=>{
  if(r.request().url().includes('/config'))return r.fulfill({json:{ok:true,enabled:true,name:'RELOO',engagement:{maxInvites:0}}});
  if(r.request().method()==='GET')return r.fulfill({json:{ok:true,conversationId:ownedId,status:'OPEN',messages:transcript}});
  if(offline)return r.abort('internetdisconnected');
  posts++;const d=r.request().postDataJSON();ownedId=id;
  const turn=d.listingId?{answer:'DEMO · Máy ảnh 1: 150.000 ₫ / ngày. Bạn muốn thuê lúc nào?',suggestions:['Tiền cọc','Giao nhận'],actions:[{kind:'rent',label:'Chọn lịch · Xem giá',href:'/rent/'+d.listingId}],products:[products[0]]}:d.message==='Thuê đồ'?{answer:'Bạn cần đồ cho dịp nào?',suggestions:['Máy ảnh','Cắm trại'],products:[]}:{answer:'DEMO · Bạn chọn món phù hợp nhé.',suggestions:['Tiền cọc','Gặp nhân viên'],products};
  transcript.push({role:'USER',body:d.message},{role:'ASSISTANT',body:turn.answer,...turn});
  return r.fulfill({json:{ok:true,conversationId:id,status:'OPEN',...turn}});
 });
 await page.route('**/api/listings/demo-camera-*',r=>r.fulfill({json:{ok:true,listing:{id:'demo-camera-1',ownerId:'demo-owner',title:'DEMO · Máy ảnh 1',category:'may-anh',images:[],dailyPrice:150000,status:'available',transactionMode:'RENT',location:'TP. Hồ Chí Minh',rentalDetails:{depositAmount:500000,pickupAvailable:true,deliveryAvailable:false,billingUnit:'DAY'}}}}));
 await page.route('**/api/rent/inquiries',r=>{orders++;return r.fulfill({status:400,json:{ok:false,code:'DEMO_NO_REAL_ORDER'}})});
 await page.goto('http://127.0.0.1:4530/');await page.evaluate(()=>sessionStorage.removeItem('reloo-support-conversation'));
 const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 await page.getByRole('button',{name:'Tư vấn RELOO',exact:true}).click();const panel=page.getByRole('dialog',{name:'RELOO',exact:true});await panel.getByRole('textbox',{name:'Nhắn cho RELOO'}).waitFor();await page.waitForFunction(()=>!document.querySelector('.advisor-panel footer input').disabled);
 check('compact-initial-state',await panel.getByRole('heading',{name:'Bạn đang tìm món gì?'}).isVisible());
 check('no-tracking-invitation-after-refusal',await page.locator('.advisor-invitation').count()===0);
 await panel.getByRole('button',{name:'Thuê đồ',exact:true}).click();await panel.getByText('Bạn cần đồ cho dịp nào?',{exact:true}).waitFor();
 await panel.getByRole('button',{name:'Máy ảnh',exact:true}).click();await panel.locator('.advisor-product').first().waitFor();check('progressive-not-repeated',posts===2);
 await page.setViewportSize({width:390,height:844});check('horizontal-catalog',await panel.locator('.advisor-product-rail').evaluate(n=>n.scrollWidth>n.clientWidth));
 await panel.locator('.advisor-product img').first().waitFor();await page.waitForFunction(()=>{const n=document.querySelector('.advisor-product img');return n?.complete&&n.naturalWidth>0});
 await page.screenshot({path:'output/playwright/chat-commerce-20261025/mobile-products.png'});
 await panel.getByRole('button',{name:'Chọn món này',exact:true}).first().click();await panel.getByRole('button',{name:'Chọn lịch · Xem giá'}).waitFor();check('selected-product-context',posts===3);
 await panel.getByRole('button',{name:'Chọn lịch · Xem giá'}).click();await panel.getByRole('group',{name:'Lịch thuê & điểm giao nhận'}).waitFor();check('rental-review-inside-chat',orders===0);
 await panel.getByRole('textbox',{name:'Lời nhắn cho chủ đồ'}).fill('DEMO · giữ lựa chọn');
 await page.screenshot({path:'output/playwright/chat-commerce-20261025/mobile-rental.png'});
 await panel.getByRole('button',{name:'Quay lại hội thoại'}).click();
 await panel.getByRole('button',{name:'Chọn lịch · Xem giá'}).click();check('rental-draft-preserved-on-back',await panel.getByRole('textbox',{name:'Lời nhắn cho chủ đồ'}).inputValue()==='DEMO · giữ lựa chọn');await panel.getByRole('button',{name:'Quay lại hội thoại'}).click();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});check('no-page-overflow-'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check('composer-visible-'+width,await panel.locator('footer input').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));await page.screenshot({path:'output/playwright/chat-commerce-20261025/chat-'+width+'.png'});}
 offline=true;await panel.getByRole('textbox',{name:'Nhắn cho RELOO'}).fill('DEMO · giữ nội dung khi lỗi');await panel.getByRole('button',{name:'Gửi',exact:true}).click();await panel.getByRole('alert').waitFor();check('network-error-preserves-input',await panel.getByRole('textbox',{name:'Nhắn cho RELOO'}).inputValue()==='DEMO · giữ nội dung khi lỗi');offline=false;
 await panel.getByRole('link',{name:'Tiếp tục trong Tin nhắn'}).click();await page.waitForURL('**/dashboard/messages?support=1');const full=page.locator('.advisor-embedded');await full.getByText('DEMO · Máy ảnh 1: 150.000 ₫ / ngày. Bạn muốn thuê lúc nào?',{exact:true}).waitFor();check('guest-full-chat-no-login-wall',await full.isVisible());check('cards-survive-fast-to-full',await full.locator('.advisor-product').count()===4);
 await page.reload();await full.locator('.advisor-product').first().waitFor();check('history-survives-reload',await full.locator('.advisor-product').count()===4);await page.screenshot({path:'output/playwright/chat-commerce-20261025/full-chat.png'});
 await page.setViewportSize({width:390,height:844});check('full-mobile-composer-visible',await full.locator('footer input').evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight));await page.screenshot({path:'output/playwright/chat-commerce-20261025/full-chat-mobile.png'});
 check('no-order-without-confirmation',orders===0);return {checks,posts,orders,scope:'Synthetic UI only; real catalog, payment and device runtime are not asserted.'};
}
