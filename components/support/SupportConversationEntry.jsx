'use client';
import Link from 'next/link';
import {MessageCircle} from 'lucide-react';
import {useLocale} from '@/components/settings/LocaleProvider';
import './support-chat.css';
export function SupportConversationEntry(){const {locale}=useLocale(),en=locale==='en-US';return <Link className="reloo-support-entry" href="/dashboard/messages?support=1"><span className="advisor-avatar"><MessageCircle size={22}/></span><span><strong>RELOO</strong><small>{en?'Find items · Rental advice · Order support':'Tìm đồ · Tư vấn thuê · Hỗ trợ đơn hàng'}</small></span></Link>}
