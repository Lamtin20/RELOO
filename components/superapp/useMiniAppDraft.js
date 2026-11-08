'use client';
import {useState} from 'react';
import {createMiniAppDraftStore} from '@/lib/product/mini-app-drafts';
const store=createMiniAppDraftStore();
export function useMiniAppDraft(key,initial){
 const [state,setState]=useState(()=>({key,value:store.read(key)||initial}));
 const value=state.key===key?state.value:store.read(key)||initial;
 return [value,patch=>{const next={...value,...patch};store.write(key,next);setState({key,value:next})},()=>{store.clear(key);setState({key,value:initial})}];
}
