import {notFound} from 'next/navigation';
import {DesignPreview} from '@/components/design/DesignPreview';
export const dynamic='force-dynamic';
export const metadata={title:'RELOO · UI preview',robots:{index:false,follow:false}};
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <DesignPreview/>}
