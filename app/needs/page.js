import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {RentalOperationsSettings} from '@/components/neighborhood/RentalOperationsSettings';
import {NearbyNeeds} from '@/components/listings/NearbyNeeds';
export const metadata={title:'Gửi nhu cầu thuê, mua đồ quanh bạn | RELOO',description:'Tìm người có món đồ bạn cần thuê hoặc mua trong bán kính 10 km, cùng tỉnh/thành phố.'};
export default function Page(){return <MarketplaceShell><NearbyNeeds/><div className="container"><RentalOperationsSettings kind="needs"/></div></MarketplaceShell>;}
