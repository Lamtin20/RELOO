'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {experienceText} from '@/lib/neighborhood/experience';
export function RentalContinuation({locale='vi-VN'}){const [next,setNext]=useState(null);useEffect(()=>{const timer=setTimeout(()=>{try{const value=new URLSearchParams(location.search).get('next'),url=new URL(value||'',location.origin);if(value?.startsWith('/noi-khu?')&&url.origin===location.origin&&url.pathname==='/noi-khu')setNext(url.pathname+url.search);}catch{}},0);return()=>clearTimeout(timer);},[]);return next?<Link className="btn btn-secondary" href={next}>{experienceText(locale,'back')}</Link>:null;}
