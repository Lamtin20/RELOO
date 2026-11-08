"use client";
import { useRef,useState } from "react";
import {IntentLink as Link} from '@/components/mobile/IntentLink';
import { ChevronRight } from "lucide-react";
import { Icon } from "@/components/ui";
import { getCategoryColors } from "@/lib/category-colors";
import { getSpecGroupId, CATEGORY_SPEC_GROUPS } from "@/lib/category-specs";
import {categoryArtwork,CATEGORY_GROUP_ORDER} from '@/lib/category-artwork';

const ORDER=CATEGORY_GROUP_ORDER;
export function CategoryBrowser({categories=[]}) {
 const groups=categories.reduce((all,cat)=>{const id=getSpecGroupId(cat.id);(all[id]||=([])).push(cat);return all;},{});
 const entries=Object.entries(groups).sort(([a],[b])=>ORDER.indexOf(a)-ORDER.indexOf(b));
 const [selected,setSelected]=useState(null),track=useRef(null);
 const current=groups[selected]?selected:entries[0]?.[0];
 function select(id){setSelected(id);track.current?.querySelector('[data-group="'+id+'"]')?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}
 return <section className="category-browser" aria-label="Danh mục sản phẩm">
  <div ref={track} className="category-browser__groups" role="tablist" aria-label="Ngành hàng" aria-orientation="horizontal">{entries.map(([id,cats],i)=>{
   const colors=getCategoryColors(cats[0].slug,i);
   return <button data-group={id} key={id} id={'category-tab-'+id} role="tab" tabIndex={current===id?0:-1} aria-selected={current===id} aria-controls={'category-panel-'+id} onClick={()=>select(id)} onKeyDown={e=>{const keys=entries.map(([key])=>key),index=keys.indexOf(id);let next;if(e.key==='ArrowRight')next=keys[(index+1)%keys.length];if(e.key==='ArrowLeft')next=keys[(index+keys.length-1)%keys.length];if(e.key==='Home')next=keys[0];if(e.key==='End')next=keys.at(-1);if(next){e.preventDefault();select(next);track.current?.querySelector('[data-group="'+next+'"]')?.focus();}}} style={{'--category-color':colors.bg}}><span><img src={categoryArtwork(id)} alt="" width="80" height="80" loading="lazy"/></span><strong>{CATEGORY_SPEC_GROUPS[id]?.label||'Đồ dùng khác'}</strong></button>;
  })}</div>
  {groups[current]&&<div className="category-browser__panel" role="tabpanel" id={'category-panel-'+current} aria-labelledby={'category-tab-'+current} key={current}><h3>{CATEGORY_SPEC_GROUPS[current]?.label||'Đồ dùng khác'}</h3><div>{groups[current].map(cat=><Link key={cat.id} href={'/explore?category='+cat.slug}><Icon name={cat.icon} size={19}/><span>{cat.name}</span><ChevronRight size={16}/></Link>)}</div></div>}
 </section>;
}
