'use client';
import {useAuth} from '@/lib/store';
import AnalyticsDashboard from './AnalyticsDashboard';
export default function SellerAnalytics(){const {user}=useAuth();return <AnalyticsDashboard key={user?.id||'anonymous'}/>;}
