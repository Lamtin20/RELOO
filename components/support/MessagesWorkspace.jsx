'use client';
import {useSearchParams} from 'next/navigation';
import {SupportChat} from './SupportChat';
export function MessagesWorkspace({children}){
 const params=useSearchParams();
 return params.get('support')==='1'?<SupportChat embedded/>:children;
}
