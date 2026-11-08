import {staysGet,staysPost} from '@/lib/stays/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=staysGet;
export const POST=staysPost;
