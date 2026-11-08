'use client';
import {useState} from 'react';
import Image from 'next/image';
import {Package} from 'lucide-react';
export function NeighborhoodImage({alt,...props}){
 const [failed,setFailed]=useState(null);
 if(!props.src||failed===props.src)return <span className="nk-image-placeholder" role="img" aria-label={alt}><Package size={38} aria-hidden="true"/></span>;
 return <Image unoptimized width={400} height={300} alt={alt} {...props} onError={()=>setFailed(props.src)}/>;
}
