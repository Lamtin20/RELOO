"use client";
import {useSyncExternalStore} from 'react';
const subscribe=callback=>{window.addEventListener('reloo-commerce-scroll',callback);return()=>window.removeEventListener('reloo-commerce-scroll',callback);};
export function useAccountCompact(){return useSyncExternalStore(subscribe,()=>document.body.dataset.accountCompact==='true',()=>false);}
