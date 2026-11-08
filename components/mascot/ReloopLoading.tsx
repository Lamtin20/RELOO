'use client';
import {MascotLoader,type MascotLoaderProps} from './MascotLoader';
export type ReloopLoadingProps=MascotLoaderProps;
export function ReloopLoading(props:ReloopLoadingProps){return <MascotLoader {...props} className={`reloop-loading ${props.className||''}`}/>;}
