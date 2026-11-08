'use client';
// Compatibility adapter: one shared product pipeline owns impressions.
import {useProductAnalytics} from '@/components/analytics/ProductAnalytics';
export function useRentalMeasurement(){return useProductAnalytics().record;}
export function RentalImpressions(){return null;}
