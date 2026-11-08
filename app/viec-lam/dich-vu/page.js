import {Suspense} from 'react';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {ServiceHub} from '@/components/services/ServiceHub';
export const metadata={title:'RELOO · Dịch vụ theo nhu cầu',robots:{index:false,follow:false}};
export default function Page(){return <MarketplaceShell><Suspense><ServiceHub/></Suspense></MarketplaceShell>}
