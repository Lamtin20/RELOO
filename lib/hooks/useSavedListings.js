"use client";
import {useMarketplaceFollows} from "./useMarketplaceFollows";
export function useSavedListings(){return useMarketplaceFollows("LISTING","reloo-saved-listings","reloo-saved-listings-change");}
