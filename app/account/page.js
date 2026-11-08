'use client';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {AccountHub} from '@/components/mobile/AccountHub';
import {useAppLayout} from '@/lib/hooks/useAppLayout';
export default function AccountPage(){const compact=useAppLayout();return <MarketplaceShell hideHeader={compact} hideBack><AccountHub/></MarketplaceShell>;}
