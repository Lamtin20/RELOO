import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {NearbyNeedDetail} from '@/components/listings/NearbyNeedDetail';
export const metadata={title:'Chi tiết nhu cầu | RELOO',robots:{index:false,follow:false}};
export default async function Page({params}){const {id}=await params;return <MarketplaceShell><NearbyNeedDetail id={id}/></MarketplaceShell>;}
