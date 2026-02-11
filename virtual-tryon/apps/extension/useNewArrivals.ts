/**
 * File: useNewArrivals.ts
 * Purpose: Hook để fetch outfits mới nhất cho homepage
 * 
 * Input: limit (default: 10)
 * Output: { data, isLoading, error, refresh }
 * 
 * Flow:
 * 1. Fetch data từ /api/home/new-arrivals
 * 2. Handle loading states và errors
 * 3. Support refresh function
 * 4. Realtime updates với Supabase subscription
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface OutfitItem {
    id: string;
    name: string;
    imageUrl: string;
    user: {
        name: string;
        avatar: string;
    };
    likes: number;
    comments: number;
    isSaved?: boolean;
}

export function useNewArrivals(limit = 10) {
    const [data, setData] = useState<OutfitItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch new arrivals from API
    const fetchNewArrivals = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch(`/api/home/new-arrivals?limit=${limit}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                setData(result.data || []);
            } else {
                setError(result.error || 'Failed to fetch new arrivals');
            }
        } catch (err) {
            console.error('Error fetching new arrivals:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch new arrivals');
        } finally {
            setIsLoading(false);
        }
    }, [limit]);

    // Initial fetch
    useEffect(() => {
        fetchNewArrivals();
    }, [fetchNewArrivals]);

    // Realtime subscription for new outfits
    useEffect(() => {
        const supabase = createClient();
        
        // Subscribe to new public outfits
        const channel = supabase
            .channel('new-outfits')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'public_outfits',
                    filter: 'is_public=eq.true'
                },
                (payload) => {
                    console.log('[Realtime] New outfit added:', payload.new);
                    // Refresh data when new outfit is added
                    fetchNewArrivals();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchNewArrivals]);

    // Manual refresh function
    const refresh = useCallback(() => {
        fetchNewArrivals();
    }, [fetchNewArrivals]);

    return {
        data,
        isLoading,
        error,
        refresh
    };
}