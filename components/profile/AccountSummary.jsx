'use client';
import Link from 'next/link';
import {UserRound,ChevronRight} from 'lucide-react';
import {useAuth} from '@/lib/store';
import {useLocale} from '@/components/settings/LocaleProvider';
import {accountCopy} from '@/lib/i18n/account';
import {IdentityStatusBadge} from './IdentityStatus';
export function AccountSummary(){
 const {user}=useAuth(),{locale}=useLocale(),t=accountCopy[locale]||accountCopy['vi-VN'];
 return <Link href="/dashboard/profile" className="ah-profile-summary" aria-label={t.profile}><span className="ah-avatar">{user?.avatar&&!user.avatar.includes('/brand/reloo-logo')?<img src={user.avatar} alt=""/>:<UserRound size={30}/>}</span><div><h2>{user?.name||t.title}</h2><IdentityStatusBadge/><span>{t.profile}</span></div><ChevronRight size={20}/></Link>;
}
