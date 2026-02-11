/**
 * File: route.ts
 * Purpose: API để like/unlike outfits
 * 
 * Endpoints:
 * - POST: Like một outfit
 * - DELETE: Unlike một outfit
 * 
 * Flow:
 * 1. Kiểm tra authentication
 * 2. Kiểm tra outfit tồn tại
 * 3. Thêm/xóa like và cập nhật số lượng
 * 4. Return kết quả với realtime updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Like một outfit
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { outfitId } = body;

        if (!outfitId) {
            return NextResponse.json(
                { success: false, error: 'Outfit ID is required' },
                { status: 400 }
            );
        }

        // Check if outfit exists and is public
        const { data: outfit, error: outfitError } = await supabase
            .from('public_outfits')
            .select('id, likes_count')
            .eq('id', outfitId)
            .eq('is_public', true)
            .single();

        if (outfitError || !outfit) {
            return NextResponse.json(
                { success: false, error: 'Outfit not found' },
                { status: 404 }
            );
        }

        // Check if already liked
        const { data: existingLike } = await supabase
            .from('outfit_likes')
            .select('id')
            .eq('outfit_id', outfitId)
            .eq('user_id', user.id)
            .single();

        if (existingLike) {
            return NextResponse.json({
                success: true,
                message: 'Already liked',
                likesCount: outfit.likes_count,
                isLiked: true
            });
        }

        // Add like (trigger will automatically update likes_count)
        const { error: likeError } = await supabase
            .from('outfit_likes')
            .insert({
                outfit_id: outfitId,
                user_id: user.id
            });

        if (likeError) {
            console.error('Error adding like:', likeError);
            return NextResponse.json(
                { success: false, error: 'Failed to like outfit' },
                { status: 500 }
            );
        }

        // Get updated likes count
        const { data: updatedOutfit } = await supabase
            .from('public_outfits')
            .select('likes_count')
            .eq('id', outfitId)
            .single();

        return NextResponse.json({
            success: true,
            message: 'Outfit liked successfully',
            likesCount: updatedOutfit?.likes_count || outfit.likes_count + 1,
            isLiked: true
        });

    } catch (error) {
        console.error('Error in like outfit API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE: Unlike một outfit
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const outfitId = searchParams.get('outfitId');

        if (!outfitId) {
            return NextResponse.json(
                { success: false, error: 'Outfit ID is required' },
                { status: 400 }
            );
        }

        // Check if outfit exists
        const { data: outfit, error: outfitError } = await supabase
            .from('public_outfits')
            .select('id, likes_count')
            .eq('id', outfitId)
            .single();

        if (outfitError || !outfit) {
            return NextResponse.json(
                { success: false, error: 'Outfit not found' },
                { status: 404 }
            );
        }

        // Remove like (trigger will automatically update likes_count)
        const { error: unlikeError } = await supabase
            .from('outfit_likes')
            .delete()
            .eq('outfit_id', outfitId)
            .eq('user_id', user.id);

        if (unlikeError) {
            console.error('Error removing like:', unlikeError);
            return NextResponse.json(
                { success: false, error: 'Failed to unlike outfit' },
                { status: 500 }
            );
        }

        // Get updated likes count
        const { data: updatedOutfit } = await supabase
            .from('public_outfits')
            .select('likes_count')
            .eq('id', outfitId)
            .single();

        return NextResponse.json({
            success: true,
            message: 'Outfit unliked successfully',
            likesCount: updatedOutfit?.likes_count || Math.max(0, outfit.likes_count - 1),
            isLiked: false
        });

    } catch (error) {
        console.error('Error in unlike outfit API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET: Kiểm tra trạng thái like của user
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const outfitId = searchParams.get('outfitId');

        if (!outfitId) {
            return NextResponse.json(
                { success: false, error: 'Outfit ID is required' },
                { status: 400 }
            );
        }

        // Check if user has liked this outfit
        const { data: like, error: likeError } = await supabase
            .from('outfit_likes')
            .select('id')
            .eq('outfit_id', outfitId)
            .eq('user_id', user.id)
            .single();

        if (likeError && likeError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking like status:', likeError);
            return NextResponse.json(
                { success: false, error: 'Failed to check like status' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            isLiked: !!like,
            outfitId
        });

    } catch (error) {
        console.error('Error in check like status API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}