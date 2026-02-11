/**
 * File: route.ts
 * Purpose: API để quản lý comments cho outfits
 * 
 * Endpoints:
 * - GET: Lấy danh sách comments của một outfit
 * - POST: Thêm comment mới
 * - DELETE: Xóa comment
 * 
 * Flow:
 * 1. Kiểm tra authentication (cho POST/DELETE)
 * 2. Validate input
 * 3. Thực hiện operation
 * 4. Return kết quả
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Lấy danh sách comments của một outfit
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const outfitId = searchParams.get('outfitId');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!outfitId) {
            return NextResponse.json(
                { success: false, error: 'Outfit ID is required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Fetch comments với user info
        const { data: comments, error } = await supabase
            .from('outfit_comments')
            .select(`
                id,
                content,
                created_at,
                user_id,
                profiles:user_id (
                    display_name,
                    avatar_url
                )
            `)
            .eq('outfit_id', outfitId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching comments:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch comments' },
                { status: 500 }
            );
        }

        const formattedComments = (comments || []).map(comment => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.created_at,
            user: {
                id: comment.user_id,
                name: comment.profiles?.display_name || 'Người dùng ẩn',
                avatar: comment.profiles?.avatar_url || ''
            }
        }));

        return NextResponse.json({
            success: true,
            data: formattedComments,
            total: comments?.length || 0
        });

    } catch (error) {
        console.error('Error in get comments API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST: Thêm comment mới
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
        const { outfitId, content } = body;

        if (!outfitId || !content?.trim()) {
            return NextResponse.json(
                { success: false, error: 'Outfit ID and content are required' },
                { status: 400 }
            );
        }

        // Check if outfit exists and is public
        const { data: outfit, error: outfitError } = await supabase
            .from('public_outfits')
            .select('id')
            .eq('id', outfitId)
            .eq('is_public', true)
            .single();

        if (outfitError || !outfit) {
            return NextResponse.json(
                { success: false, error: 'Outfit not found' },
                { status: 404 }
            );
        }

        // Add comment (trigger will automatically update comments_count)
        const { data: newComment, error: commentError } = await supabase
            .from('outfit_comments')
            .insert({
                outfit_id: outfitId,
                user_id: user.id,
                content: content.trim()
            })
            .select(`
                id,
                content,
                created_at,
                user_id,
                profiles:user_id (
                    display_name,
                    avatar_url
                )
            `)
            .single();

        if (commentError) {
            console.error('Error adding comment:', commentError);
            return NextResponse.json(
                { success: false, error: 'Failed to add comment' },
                { status: 500 }
            );
        }

        const formattedComment = {
            id: newComment.id,
            content: newComment.content,
            createdAt: newComment.created_at,
            user: {
                id: newComment.user_id,
                name: newComment.profiles?.display_name || 'Người dùng ẩn',
                avatar: newComment.profiles?.avatar_url || ''
            }
        };

        return NextResponse.json({
            success: true,
            data: formattedComment,
            message: 'Comment added successfully'
        });

    } catch (error) {
        console.error('Error in add comment API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE: Xóa comment
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
        const commentId = searchParams.get('commentId');

        if (!commentId) {
            return NextResponse.json(
                { success: false, error: 'Comment ID is required' },
                { status: 400 }
            );
        }

        // Check if comment belongs to user
        const { data: comment, error: checkError } = await supabase
            .from('outfit_comments')
            .select('id')
            .eq('id', commentId)
            .eq('user_id', user.id)
            .single();

        if (checkError || !comment) {
            return NextResponse.json(
                { success: false, error: 'Comment not found or unauthorized' },
                { status: 404 }
            );
        }

        // Delete comment (trigger will automatically update comments_count)
        const { error: deleteError } = await supabase
            .from('outfit_comments')
            .delete()
            .eq('id', commentId)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('Error deleting comment:', deleteError);
            return NextResponse.json(
                { success: false, error: 'Failed to delete comment' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('Error in delete comment API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}