'use client';
import {useLocale} from '@/components/settings/LocaleProvider';
export function StagingBanner(){const {locale}=useLocale();return <aside className="reloo-staging-banner" role="status" style={{background:'#ffe3aa',color:'#173b2d',padding:'10px 16px',textAlign:'center',fontSize:13,fontWeight:700}}>STAGING · {locale==='en-US'?'Test environment — no real payments or notifications':'Môi trường kiểm thử — không thu tiền hoặc gửi thông báo thật'}</aside>}
