'use client';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {miniAppContext,miniAppHref,safeMiniAppReturn} from '@/lib/product/mini-app-navigation';
export function MiniAppLink({href,...props}){
 const path=usePathname(),params=useSearchParams(),id=miniAppContext(path,params.toString());
 const back=safeMiniAppReturn(params.get('returnTo'),id)||safeMiniAppReturn(path+'?'+params,id);
 return <Link {...props} href={miniAppHref(href,id,back)}/>;
}
