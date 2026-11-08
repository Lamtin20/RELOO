// Local synthetic partner UI checks; run using Playwright CLI after a fresh snapshot.
async page => {
 const title='QA Local Property '+Date.now();
 await page.getByRole('textbox',{name:'Tên cơ sở',exact:true}).fill(title);
 await page.getByRole('textbox',{name:'Thành phố',exact:true}).fill('Demo city');
 await page.getByRole('textbox',{name:'Địa chỉ minh họa',exact:true}).fill('Synthetic test address');
 await page.getByRole('button',{name:'Tạo bản nháp',exact:true}).click();
 const panel=page.locator('section.stay-panel').filter({has:page.getByRole('heading',{name:title,exact:true})});
 await panel.getByText('Demo city · DRAFT',{exact:true}).waitFor();
 await panel.getByRole('textbox',{name:'Tên loại phòng',exact:true}).fill('QA Room');
 await panel.getByRole('button',{name:'Thêm loại + 1 phòng',exact:true}).click();
 await panel.getByRole('heading',{name:'QA Room · 1 phòng có thể bán',exact:true}).waitFor();
 await panel.getByRole('spinbutton',{name:'Giá mới',exact:true}).fill('620000');
 await panel.getByRole('button',{name:'Cập nhật giá thử',exact:true}).click();
 await panel.getByText('620.000 ₫ · v2',{exact:true}).waitFor();
 await panel.getByRole('textbox',{name:'Mã phòng cụ thể',exact:true}).fill('QA-02');
 await panel.getByRole('button',{name:'Thêm phòng',exact:true}).click();
 await panel.getByRole('heading',{name:'QA Room · 2 phòng có thể bán',exact:true}).waitFor();
 await panel.getByRole('textbox',{name:'Bắt đầu (VN)',exact:true}).fill('2027-05-01T14:00');
 await panel.getByRole('textbox',{name:'Kết thúc (VN)',exact:true}).fill('2027-05-02T12:00');
 await panel.getByRole('textbox',{name:'Lý do',exact:true}).fill('QA maintenance');
 await panel.getByRole('button',{name:'Khóa lịch thử',exact:true}).click();
 await panel.getByRole('button',{name:'Mở lịch',exact:true}).waitFor();
 await panel.screenshot({path:'output/playwright/stays/partner-draft-inventory.png'});
 await panel.getByRole('button',{name:'Mở lịch',exact:true}).click();
 await panel.getByRole('button',{name:'Mở lịch',exact:true}).waitFor({state:'hidden'});
 await panel.getByRole('button',{name:'Gửi duyệt',exact:true}).click();
 await panel.getByText('Demo city · PENDING',{exact:true}).waitFor();
 const sizes=[];
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);if(!fits)throw Error('partner-overflow-'+width);sizes.push(width);}
 return {checks:['create-draft','create-room-type','update-price-version','add-unit','block-unblock','submit-for-admin-review','partner-responsive'],widths:sizes,fixtureOnly:true};
}
