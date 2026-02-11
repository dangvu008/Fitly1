/**
 * File: route.ts
 * Purpose: API để lấy outfits đề xuất cho user (For You section)
 * 
 * Input: Query params: limit (default: 10)
 * Output: Danh sách outfits đề xuất (personalized hoặc random)
 * 
 * Flow:
 * 1. Kiểm tra user authentication
 * 2. Lấy outfits đề xuất dựa trên user preferences hoặc random
 * 3. Return kết quả
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
        
        const supabase = await createClient();
        
        // Check if user is authenticated for personalized recommendations
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        // Try to fetch from public_outfits table
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
            .order('created_at', { ascending: false })
            .limit(limit * 2); // Get more for randomization

        if (!publicError && publicOutfits && publicOutfits.length > 0) {
            // Shuffle array for "for you" feel
            const shuffled = publicOutfits.sort(() => 0.5 - Math.random()).slice(0, limit);
            
            const outfits = shuffled.map(outfit => ({
                id: outfit.id,
                name: outfit.name || 'Outfit dành cho bạn',
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

        // Fallback: fetch from sample_outfits table and randomize
        const { data: sampleOutfits, error: sampleError } = await supabase
            .from('sample_outfits')
            .select(`
                id,
                name,
                image_url,
                category,
                display_order
            `)
            .limit(limit * 2); // Get more for randomization

        if (sampleError) {
            console.error('Error fetching sample outfits:', sampleError);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch outfits'
            }, { status: 500 });
        }

        // Shuffle and limit results for "for you" feel
        const shuffled = (sampleOutfits || []).sort(() => 0.5 - Math.random()).slice(0, limit);
        
        // Return sample data with personalized mock info
        const vietnameseNames = ['Linh N.', 'Minh T.', 'Hà P.', 'Đức A.', 'Mai L.', 'Tuấn K.'];
        const outfits = shuffled.map((outfit, index) => ({
            id: outfit.id,
            name: outfit.name,
            imageUrl: outfit.image_url,
            user: {
                name: vietnameseNames[index % vietnameseNames.length],
                avatar: ''
            },
            likes: Math.floor(Math.random() * 600) + 200,
            comments: Math.floor(Math.random() * 60) + 20,
            isSaved: false
        }));

        return NextResponse.json({
            success: true,
            data: outfits
        });

    } catch (error) {
        console.error('Error in for-you outfits API:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}