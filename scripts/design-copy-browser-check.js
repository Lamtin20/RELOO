// Refresh screenshots after final copy changes; no domain mutations.
async page=>{
 const out=[];
 for(const [i,path] of [[6,'/dat-phong/quan-ly'],[7,'/dat-phong/chu-nha']]){
  await page.goto('http://127.0.0.1:4522'+path);
  await page.getByRole('heading',{level:1}).last().waitFor();
  await page.waitForFunction(()=>!document.body.innerText.includes('npm run stays:preview'));
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.screenshot({path:'output/playwright/design-20261023/screen-'+i+'-'+width+'.png'});out.push({path,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)})}
 }
 return out;
}

