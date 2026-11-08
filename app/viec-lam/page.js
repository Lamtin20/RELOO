import {Suspense} from 'react';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {JobsLanding} from '@/components/superapp/ServicePages';
export const metadata={title:'RELOO · Việc làm linh hoạt',robots:{index:false,follow:true}};
export default function Page(){return <MarketplaceShell><Suspense><JobsLanding/></Suspense></MarketplaceShell>}
