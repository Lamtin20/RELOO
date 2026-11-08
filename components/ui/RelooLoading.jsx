'use client';
import {experienceText} from '@/lib/neighborhood/experience';
import {useLocale} from '@/components/settings/LocaleProvider';
import './reloo-loading.css';

export function RelooLoading({locale:requestedLocale,compact=false}){
 const {locale:globalLocale}=useLocale(),locale=requestedLocale||globalLocale;
 return <div className={'reloo-loading-status'+(compact?' is-compact':'')} role="status"><span className="reloo-circle-spinner" aria-hidden="true"/><span>{experienceText(locale,'reuseLoading')}</span></div>;
}
export function RentalSkeleton(){return <div className="reloo-rental-skeleton" aria-hidden="true">{Array.from({length:6},(_,i)=><div key={i}><span/><i/><i/><i/></div>)}</div>;}
