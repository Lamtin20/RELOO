import {cache} from 'react';
import {headers} from 'next/headers';
import ProductClient from './ProductClient';
import {publicSeoProduct} from '@/lib/analytics/public-product';
const product=cache(publicSeoProduct);
export async function generateMetadata({params}){const {id}=await params,a=await product(id);return a?{title:a.title+' · RELOO',description:a.description.slice(0,160),alternates:{canonical:'https://reloo.vn/product/'+encodeURIComponent(id)},robots:{index:true,follow:true},openGraph:{title:a.title,description:a.description.slice(0,160),images:a.images.slice(0,1)}}:{title:'Sản phẩm · RELOO',robots:{index:false,follow:false}};}
export default async function Page({params}){const {id}=await params,a=await product(id),nonce=(await headers()).get("x-nonce");return <>{a&&<script nonce={nonce||undefined} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'Product',name:a.title,description:a.description,image:a.images,sku:a.id,url:'https://reloo.vn/product/'+encodeURIComponent(a.id)}).replace(/</g,'\u003c')}}/>}<ProductClient initialListing={a}/></>;}
