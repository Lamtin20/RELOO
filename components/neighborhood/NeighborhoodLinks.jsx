import Link from 'next/link';
import {experienceText,neighborhoodDestination} from '@/lib/neighborhood/experience';

import './rental-experience.css';
export function NeighborhoodLinks({locale='vi-VN',only}){const entries=only?[only]:['orders','owner','residency','needs','notifications'];return <nav className="nk-common-links">{!only&&<Link href="/ban-do?domain=neighborhood">{locale==='en-US'?'Map service status':'Trạng thái bản đồ nội khu'}</Link>}{entries.map(tab=><Link key={tab} href={neighborhoodDestination(tab,{lang:locale})}>{experienceText(locale,{orders:'commonOrders',owner:'commonAssets',residency:'commonProfile',needs:'commonNeeds',notifications:'commonNotifications'}[tab])}</Link>)}</nav>;}
