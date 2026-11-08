import {Suspense} from 'react';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {MapPage} from '@/components/location/MapPage';
export const metadata={title:'RELOO · Live Map',robots:{index:false,follow:true}};
export default function Page(){return <MarketplaceShell><div className="container"><Suspense><MapPage/></Suspense></div></MarketplaceShell>;}
