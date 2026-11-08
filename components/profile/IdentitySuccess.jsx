'use client';
import {useLocale} from '@/components/settings/LocaleProvider';
import './identity-review.css';
export function IdentitySuccess(){const {locale}=useLocale();return <section className="identity-success" role="status" aria-live="polite"><svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true"><circle cx="44" cy="44" r="39" fill="none" stroke="currentColor" strokeWidth="3"/><path d="m25 44 13 13 25-27" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg><h2>{locale==='en-US'?'Verification complete':'Xác thực thành công'}</h2><p>{locale==='en-US'?'Your account details have been updated.':'Thông tin tài khoản đã được cập nhật.'}</p></section>}
