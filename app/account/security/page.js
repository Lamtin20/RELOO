'use client';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {LoginSecurityPanel} from '@/components/security/LoginSecurityPanel';
import {useAppLayout} from '@/lib/hooks/useAppLayout';
export default function AccountSecurityPage(){const compact=useAppLayout();return <MarketplaceShell hideHeader={compact}><LoginSecurityPanel/></MarketplaceShell>;}
