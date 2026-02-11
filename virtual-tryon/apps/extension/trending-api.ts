/**
 * File: route.ts
 * Purpose: API để lấy outfits trending (nhiều likes) cho homepage
 * 
 * Input: Query params: limit (default: 10)
 * Output: Danh sách outfits trending
 * 
 * Flow:
 * 1. Parse query params
 * 2. Fetch outfits trending từ Supabase (sắp xếp theo likes)
 * 3. Return kết quả
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
        
        const supabase = await createClient();
        
        // Try to fetch from public_outfits table first, sorted by likes
        const { data: publicOutfits, error: publicError } = await supabase
            .from('public_outfits')
            .select(`
                id,
                name,
                image_url,
                user_id,
                likes_count,
                comments_count,
                created_at,
                profiles:user_id (
                    display_name,
                    avatar_url
                )
            `)
            .eq('is_public', true)
            .order('likes_count', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);

        if (!publicError && publicOutfits && publicOutfits.length > 0) {
            // Return real data from database
            const outfits = publicOutfits.map(outfit => ({
                id: outfit.id,
                name: outfit.name || 'Outfit trending',
                imageUrl: outfit.image_url,
                user: {
                    name: outfit.profiles?.display_name || 'Người dùng ẩn',
                    avatar: outfit.profiles?.avatar_url || ''
                },
                likes: outfit.likes_count || 0,
                comments: outfit.comments_count || 0,
                isSaved: false
            }));

            return NextResponse.json({
                success: true,
                data: outfits
            });
        }

        // Fallback: fetch from sample_outfits table and add trending data
        const { data: sampleOutfits, error: sampleError } = await supabase
            .from('sample_outfits')
            .select(`
                id,
                name,
                image_url,
                category,
                display_order
            `)
            .order('display_order', { ascending: false })
            .limit(limit);

        if (sampleError) {
            console.error('Error fetching sample outfits:', sampleError);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch trending outfits'
            }, { status: 500 });
        }

        // Return sample data with trending mock info
        const vietnameseNames = ['Vy N.', 'Hoàng D.', 'An T.', 'Bình N.', 'Chi L.', 'Dung P.'];
        const outfits = (sampleOutfits || []).map((outfit, index) => ({
            id: outfit.id,
            name: outfit.name,
            imageUrl: outfit.image_url,
            user: {
                name: vietnameseNames[index % vietnameseNames.length],
                avatar: ''
            },
            likes: Math.floor(Math.random() * 800) + 400, // Higher likes for trending
            comments: Math.floor(Math.random() * 80) + 30,
            isSaved: false
        }));

        return NextResponse.json({
            success: true,
            data: outfits
        });

    } catch (error) {
        console.error('Error in trending outfits API:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}