"use client";
import {useSyncExternalStore} from 'react';
function subscribe(fn){const c=navigator.connection;c?.addEventListener?.('change',fn);return()=>c?.removeEventListener?.('change',fn);}
function snapshot(){const c=navigator.connection||{};return !c.saveData&&!['slow-2g','2g'].includes(c.effectiveType);}
export function useWarmConnection(){return useSyncExternalStore(subscribe,snapshot,()=>false);}
