"use client";
import {useLinkStatus} from 'next/link';
import {useLocale} from '@/components/settings/LocaleProvider';
import {mobileExperienceCopy} from '@/lib/i18n/mobile-experience';
import './navigation-feedback.css';
export function NavigationFeedback(){const {pending}=useLinkStatus(),{locale}=useLocale(),t=mobileExperienceCopy[locale]||mobileExperienceCopy['vi-VN'];return <span className="tap-link-feedback" data-pending={pending}><span className="sr-only" role="status">{pending?t.opening:''}</span></span>;}
