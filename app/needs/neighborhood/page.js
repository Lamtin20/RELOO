import {redirect} from 'next/navigation';
import {legacyWorkspaceDestination} from '@/lib/dashboard/legacy-route';
export default async function Page({searchParams}){redirect(legacyWorkspaceDestination('needs',await searchParams));}
