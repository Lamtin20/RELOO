'use client';
import Link from 'next/link';import {IdCard,ChevronRight} from 'lucide-react';import {useLocale} from '@/components/settings/LocaleProvider';import {identityFlow} from '@/lib/i18n/identity-flow';import './identity-review.css';
import {identityReady} from '@/lib/identity-access';
import {IdentityStatusBadge} from './IdentityStatus';
import {useAuth} from '@/lib/store';
export function IdentityHomePrompt(){const {user}=useAuth();if(!user||identityReady(user))return null;return <div className="container identity-home-prompt"><IdentityEntry/></div>;}
export function IdentityEntry(){const {locale}=useLocale(),t=identityFlow[locale]||identityFlow['vi-VN'];return <Link className="identity-entry" href="/verify-identity"><span><IdCard size={26}/></span><div><strong>{t.title}</strong><IdentityStatusBadge/><p>{t.cardHint}</p><small>{t.openGuide}</small></div><ChevronRight size={20}/></Link>;}
