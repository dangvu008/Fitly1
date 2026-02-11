/**
 * File: tryon.ts
 * Purpose: Type definitions cho Virtual Try-On feature
 * 
 * Input: N/A
 * Output: TryOn, TryOnRequest, TryOnResult interfaces
 */

export type TryOnStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TryOn {
    id: string;
    user_id: string;
    person_image_url: string;
    clothing_image_url: string;
    result_image_url?: string;
    gems_used: number;
    status: TryOnStatus;
    error_message?: string;
    created_at: string;
}

export interface TryOnRequest {
    person_image: string; // base64 hoặc URL
    clothing_image: string; // base64 hoặc URL
    quality?: 'standard' | 'hd'; // standard = 1 gem, hd = 2 gems
}

export interface TryOnResult {
    success: boolean;
    result_image_url?: string;
    tryon_id?: string;
    gems_used?: number;
    error?: string;
}
