/**
 * File: route.ts
 * Purpose: API để save/unsave outfits vào wardrobe
 * 
 * Endpoints:
 * - POST: Save một outfit vào wardrobe
 * - DELETE: Unsave một outfit khỏi wardrobe
 * - GET: Kiểm tra trạng thái saved của outfit
 * 
 * Flow:
 * 1. Kiểm tra authentication
 * 2. Kiểm tra outfit tồn tại
 * 3. Thêm/xóa khỏi wardrobe
 * 4. Return kết quả
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Save một outfit vào wardrobe
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
        const { outfitId, name, imageUrl } = body;

        if (!outfitId || !imageUrl) {
            return NextResponse.json(
                { success: false, error: 'Outfit ID and image URL are required' },
                { status: 400 }
            );
        }

        // Check if outfit exists
        const { data: outfit, error: outfitError } = await supabase
            .from('public_outfits')
            .select('id, name, image_url')
            .eq('id', outfitId)
            .eq('is_public', true)
            .single();

        if (outfitError || !outfit) {
            return NextResponse.json(
                { success: false, error: 'Outfit not found' },
                { status: 404 }
            );
        }

        // Check if already saved
        const { data: existingSave } = await supabase
            .from('saved_outfits')
            .select('id')
            .eq('outfit_id', outfitId)
            .eq('user_id', user.id)
            .single();

        if (existingSave) {
            return NextResponse.json({
                success: true,
                message: 'Already saved',
                isSaved: true
            });
        }

        // Save outfit to wardrobe
        const { error: saveError } = await supabase
            .from('saved_outfits')
            .insert({
                outfit_id: outfitId,
                user_id: user.id,
                name: name || outfit.name || 'Saved Outfit',
                image_url: imageUrl
            });

        if (saveError) {
            console.error('Error saving outfit:', saveError);
            return NextResponse.json(
                { success: false, error: 'Failed to save outfit' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Outfit saved successfully',
            isSaved: true
        });

    } catch (error) {
        console.error('Error in save outfit API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE: Unsave một outfit khỏi wardrobe
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

        // Remove from saved outfits
        const { error: unsaveError } = await supabase
            .from('saved_outfits')
            .delete()
            .eq('outfit_id', outfitId)
            .eq('user_id', user.id);

        if (unsaveError) {
            console.error('Error unsaving outfit:', unsaveError);
            return NextResponse.json(
                { success: false, error: 'Failed to unsave outfit' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Outfit unsaved successfully',
            isSaved: false
        });

    } catch (error) {
        console.error('Error in unsave outfit API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET: Kiểm tra trạng thái saved của outfit
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

        // Check if user has saved this outfit
        const { data: saved, error: savedError } = await supabase
            .from('saved_outfits')
            .select('id')
            .eq('outfit_id', outfitId)
            .eq('user_id', user.id)
            .single();

        if (savedError && savedError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking saved status:', savedError);
            return NextResponse.json(
                { success: false, error: 'Failed to check saved status' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            isSaved: !!saved,
            outfitId
        });

    } catch (error) {
        console.error('Error in check saved status API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}