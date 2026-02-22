/**
 * File: api.ts
 * Purpose: API constants và endpoints
 * 
 * Input: N/A
 * Output: API_ENDPOINTS, API_ERRORS constants
 */

// API Endpoints (relative paths)
export const API_ENDPOINTS = {
    // Auth
    AUTH_LOGIN: '/api/auth/login',
    AUTH_REGISTER: '/api/auth/register',
    AUTH_LOGOUT: '/api/auth/logout',
    AUTH_CALLBACK: '/api/auth/callback',

    // Try-On
    TRYON_CREATE: '/api/tryon',
    TRYON_HISTORY: '/api/tryon/history',
    TRYON_DETAIL: (id: string) => `/api/tryon/${id}`,

    // Gems
    GEMS_BALANCE: '/api/gems/balance',
    GEMS_PURCHASE: '/api/gems/purchase',
    GEMS_TRANSACTIONS: '/api/gems/transactions',

    // Wardrobe
    WARDROBE_LIST: '/api/wardrobe',
    WARDROBE_ADD: '/api/wardrobe',
    WARDROBE_DELETE: (id: string) => `/api/wardrobe/${id}`,

    // Outfits
    OUTFITS_SAVED: '/api/outfits/saved',
    OUTFITS_SAVE: '/api/outfits/save',
    OUTFITS_DELETE: (id: string) => `/api/outfits/${id}`,

    // Lemon Squeezy Payments
    LEMON_CHECKOUT: '/api/lemon-squeezy/checkout',
    LEMON_WEBHOOK: '/api/lemon-squeezy/webhook',
} as const;

// Common API error codes
export const API_ERRORS = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    INSUFFICIENT_GEMS: 'INSUFFICIENT_GEMS',
    INVALID_IMAGE: 'INVALID_IMAGE',
    AI_PROCESSING_FAILED: 'AI_PROCESSING_FAILED',
    RATE_LIMITED: 'RATE_LIMITED',
    SERVER_ERROR: 'SERVER_ERROR',
} as const;

// Message action types for Chrome extension
export const EXTENSION_MESSAGES = {
    OPEN_SIDEBAR: 'OPEN_SIDEBAR',
    CAPTURE_IMAGE: 'CAPTURE_IMAGE',
    GET_AUTH_STATE: 'GET_AUTH_STATE',
    PROCESS_TRYON: 'PROCESS_TRYON',
    ADD_TO_WARDROBE: 'ADD_TO_WARDROBE',
} as const;
