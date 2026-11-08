import {Suspense} from 'react';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {ServiceDirectory} from '@/components/superapp/ServicePages';
export const metadata={title:'RELOO · Tìm kiếm',robots:{index:false,follow:true}};
export default function Page(){return <MarketplaceShell><Suspense><ServiceDirectory/></Suspense></MarketplaceShell>}
