import {isDeepStrictEqual} from 'node:util';
export function needsPrivateAddressRefresh(existing,incoming){const d=existing?.location_details||{};const privateFields=!!(d.addressDetail||d.street||d.house||d.coords);return privateFields&&incoming.ownerDetailsAvailable!==true&&!isDeepStrictEqual(d,incoming.locationDetails);}
