async page => {
 const base='http://127.0.0.1:4522',root='output/playwright/stays-host',checks=[];
 const check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name)};
 await page.goto(base+'/dat-phong/chu-nha');await page.getByRole('combobox',{name:'Phòng đang quản lý',exact:true}).waitFor();
 const consent=page.getByRole('button',{name:'Chỉ cookie cần thiết',exact:true});if(await consent.isVisible())await consent.click();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});check('no-horizontal-overflow-'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:root+'/calendar-'+width+'.png',fullPage:true})}
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Kênh & iCal',exact:true}).click();
 await page.getByRole('button',{name:'Xem trước iCal',exact:true}).click();await page.getByRole('heading',{name:'Kiểm tra trước khi nhập',exact:true}).waitFor();
 await page.screenshot({path:root+'/ical-preview.png',fullPage:true});
 await page.getByRole('button',{name:'Áp dụng lịch thử',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu dữ liệu thử.'}).waitFor();checks.push('ical-preview-apply');
 await page.getByRole('button',{name:'Lịch chung',exact:true}).click();await page.getByText('reloo-synthetic-ota-01',{exact:true}).waitFor();
 await page.screenshot({path:root+'/unified-imported.png',fullPage:true});checks.push('import-block-visible');
 await page.getByRole('textbox',{name:'Mã tham chiếu duy nhất',exact:true}).fill('external-conflict');
 await page.getByRole('textbox',{name:'Nhận phòng (VN)',exact:true}).fill('2027-11-05T14:00');
 await page.getByRole('textbox',{name:'Trả phòng (VN)',exact:true}).fill('2027-11-06T11:00');
 await page.getByRole('spinbutton',{name:'Giá chủ nhà ghi nhận (VND)',exact:true}).fill('500000');
 await page.getByRole('button',{name:'Lưu đơn ngoài thử',exact:true}).click();await page.getByRole('alert').filter({hasText:'trùng đơn'}).waitFor();checks.push('external-overlap-rejected');
 await page.getByRole('textbox',{name:'Mã tham chiếu duy nhất',exact:true}).fill('external-valid');
 await page.getByRole('textbox',{name:'Nhận phòng (VN)',exact:true}).fill('2027-11-10T14:00');
 await page.getByRole('textbox',{name:'Trả phòng (VN)',exact:true}).fill('2027-11-11T11:00');
 await page.getByRole('button',{name:'Lưu đơn ngoài thử',exact:true}).click();await page.getByText('external-valid',{exact:true}).waitFor();checks.push('external-booking-recorded');
 await page.getByRole('button',{name:'Nháp từ liên kết',exact:true}).click();
 await page.getByRole('textbox',{name:'Liên kết listing HTTPS',exact:true}).fill('https://www.airbnb.com/rooms/123?secret=not-retained');
 await page.getByRole('button',{name:'Kiểm tra nguồn liên kết',exact:true}).click();await page.getByText('Airbnb · Chưa nhập nội dung · Chưa gọi AI',{exact:true}).waitFor();checks.push('honest-no-ai-link-preview');
 await page.screenshot({path:root+'/link-manual-draft.png',fullPage:true});
 await page.getByRole('textbox',{name:'Tên cơ sở bạn cung cấp',exact:true}).fill('Synthetic test draft');
 await page.getByRole('textbox',{name:'Mô tả bạn có quyền sử dụng',exact:true}).fill('Synthetic description written for QA.');
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Kiểm tra nháp trong phiên',exact:true}).click();await page.getByRole('status').filter({hasText:'Nháp trong phiên đã kiểm tra.'}).waitFor();checks.push('draft-review-only-no-publish');
 await page.getByRole('button',{name:'Vận hành',exact:true}).click();
 await page.getByRole('spinbutton',{name:'Số phút vệ sinh (0–1440)',exact:true}).fill('30');
 await page.getByRole('button',{name:'Lưu đệm vệ sinh thử',exact:true}).click();await page.getByRole('alert').filter({hasText:'Còn đơn hoặc block'}).waitFor();checks.push('buffer-change-blocked-by-inventory');
 await page.screenshot({path:root+'/operations-gates.png',fullPage:true});
 await page.getByRole('combobox',{name:'Phòng đang quản lý',exact:true}).selectOption('40000000-0000-4000-8000-000000000002');
 await page.getByRole('spinbutton',{name:'Số phút vệ sinh (0–1440)',exact:true}).fill('45');
 await page.getByRole('button',{name:'Lưu đệm vệ sinh thử',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu dữ liệu thử.'}).waitFor();checks.push('empty-inventory-buffer-updated');
 return {checks,syntheticOnly:true,at:new Date().toISOString()};
}
