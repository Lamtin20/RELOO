'use client';
import Link from 'next/link';
import {useLocale} from './LocaleProvider';
import {LanguageFlag} from './LanguageSettings';
import {languageText} from '@/lib/i18n/locale';
export function LanguageSettingsLink(){const {locale}=useLocale();return <Link href="/dashboard/profile/language" style={{display:'inline-flex',gap:10,alignItems:'center',padding:'12px 15px',border:'1px solid #d1e0d5',borderRadius:10,color:'#24744d',fontSize:13,margin:'12px 0'}}><span style={{width:28,display:'inline-flex'}}><LanguageFlag locale={locale}/></span>{languageText(locale,'settings')}</Link>}
