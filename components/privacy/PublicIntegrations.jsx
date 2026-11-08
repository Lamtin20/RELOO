'use client';
import {createContext,useContext} from 'react';
const Context=createContext({dmca:null});
export function PublicIntegrationsProvider({dmca,children}){return <Context.Provider value={{dmca}}>{children}</Context.Provider>}
export const usePublicIntegrations=()=>useContext(Context);
