'use client';
import {useSyncExternalStore} from 'react';
const events=['storage','reloo-consent-changed','reloo-interest-scope-changed','reloo-local-data-changed'];
function subscribe(callback){for(const e of events)window.addEventListener(e,callback);return()=>{for(const e of events)window.removeEventListener(e,callback)}}
export function useStorageSnapshot(read){return JSON.parse(useSyncExternalStore(subscribe,()=>{try{return JSON.stringify(read())}catch{return '[]'}},()=> '[]'))}
export function notifyLocalDataChange(){window.dispatchEvent(new Event('reloo-local-data-changed'))}
