import {readFile} from 'node:fs/promises';import {join} from 'node:path';let current;
export function webBuild(){if(process.env.NODE_ENV!=='production')return Promise.resolve('development');current??=readFile(join(process.cwd(),'.next','BUILD_ID'),'utf8').then(s=>s.trim()).catch(()=>'development');return current;}
