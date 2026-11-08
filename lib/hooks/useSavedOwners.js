"use client";
import {useMarketplaceFollows} from "./useMarketplaceFollows";
export function useSavedOwners(){return useMarketplaceFollows("OWNER","reloo-saved-owners","reloo-saved-owners-change");}
