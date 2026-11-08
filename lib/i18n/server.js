import {cookies,headers} from 'next/headers';
import {validLocale,headerLocale,LOCALE_COOKIE} from './locale';
export async function requestLocale(){const [jar,h]=await Promise.all([cookies(),headers()]);const saved=jar.get(LOCALE_COOKIE)?.value;return validLocale(saved)?saved:headerLocale(h.get('accept-language')||'');}
