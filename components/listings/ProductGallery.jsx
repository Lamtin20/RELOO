'use client';
import {useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Images,X} from 'lucide-react';
import {ListingImage} from './ListingImage';
import {listingImageSources} from '@/lib/listing-image-sources';
export function ProductGallery({images=[],title,text}){
 const [active,setActive]=useState(0),dialog=useRef(null),gesture=useRef(null),swiped=useRef(false),sources=listingImageSources(images),count=sources.length;
 const move=direction=>setActive(index=>(index+direction+count)%count);
 const open=index=>{setActive(index);dialog.current?.showModal();};
 return <>
  <div className={'pd-gallery'+(count<2?' pd-gallery--single':'')}>
   <button className="pd-gallery__hero" type="button" onPointerDown={e=>{gesture.current={x:e.clientX,y:e.clientY};swiped.current=false;}} onPointerCancel={()=>{gesture.current=null;}} onPointerUp={e=>{const start=gesture.current;gesture.current=null;if(!start||count<2)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){swiped.current=true;move(dx<0?1:-1);}}} onClick={()=>{if(swiped.current){swiped.current=false;return;}open(active);}} aria-label={text.photos} data-analytics-action="PHOTO_VIEW">
    <ListingImage images={[...sources.slice(active),...sources.slice(0,active)]} alt={title} loading="eager" fallbackLabel={text.missingImage}/>
    {count>0&&<span className="pd-gallery__count"><Images size={16}/>{active+1} / {count}</span>}
   </button>
   {count>1&&<div className="pd-gallery__tiles">{sources.slice(1,4).map((src,index)=><button type="button" key={index} onClick={()=>open(index+1)} aria-label={`${text.photo} ${index+2}`} data-analytics-action="PHOTO_VIEW"><ListingImage images={[src]} loading="eager" alt={`${title} · ${index+2}`} fallbackLabel={text.missingImage}/></button>)}</div>}
   {count>1&&<div className="pd-gallery__controls"><button type="button" onClick={()=>move(-1)} aria-label={text.previous}><ChevronLeft size={19}/></button><button type="button" onClick={()=>open(active)}><Images size={17}/>{text.photos}</button><button type="button" onClick={()=>move(1)} aria-label={text.next}><ChevronRight size={19}/></button></div>}
   {count>1&&<div className="pd-gallery__dots">{sources.map((src,index)=><button type="button" key={index} aria-label={`${text.photo} ${index+1}`} aria-pressed={active===index} onClick={()=>setActive(index)}><span/></button>)}</div>}
  </div>
  <dialog className="pd-lightbox" ref={dialog} aria-label={text.photos} onClick={event=>{if(event.target===event.currentTarget)dialog.current.close();}} onKeyDown={event=>{if(count>1&&event.key==='ArrowRight')move(1);if(count>1&&event.key==='ArrowLeft')move(-1);}}>
   <button type="button" autoFocus className="pd-lightbox__close" aria-label={text.close} onClick={()=>dialog.current.close()}><X/></button>
   <div className="pd-lightbox__image"><ListingImage images={[...sources.slice(active),...sources.slice(0,active)]} alt={`${title} · ${active+1}`} loading="eager" fallbackLabel={text.missingImage}/></div>
   <div className="pd-lightbox__footer">{count>1&&<button type="button" onClick={()=>move(-1)} aria-label={text.previous}><ChevronLeft/></button>}<span aria-live="polite">{count?`${active+1} / ${count}`:text.missingImage}</span>{count>1&&<button type="button" onClick={()=>move(1)} aria-label={text.next}><ChevronRight/></button>}</div>
  </dialog>
 </>;
}
