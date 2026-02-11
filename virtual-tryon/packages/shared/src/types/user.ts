/**
 * File: user.ts
 * Purpose: Type definitions cho User và Profile
 * 
 * Input: N/A
 * Output: User, Profile, BodyImage interfaces
 */

export interface User {
    id: string;
    email: string;
    created_at: string;
}

export interface Profile {
    id: string;
    gems_balance: number;
    avatar_url?: string;
    display_name?: string;
    created_at: string;
}

export interface AuthState {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

/**
 * Body image cho virtual try-on
 * Người dùng có thể lưu nhiều ảnh toàn thân và chọn một ảnh làm mặc định
 */
export interface BodyImage {
    id: string;
    user_id: string;
    image_url: string;
    name?: string;
    is_default: boolean;
    created_at: string;
}

/**
 * Body image được lưu local (cho người dùng chưa đăng nhập)
 */
export interface LocalBodyImage {
    id: string;
    image_data: string; // base64 data URL
    name?: string;
    is_default: boolean;
    created_at: string;
}
