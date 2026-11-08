import {Suspense} from 'react';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {ServiceDirectory} from '@/components/superapp/ServicePages';
export const metadata={title:'RELOO · Giao dịch',robots:{index:false,follow:false}};
export default function Page(){return <MarketplaceShell><Suspense><ServiceDirectory purpose="transactions"/></Suspense></MarketplaceShell>}
