// Creates reviewable files only. Never connects to a database or grants identity.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {buildTestCatalog,TEST_CATALOG_BATCH} from '../../lib/catalog/test-catalog-20261021.js';
import {validateListing} from '../../lib/db/listing-write.js';
const ownerId=process.argv.find(a=>a.startsWith('--owner='))?.slice(8)||null;
if(ownerId&&!/^[a-zA-Z0-9_-]{1,80}$/.test(ownerId))throw Error('INVALID_OWNER');
const credits=JSON.parse(await fs.readFile(`public/images/test-catalog-${TEST_CATALOG_BATCH}/credits.json`,'utf8'));
if(credits.length!==20)throw Error('TWENTY_IMAGE_CREDITS_REQUIRED');
const products=buildTestCatalog({ownerId,credits});
for(const p of products){validateListing(p);for(const image of p.images){const bytes=await fs.readFile(path.join('public',image));const meta=await sharp(bytes).metadata();if(meta.format!=='webp'||meta.width<1000||meta.height<750)throw Error('INVALID_PRODUCT_IMAGE '+p.id);}}
const directory='output/catalog-refresh';await fs.mkdir(directory,{recursive:true});
await fs.writeFile(directory+'/products.json',JSON.stringify(products,null,2));
await fs.writeFile(directory+'/summary.json',JSON.stringify({batch:TEST_CATALOG_BATCH,count:products.length,images:products.reduce((n,p)=>n+p.images.length,0),ownerId,status:'paused',published:false,items:products.map(p=>({id:p.id,title:p.title,category:p.category,mode:p.transactionMode,unit:p.rentalDetails.billingUnit,daily:p.dailyPrice,period:p.rentalDetails.periodPrice,deposit:p.rentalDetails.depositAmount,delivery:p.rentalDetails.deliveryFee}))},null,2));
console.log(JSON.stringify({count:products.length,images:60,ownerAssigned:!!ownerId,published:false,output:directory+'/products.json'}));
