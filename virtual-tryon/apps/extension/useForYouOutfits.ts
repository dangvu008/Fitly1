/**
 * File: useForYouOutfits.ts
 * Purpose: Hook để fetch outfits đề xuất cho homepage (For You section)
 * 
 * Input: limit (default: 10)
 * Output: { data, isLoading, error, refresh }
 * 
 * Flow:
 * 1. Fetch data từ /api/home/for-you
 * 2. Handle loading states và errors
 * 3. Support refresh function
 * 4. Realtime updates với Supabase subscription
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthContext } from '@/components/auth/AuthProvider';

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

export function useForYouOutfits(limit = 12) {
    const { user, isAuthenticated } = useAuthContext();
    const [data, setData] = useState<OutfitItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch for-you outfits from API
    const fetchForYouOutfits = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch(`/api/home/for-you?limit=${limit}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                setData(result.data || []);
            } else {
                setError(result.error || 'Failed to fetch outfits for you');
            }
        } catch (err) {
            console.error('Error fetching for-you outfits:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch outfits for you');
        } finally {
            setIsLoading(false);
        }
    }, [limit]);

    // Initial fetch
    useEffect(() => {
        fetchForYouOutfits();
    }, [fetchForYouOutfits]);

    // Realtime subscription for personalized updates
    useEffect(() => {
        if (!isAuthenticated) return;

        const supabase = createClient();
        
        // Subscribe to user-specific outfit recommendations
        const channel = supabase
            .channel('for-you-outfits')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'public_outfits',
                    filter: 'is_public=eq.true'
                },
                (payload) => {
                    console.log('[Realtime] New outfit for you:', payload.new);
                    // Refresh data when new outfit is added
                    fetchForYouOutfits();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAuthenticated, fetchForYouOutfits]);

    // Manual refresh function
    const refresh = useCallback(() => {
        fetchForYouOutfits();
    }, [fetchForYouOutfits]);

    return {
        data,
        isLoading,
        error,
        refresh
    };
}