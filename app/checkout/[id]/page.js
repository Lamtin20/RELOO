import { redirect } from "next/navigation";
import {miniAppContext,miniAppHref} from '@/lib/product/mini-app-navigation';

export default async function CheckoutPage({ params,searchParams }) {
  const { id } = await params;
  const query=new URLSearchParams();for(const [key,value] of Object.entries(await searchParams||{}))if(typeof value==='string')query.set(key,value);
  const app=miniAppContext('/checkout/'+id,query.toString());
  redirect(miniAppHref(`/rent/${encodeURIComponent(id)}?${query}`,app,query.get('returnTo')));
}
