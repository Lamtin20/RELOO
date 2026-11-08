import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {StayWorkspace} from '@/components/stays/StayWorkspace';
export const metadata={title:'RELOO Real · Quản lý phòng',robots:{index:false,follow:false}};
export default function Page(){return <MarketplaceShell><StayWorkspace/></MarketplaceShell>}
