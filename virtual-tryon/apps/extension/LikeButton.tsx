/**
 * File: LikeButton.tsx
 * Purpose: Component like button với realtime updates và animations
 * 
 * Features:
 * - Realtime like/unlike
 * - Animated heart icon
 * - Like count display
 * - Optimistic updates
 * - Error handling
 */

'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LikeButtonProps {
    outfitId: string;
    initialLikes: number;
    initialLiked?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showCount?: boolean;
    onLikeChange?: (isLiked: boolean, likesCount: number) => void;
}

export function LikeButton({ 
    outfitId, 
    initialLikes, 
    initialLiked = false,
    size = 'md',
    showCount = true,
    onLikeChange 
}: LikeButtonProps) {
    const [isLiked, setIsLiked] = useState(initialLiked);
    const [likesCount, setLikesCount] = useState(initialLikes);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const supabase = createClient();

    // Fetch initial like status
    useEffect(() => {
        const checkLikeStatus = async () => {
            try {
                const response = await fetch(`/api/outfits/${outfitId}/like`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setIsLiked(data.isLiked);
                    }
                }
            } catch (error) {
                console.error('Error checking like status:', error);
            }
        };

        checkLikeStatus();
    }, [outfitId]);

    // Realtime subscription for likes updates
    useEffect(() => {
        const channel = supabase
            .channel(`outfit-likes-${outfitId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'outfit_likes',
                    filter: `outfit_id=eq.${outfitId}`
                },
                (payload) => {
                    // Update likes count based on realtime changes
                    if (payload.eventType === 'INSERT') {
                        setLikesCount(prev => prev + 1);
                    } else if (payload.eventType === 'DELETE') {
                        setLikesCount(prev => Math.max(0, prev - 1));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, outfitId]);

    const handleLike = async () => {
        if (isLoading) return;

        setIsLoading(true);
        setIsAnimating(true);

        // Optimistic update
        const newLikedState = !isLiked;
        const newLikesCount = newLikedState ? likesCount + 1 : Math.max(0, likesCount - 1);
        
        setIsLiked(newLikedState);
        setLikesCount(newLikesCount);

        // Notify parent component
        onLikeChange?.(newLikedState, newLikesCount);

        try {
            const method = newLikedState ? 'POST' : 'DELETE';
            const url = newLikedState 
                ? `/api/outfits/${outfitId}/like`
                : `/api/outfits/${outfitId}/like?outfitId=${outfitId}`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: newLikedState ? JSON.stringify({ outfitId }) : undefined
            });

            if (!response.ok) {
                throw new Error('Failed to update like status');
            }

            const data = await response.json();
            
            if (data.success) {
                // Update with server response
                setLikesCount(data.likesCount || newLikesCount);
            } else {
                // Revert on error
                setIsLiked(!newLikedState);
                setLikesCount(likesCount);
                onLikeChange?.(!newLikedState, likesCount);
            }
        } catch (error) {
            console.error('Error updating like:', error);
            // Revert on error
            setIsLiked(!newLikedState);
            setLikesCount(likesCount);
            onLikeChange?.(!newLikedState, likesCount);
        } finally {
            setIsLoading(false);
            setTimeout(() => setIsAnimating(false), 300);
        }
    };

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    const textSizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    };

    return (
        <button
            onClick={handleLike}
            disabled={isLoading}
            className={`
                flex items-center gap-1.5 transition-all duration-200
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}
            `}
            aria-label={isLiked ? 'Unlike outfit' : 'Like outfit'}
        >
            <Heart
                className={`
                    ${sizeClasses[size]} 
                    transition-all duration-200
                    ${isLiked ? 'fill-red-500' : 'fill-none'}
                    ${isAnimating ? 'animate-pulse scale-110' : ''}
                `}
            />
            {showCount && (
                <span className={`font-medium ${textSizeClasses[size]}`}>
                    {likesCount}
                </span>
            )}
        </button>
    );
}