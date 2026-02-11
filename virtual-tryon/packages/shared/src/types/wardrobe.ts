/**
 * File: wardrobe.ts
 * Purpose: Type definitions cho Wardrobe (Tủ đồ) feature
 * 
 * Input: N/A
 * Output: WardrobeItem, SavedOutfit interfaces
 */

export type ClothingCategory = 'top' | 'bottom' | 'dress' | 'outerwear' | 'accessories';

export interface WardrobeItem {
    id: string;
    user_id: string;
    image_url: string;
    name?: string;
    category?: ClothingCategory;
    source_url?: string; // URL gốc nếu lấy từ web
    created_at: string;
}

export interface SavedOutfit {
    id: string;
    user_id: string;
    tryon_id: string;
    name?: string;
    is_favorite: boolean;
    created_at: string;
    // Joined data
    tryon?: {
        person_image_url: string;
        clothing_image_url: string;
        result_image_url: string;
    };
}

export interface WardrobeStats {
    total_items: number;
    by_category: Record<ClothingCategory, number>;
}
