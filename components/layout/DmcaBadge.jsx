'use client';
import {dmcaPageCertificate} from '@/lib/content/dmca';
import {usePublicIntegrations} from '@/components/privacy/PublicIntegrations';
import {usePathname} from 'next/navigation';
import './DmcaBadge.css';
import {useLocale} from '@/components/settings/LocaleProvider';
export function DmcaBadge(){
 const {locale}=useLocale();
 const {dmca}=usePublicIntegrations(),path=usePathname();
 const href=dmcaPageCertificate(dmca,path);
 if(!href)return null;
 return <a className="reloo-dmca dmca-badge" href={href} title="DMCA.com Protection Status" target="_blank" rel="noopener noreferrer" aria-label={locale==='en-US'?'Check this page’s DMCA status':'Kiểm tra trạng thái DMCA của trang'}><img src={'/api/dmca/badge?path='+encodeURIComponent(path)} width="100" height="20" alt="DMCA.com Protection Status"/></a>;
}
