// Real MapLibre renderer with synthetic map/service transport; no licensed tiles are fetched.
async page=>{
 const checks=[],errors=[],measurements=[],base='http://127.0.0.1:4537',root='output/verification/live-map-browser';
 const check=(name,ok)=>{checks.push({name,ok});if(!ok)throw Error(name)};page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error'&&message.text().includes('Worker failed'))errors.push(message.text())});
 await page.setViewportSize({width:1440,height:900});let enabled=false,searches=0,places=0;
 await page.addInitScript(()=>{window.qaGPS=0;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(success,error)=>{window.qaGPS++;error({code:1})}}})});
 await page.route('**/api/maps/config',route=>route.fulfill({json:{ok:true,enabled,style:'/api/maps/style',attribution:'QA synthetic map — no real tiles',geocoding:true,routing:false,domains:{marketplace:'AVAILABLE',jobs:'BLOCKED_LIVE_JOBS',stays:'BLOCKED_LIVE_BOOKING'}}}));
 await page.route('**/api/maps/style',route=>route.fulfill({json:{version:8,sources:{},layers:[{id:'qa-background',type:'background',paint:{'background-color':'#edf3ef'}}]}}));
 await page.route('**/api/maps/search?**',route=>{searches++;return route.fulfill({json:{ok:true,type:'FeatureCollection',features:[{type:'Feature',id:'marketplace:qa-camera',geometry:{type:'Point',coordinates:[106.705,10.775]},properties:{id:'marketplace:qa-camera',domain:'marketplace',title:'DEMO · Camera QA',category:'may-anh',price:150000,unit:'DAY',area:'QA public approximate area',version:'1',approximate:true,accuracyMeters:1600,href:'/product/qa-camera'}}],cursor:'1',nextOffset:null}})});
 await page.route('**/api/maps/places',route=>{places++;return route.fulfill({json:{ok:true,places:[{label:'DEMO · Chosen area',coords:{lat:10.775,lng:106.705}}]}})});
 await page.goto(base+'/ban-do');await page.evaluate(()=>{localStorage.setItem('reloo-ui-language:guest','vi-VN');document.cookie='reloo-ui-language=vi-VN; Path=/; SameSite=Lax'});await page.reload();const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 await page.getByText('Bản đồ chưa được cấu hình. Bạn vẫn có thể xem danh sách.',{exact:true}).waitFor();check('unconfigured-provider-honest-state',(await page.locator('.rlm-status').innerText()).includes('chưa được cấu hình'));check('no-search-without-provider',searches===0);check('no-background-gps',await page.evaluate(()=>window.qaGPS===0));
 enabled=true;await page.reload();
 const start=Date.now();await page.locator('.rlm-canvas canvas').waitFor();await page.locator('.rlm-list article').waitFor();measurements.push({name:'synthetic-style-ready-ms',ms:Date.now()-start,scope:'Includes local Next dev/import; no vector tiles or mobile network'});
 check('real-maplibre-canvas',await page.locator('.maplibregl-canvas').count()===1);check('business-projection-shown',(await page.locator('.rlm-list').innerText()).includes('DEMO · Camera QA'));check('osm-attribution',(await page.locator('.maplibregl-ctrl-attrib').innerText()).includes('OpenStreetMap'));
 await page.locator('.rlm-list article>button').first().click();await page.locator('.rlm-preview').waitFor();check('preview-real-product-link',await page.locator('.rlm-preview a').getAttribute('href')==='/product/qa-camera');
 await page.getByRole('button',{name:'Dùng vị trí hiện tại',exact:true}).click();await page.getByText('Chưa lấy được vị trí. Bạn có thể tìm hoặc chọn khu vực thủ công.',{exact:true}).waitFor();check('gps-only-after-explicit-click',await page.evaluate(()=>window.qaGPS===1));
 await page.getByPlaceholder('Tìm địa điểm').fill('QA area');await page.locator('.rlm-places button').waitFor();check('autocomplete-debounced-and-works',places===1);await page.locator('.rlm-places button').click();check('manual-place-choice',await page.getByPlaceholder('Tìm địa điểm').inputValue()==='');
 await page.context().setOffline(true);await page.getByText('Bạn đang ngoại tuyến. Kết nối lại để cập nhật bản đồ.',{exact:true}).waitFor();check('offline-state',true);await page.context().setOffline(false);
 for(const locale of ['vi-VN','en-US']){
  await page.evaluate(locale=>{localStorage.setItem('reloo-ui-language:guest',locale);document.cookie='reloo-ui-language='+locale+'; Path=/; SameSite=Lax'},locale);await page.reload();await page.locator('.rlm-canvas canvas').waitFor();await page.locator('.rlm-list article').waitFor();
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});check(locale+'-overflow-'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('.reloo-live-map').scrollIntoViewIfNeeded();await page.screenshot({path:root+'/'+locale+'-'+width+'.png',animations:'disabled'});
  }
 }
 await page.setViewportSize({width:390,height:900});await page.getByRole('button',{name:'List',exact:true}).click();check('mobile-list-toggle',await page.locator('.rlm-list').isVisible()&&!await page.locator('.rlm-map-wrap').isVisible());
 await page.getByRole('button',{name:'Toggle light/dark appearance'}).click();check('dark-controls',await page.locator('.reloo-live-map--dark').count()===1);
 await page.getByRole('button',{name:'Map',exact:true}).click();check('mobile-return-map',await page.locator('.rlm-map-wrap').isVisible());
 await page.emulateMedia({reducedMotion:'reduce'});check('reduced-motion-css',await page.locator('.reloo-live-map').evaluate(el=>getComputedStyle(el).scrollBehavior==='auto'));
 check('no-page-exceptions',errors.length===0);return {checks,errors,measurements,searches,places,scope:'Synthetic GeoJSON transport and background-only style. Not licensed provider, real OSM tile latency, production business inventory or device performance.'};
}





