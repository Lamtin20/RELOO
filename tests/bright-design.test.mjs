import test from 'node:test';
import assert from 'node:assert/strict';
import {stat,readFile} from 'node:fs/promises';
import {appHeaderProfile} from '../lib/mobile/header-profile.js';
import {CATEGORY_GROUP_ORDER,categoryArtwork,CATEGORY_MAIN_LABELS} from '../lib/category-artwork.js';
import {BANNER_SLOTS,bannerImageFits} from '../lib/content/banner-slots.js';

test('commerce headers have task-specific titles, actions and safe fallback destinations',()=>{
 assert.equal(appHeaderProfile('/').action,'notifications');
 assert.equal(appHeaderProfile('/explore').action,'saved');
 assert.equal(appHeaderProfile('/lend').action,'listings');
 assert.equal(appHeaderProfile('/cashback').title,'Ưu đãi & hoàn tiền');
 assert.equal(appHeaderProfile('/dashboard/purchases').title,'Đơn mua & bán');
 assert.equal(appHeaderProfile('/dashboard/security').title,'Bảo mật & thông báo');
 assert.equal(appHeaderProfile('/dashboard/assets/listing_001/edit').fallback,'/dashboard/assets');
 assert.equal(appHeaderProfile('/purchase/item').fallback,'/explore');
 assert.equal(appHeaderProfile('/rent/item').title,'Yêu cầu thuê');
 assert.equal(appHeaderProfile('/unknown').fallback,'/');
});
test('all main category pictures are self-hosted 3D assets with a recorded license',async()=>{
 for(const group of CATEGORY_GROUP_ORDER){
  assert.ok(CATEGORY_MAIN_LABELS[group]);
  const path=categoryArtwork(group);assert.ok(path.endsWith('.webp'));
  const info=await stat(new URL('../public'+path,import.meta.url));assert.ok(info.size>1000&&info.size<60000);
 }
 const license=await readFile(new URL('../public/images/categories-3d/LICENSE.txt',import.meta.url),'utf8');
 assert.match(license,/MIT License/);
});
test('advertisement positions require matching responsive artwork dimensions',()=>{
 for(const slot of ['home_categories','home_bottom']){
  assert.equal(bannerImageFits({width:750,height:400},BANNER_SLOTS[slot].mobile),true);
  assert.equal(bannerImageFits({width:400,height:750},BANNER_SLOTS[slot].mobile),false);
 }
});
