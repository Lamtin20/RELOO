// Bounded DOM checks, not a WCAG conformance claim or replacement for axe/manual AT.
async page=>{
 page.setDefaultTimeout(60000);await page.unrouteAll({behavior:'wait'});
 const results=[];
 for(const path of ['/','/auth','/tim-kiem','/design-preview']){
  await page.goto('http://127.0.0.1:4522'+path);await page.locator('main').first().waitFor();
  const result=await page.evaluate(()=>{
   const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
   const unlabeled=[...document.querySelectorAll('input:not([type=hidden]):not([type=submit]),select,textarea')].filter(visible).filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).map(e=>({tag:e.tagName,name:e.name||null}));
   const images=[...document.querySelectorAll('img')].filter(visible).filter(e=>!e.hasAttribute('alt')).length;
   const unnamedButtons=[...document.querySelectorAll('button')].filter(visible).filter(e=>!e.innerText.trim()&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!e.querySelector('img[alt]:not([alt=""])')).length;
   const rgb=s=>{const m=s.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);return m?m.slice(1).map(Number):null},lum=c=>{const a=c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722};
   let measured=0;const contrastCandidates=[];
   for(const el of [...document.querySelectorAll('h1,h2,h3,p,label,button,a,small')].filter(visible)){
    if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
    const style=getComputedStyle(el),fg=rgb(style.color);let bg=null,node=el,unsupported=false;
    while(node&&!bg){const s=getComputedStyle(node);if(s.backgroundImage!=='none'||s.opacity!=='1'){unsupported=true;break}bg=rgb(s.backgroundColor);if(!bg&&s.backgroundColor!=='rgba(0, 0, 0, 0)'){unsupported=true;break}node=node.parentElement}
    if(!fg||!bg||unsupported)continue;measured++;const x=lum(fg),y=lum(bg),ratio=(Math.max(x,y)+.05)/(Math.min(x,y)+.05),size=parseFloat(style.fontSize),large=size>=24||(size>=18.66&&parseInt(style.fontWeight)>=700);
    if(ratio<(large?3:4.5))contrastCandidates.push({tag:el.tagName,className:el.className,parent:el.parentElement.className,color:style.color,background:bg,ratio:Number(ratio.toFixed(2)),size,large});
   }
   return {unlabeled,imagesMissingAlt:images,unnamedButtons,contrastMeasured:measured,contrastCandidates,overflow:document.documentElement.scrollWidth>innerWidth};
  });results.push({path,...result});
 }
 await page.getByRole('button',{name:'Open dialog',exact:true}).click();await page.getByRole('dialog',{name:'Sample dialog',exact:true}).waitFor();
 const focused=await page.getByRole('dialog',{name:'Sample dialog',exact:true}).evaluate(e=>e.contains(document.activeElement));await page.keyboard.press('Escape');
 return {results,dialogFocus:focused,scope:'Light-mode local DOM sample only; transparent/image/gradient backgrounds skipped, dark mode and full WCAG/screen reader NOT_TESTED. Dev tools may appear as candidates.',at:new Date().toISOString()};
}
