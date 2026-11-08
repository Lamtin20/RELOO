'use client';
import {usePathname,useSearchParams,useRouter} from 'next/navigation';
import {miniAppContext,miniAppHref,safeMiniAppReturn} from '@/lib/product/mini-app-navigation';
export function useMiniAppRouter(){
 const router=useRouter(),path=usePathname(),params=useSearchParams(),id=miniAppContext(path,params.toString());
 const back=safeMiniAppReturn(params.get('returnTo'),id)||safeMiniAppReturn(path+'?'+params,id);
 return {...router,push:(href,options)=>router.push(miniAppHref(href,id,back),options),replace:(href,options)=>router.replace(miniAppHref(href,id,back),options)};
}
