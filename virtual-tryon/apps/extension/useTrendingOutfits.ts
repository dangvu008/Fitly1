/**
 * File: useTrendingOutfits.ts
 * Purpose: Hook để fetch outfits trending cho homepage
 * 
 * Input: limit (default: 10)
 * Output: { data, isLoading, error, refresh }
 * 
 * Flow:
 * 1. Fetch data từ /api/home/trending
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

export function useTrendingOutfits(limit = 10) {
    const [data, setData] = useState<OutfitItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch trending outfits from API
    const fetchTrendingOutfits = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch(`/api/home/trending?limit=${limit}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                setData(result.data || []);
            } else {
                setError(result.error || 'Failed to fetch trending outfits');
            }
        } catch (err) {
            console.error('Error fetching trending outfits:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch trending outfits');
        } finally {
            setIsLoading(false);
        }
    }, [limit]);

    // Initial fetch
    useEffect(() => {
        fetchTrendingOutfits();
    }, [fetchTrendingOutfits]);

    // Realtime subscription for trending changes (likes)
    useEffect(() => {
        const supabase = createClient();
        
        // Subscribe to likes changes on public_outfits
        const channel = supabase
            .channel('trending-outfits')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'public_outfits',
                    filter: 'is_public=eq.true'
                },
                (payload) => {
                    console.log('[Realtime] Outfit likes updated:', payload.new);
                    // Refresh data when likes are updated
                    fetchTrendingOutfits();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTrendingOutfits]);

    // Manual refresh function
    const refresh = useCallback(() => {
        fetchTrendingOutfits();
    }, [fetchTrendingOutfits]);

    return {
        data,
        isLoading,
        error,
        refresh
    };
}