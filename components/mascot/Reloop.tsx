"use client";
import type {CSSProperties} from 'react';
import Image from 'next/image';
import {EMOTION_LIBRARY,ACTION_LIBRARY,type ReloopEmotion,type ReloopAction} from '@/lib/mascot/registry';
import {reloopArtwork} from '@/lib/mascot/artwork';
import '@/app/reloop-mascot.css';
export type ReloopProps={emotion?:ReloopEmotion;action?:ReloopAction;size?:number;animated?:boolean;label?:string;className?:string};
export function Reloop({emotion='idle',action='idle_breathing',size=128,animated=true,label,className=''}:ReloopProps){
 const spec=EMOTION_LIBRARY[emotion]||EMOTION_LIBRARY.idle,motion=ACTION_LIBRARY[action]||ACTION_LIBRARY.idle_breathing;
 const system=spec.group==='SYSTEM',warning=['CAUTION','NEGATIVE'].includes(spec.group),success=spec.group==='OUTCOMES';
 return <span className={`reloop-character ${className}`} data-emotion={emotion} data-action={action} data-motion={animated?motion.motion:'static'} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} style={{width:size,height:size,'--reloop-duration':`${motion.durationMs}ms`,'--reloop-tilt':`${spec.headAngle}deg`} as CSSProperties}>
  <span className="reloop-character__art" key={emotion+':'+action}><Image src={reloopArtwork(emotion,action,size)} width={640} height={640} alt="" draggable={false} unoptimized/></span>
  {system&&<span className="reloop-character__energy"/>}{warning&&<span className="reloop-character__badge reloop-character__badge--warning">!</span>}{success&&<span className="reloop-character__badge reloop-character__badge--success">✓</span>}
 </span>;
}
