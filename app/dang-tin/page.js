import {Suspense} from 'react';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {ServiceDirectory} from '@/components/superapp/ServicePages';
export const metadata={title:'RELOO · Đăng tin'};
export default function Page(){return <MarketplaceShell><Suspense><ServiceDirectory purpose="post"/></Suspense></MarketplaceShell>}
