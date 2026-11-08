'use client';
import Link from 'next/link';
import {IdCard,ShieldCheck,AlertCircle} from 'lucide-react';
import {useAuth} from '@/lib/store';
import {useLocale} from '@/components/settings/LocaleProvider';
import {identityReady} from '@/lib/identity-access';
import {identityAccessCopy} from '@/lib/i18n/identity-access';
import './identity-access.css';
function useCopy(){const {locale}=useLocale();return identityAccessCopy[locale]||identityAccessCopy['vi-VN'];}
export function IdentityStatusBadge(){const {user}=useAuth(),t=useCopy();if(!user)return null;const verified=identityReady(user);return <span className={'identity-status-badge '+(verified?'is-verified':'is-unverified')}>{verified?<ShieldCheck size={13}/>:<AlertCircle size={13}/>} {verified?t.verified:user.identityStatus==='EXPIRED'?t.expired:t.unverified}</span>;}
export function IdentityAccountWarning(){const {user}=useAuth(),t=useCopy();return !user||identityReady(user)?null:<aside className="identity-account-warning" role="status"><IdCard size={23}/><div><strong>{t.account}</strong><p>{t.warning}</p></div><Link href="/verify-identity">{t.verify}</Link></aside>;}
