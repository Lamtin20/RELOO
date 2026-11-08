"use client";
import Link from 'next/link';


import {Logo} from '@/components/brand/Logo';
import {CookieSettingsButton} from '@/components/privacy/CookieConsent';
import {DataCollectionPolicyLink} from '@/components/privacy/DataCollectionPolicy';
import {useLocale} from '@/components/settings/LocaleProvider';
import {footerCopy} from '@/lib/i18n/footer';
import {EntityDetails} from './EntityDetails';
import {DmcaBadge} from './DmcaBadge';
import './footer.css';
import {usePathname} from 'next/navigation';
export function Footer(){
 const pathname=usePathname();
 const {locale}=useLocale(),t=footerCopy[locale]||footerCopy['vi-VN'];
 if(pathname!=='/')return null;
 return <footer className="site-footer reloo-footer"><div className="container footer-inner">
  <div className="footer-col footer-brand"><div className="footer-brand__lockup"><Logo size="lg" href={null}/></div>
   <div className="footer-trust" aria-label={t.trust}><DmcaBadge/></div>
   <p className="footer-brand__desc">{t.tagline}</p>
   <details className="footer-transaction"><summary>{t.transaction}</summary><p>{t.transactionNote}</p></details>
  </div>
  <div className="footer-col footer-col--support"><h4>{t.support}</h4><ul>{t.supportLinks.map(([href,title])=><li key={href}><Link prefetch={false} className="footer-link" href={href}>{title}</Link></li>)}</ul></div>
  <div className="footer-col footer-col--legal"><h4>{t.legal}</h4><ul>{t.legalLinks.map(([href,title])=><li key={href}><Link prefetch={false} className="footer-link" href={href}>{title}</Link></li>)}<li><DataCollectionPolicyLink/></li></ul></div>
 </div><div className="container footer-bottom"><CookieSettingsButton/><EntityDetails/></div></footer>;
}
