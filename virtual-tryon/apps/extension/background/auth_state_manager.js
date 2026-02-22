/**
 * File: auth_state_manager.js
 * Purpose: Quản lý trạng thái xác thực (token, refresh), chế độ demo, gọi API cần auth
 * Layer: Infrastructure (Auth)
 * * Data Contract:
 * - Exports isDemoMode, getAuthToken, updateCachedAuthState, checkAndRefreshToken, makeAuthenticatedRequest, forceRefreshToken
 */

import { DEMO_MODE_OVERRIDE, SUPABASE_AUTH_URL, SUPABASE_AUTH_KEY } from './ENVIRONMENT_CONFIG.js';

let _cachedAuthState = null;

// Refresh mutex — prevents concurrent refresh calls from racing
let _refreshPromise = null;

export async function isDemoMode() {
    if (DEMO_MODE_OVERRIDE) return true;

    try {
        const data = await chrome.storage.local.get(['auth_token', 'expires_at', 'refresh_token']);
        if (data.auth_token && data.expires_at) {
            const isExpired = Date.now() > data.expires_at;
            if (!isExpired) {
                return false;
            }
        }

        if (data.refresh_token) {
            const refreshed = await getAuthToken();
            if (refreshed) return false;
        }

        const allStorage = await chrome.storage.local.get(null);
        const supabaseKey = Object.keys(allStorage).find(k =>
            k === 'fitly-auth-token' || (k.startsWith('sb-') && k.endsWith('-auth-token'))
        );
        if (supabaseKey && allStorage[supabaseKey]) {
            const refreshed = await getAuthToken();
            if (refreshed) return false;
        }
    } catch (error) {
        console.warn('[Fitly] Error checking auth state:', error);
    }

    return true;
}

export function isDemoModeSync() {
    if (DEMO_MODE_OVERRIDE) return true;
    return _cachedAuthState === null ? true : !_cachedAuthState;
}

/**
 * isGuestMode: Trả về true nếu user THỰC SỰ chưa đăng nhập (không có auth token),
 * và DEMO_MODE_OVERRIDE = false.
 *
 * Khác với isDemoMode(): isDemoMode = true với cả guest lẫn demo override.
 * isGuestMode = true CHỈ KHI không có token và không phải demo override.
 *
 * Dùng để block các tính năng cần auth (wardrobe, save outfit...) cho guest user,
 * trong khi vẫn cho phép demo mode (DEMO_MODE_OVERRIDE = true) hoạt động bình thường.
 */
export async function isGuestMode() {
    // Nếu DEMO_MODE_OVERRIDE = true → đây là demo intentional, không phải guest
    if (DEMO_MODE_OVERRIDE) return false;
    // Kiểm tra token thực → không có token = guest thực sự
    const token = await getAuthToken();
    return !token;
}

export async function updateCachedAuthState() {
    try {
        const data = await chrome.storage.local.get(['auth_token', 'expires_at', 'refresh_token']);
        if (data.auth_token && data.expires_at && Date.now() < data.expires_at) {
            _cachedAuthState = true;
        } else if (data.refresh_token) {
            _cachedAuthState = true;
        } else {
            _cachedAuthState = false;
        }
    } catch (error) {
        _cachedAuthState = false;
    }
}

export async function getAuthToken() {
    const data = await chrome.storage.local.get(['auth_token', 'expires_at', 'refresh_token']);

    if (data.auth_token && data.expires_at) {
        const now = Date.now();
        const timeUntilExpiry = data.expires_at - now;

        // Token hoàn toàn hết hạn → không dùng được
        if (timeUntilExpiry <= 0) {
            // Thử refresh nếu có refresh_token
            if (data.refresh_token) {
                try {
                    const refreshed = await refreshAuthToken(data.refresh_token);
                    if (refreshed) return refreshed;
                } catch (e) {
                    console.error('[getAuthToken] Token refresh error (expired):', e);
                }
            }
            // Token expired và không refresh được → return null
            return null;
        }

        // Token còn hạn nhưng < 10 phút → proactive refresh
        if (timeUntilExpiry < 10 * 60 * 1000) {
            try {
                const refreshed = await refreshAuthToken(data.refresh_token);
                if (refreshed) return refreshed;
            } catch (e) {
                console.error('[getAuthToken] Proactive refresh failed, using existing token:', e);
            }
            // FIX: Refresh thất bại nhưng token vẫn còn valid → dùng token hiện tại
            return data.auth_token;
        }

        // Token còn hạn dài → dùng trực tiếp
        return data.auth_token;
    }

    const allStorage = await chrome.storage.local.get(null);
    const supabaseKey = Object.keys(allStorage).find(k => k === 'fitly-auth-token' || (k.startsWith('sb-') && k.endsWith('-auth-token')));

    if (supabaseKey && allStorage[supabaseKey]) {
        const sessionData = typeof allStorage[supabaseKey] === 'string'
            ? JSON.parse(allStorage[supabaseKey])
            : allStorage[supabaseKey];

        if (sessionData?.access_token) {
            const now = Date.now();
            const expiresAtMs = sessionData.expires_at ? sessionData.expires_at * 1000 : now + 3600000;
            const timeUntilExpiry = expiresAtMs - now;

            // Token từ supabase key đã hết hạn hoàn toàn
            if (timeUntilExpiry <= 0) {
                if (sessionData.refresh_token) {
                    try {
                        const refreshed = await refreshAuthToken(sessionData.refresh_token);
                        if (refreshed) return refreshed;
                    } catch (e) {
                        console.error('[getAuthToken] Session refresh error (expired):', e);
                    }
                }
                return null;
            }

            // Token còn trong vòng < 10 phút → thử refresh nhưng fallback nếu fail
            if (timeUntilExpiry < 10 * 60 * 1000 && sessionData.refresh_token) {
                try {
                    const refreshed = await refreshAuthToken(sessionData.refresh_token);
                    if (refreshed) return refreshed;
                } catch (e) {
                    console.error('[getAuthToken] Session proactive refresh failed, using existing:', e);
                }
            }

            // Sync token vào các key chuẩn để lần sau không cần parse lại
            await chrome.storage.local.set({
                auth_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token || data.refresh_token,
                expires_at: expiresAtMs,
            });
            return sessionData.access_token;
        }
    }
    return null;
}

export async function refreshAuthToken(refreshToken) {
    if (!refreshToken) return null;

    // STEP 1: If a refresh is already in-flight, wait for it instead of racing
    if (_refreshPromise) {
        try {
            return await _refreshPromise;
        } catch {
            return null;
        }
    }

    // STEP 2: Acquire mutex — this is the only active refresh
    _refreshPromise = _doRefresh(refreshToken);
    try {
        return await _refreshPromise;
    } finally {
        _refreshPromise = null;
    }
}

async function _doRefresh(refreshToken) {
    try {
        console.log('[_doRefresh] 🔄 Calling Supabase refresh, refresh_token prefix:', refreshToken?.substring(0, 20));
        const response = await fetch(`${SUPABASE_AUTH_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_AUTH_KEY },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            console.error('[_doRefresh] ❌ Refresh failed:', response.status, errorBody);
            return null;
        }

        const data = await response.json();
        if (data.access_token) {
            const expiresAtMs = Date.now() + (data.expires_in || 3600) * 1000;
            const expiresAtSec = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);
            console.log('[_doRefresh] ✅ Got new token, expires_in:', data.expires_in, 's, new refresh_token prefix:', data.refresh_token?.substring(0, 20));

            await chrome.storage.local.set({
                auth_token: data.access_token,
                refresh_token: data.refresh_token || refreshToken,
                expires_at: expiresAtMs,
                'fitly-auth-token': JSON.stringify({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token || refreshToken,
                    expires_at: expiresAtSec,
                    token_type: data.token_type || 'bearer',
                    user: data.user
                })
            });
            return data.access_token;
        }
        console.warn('[_doRefresh] ⚠️ Response OK but no access_token in body');
    } catch (error) {
        console.error('[_doRefresh] ❌ Exception:', error);
    }
    return null;
}

/**
 * Force refresh token regardless of current TTL.
 * Call this BEFORE expensive operations (Edge Function try-on) to ensure
 * token has maximum remaining lifetime (~1 hour).
 * Returns fresh access_token or throws error if refresh impossible.
 * 
 * TTL Check: If current token TTL > 900s (15 minutes), returns current token without refresh.
 * Rationale: Edge Function takes 3-5 minutes, plus network latency. 15-min threshold
 * ensures token won't expire mid-processing even in worst case.
 * Error Handling: Throws error with errorCode = 'REFRESH_FAILED' if all refresh attempts fail.
 */
export async function forceRefreshToken() {
    console.log('[forceRefreshToken] 🔄 START');

    // STEP 1: Get current token and check TTL
    const data = await chrome.storage.local.get(['refresh_token', 'auth_token', 'expires_at']);
    const ttl = data.expires_at ? Math.floor((data.expires_at - Date.now()) / 1000) : null;
    console.log('[forceRefreshToken] Current token TTL:', ttl, 's, has refresh_token:', !!data.refresh_token);

    // STEP 2: TTL Check - If token has >= 15 minutes remaining, no need to refresh
    // Edge Function takes 3-5 min → need sufficient margin to prevent mid-processing expiry
    if (ttl !== null && ttl >= 900) {
        console.log('[forceRefreshToken] ✅ Token TTL >= 900s (' + ttl + 's), using current token (no refresh needed)');
        if (data.auth_token) {
            return data.auth_token;
        }
    }

    console.log('[forceRefreshToken] Token TTL < 900s (' + ttl + 's) or expired, proceeding with refresh...');

    // STEP 3: Try refresh with legacy refresh_token
    if (data.refresh_token) {
        const freshToken = await refreshAuthToken(data.refresh_token);
        if (freshToken) {
            const newData = await chrome.storage.local.get(['expires_at']);
            const newTTL = newData.expires_at ? Math.floor((newData.expires_at - Date.now()) / 1000) : 'N/A';
            console.log('[forceRefreshToken] ✅ Refreshed via legacy refresh_token, new TTL:', newTTL, 's');
            return freshToken;
        }
        console.warn('[forceRefreshToken] ⚠️ Legacy refresh_token failed');
    }

    // STEP 4: Fallback — check supabase session key
    const allStorage = await chrome.storage.local.get(null);
    const supabaseKey = Object.keys(allStorage).find(k =>
        k === 'fitly-auth-token' || (k.startsWith('sb-') && k.endsWith('-auth-token'))
    );
    if (supabaseKey && allStorage[supabaseKey]) {
        const sessionData = typeof allStorage[supabaseKey] === 'string'
            ? JSON.parse(allStorage[supabaseKey])
            : allStorage[supabaseKey];
        if (sessionData?.refresh_token) {
            console.log('[forceRefreshToken] Trying supabase key:', supabaseKey);
            const freshToken = await refreshAuthToken(sessionData.refresh_token);
            if (freshToken) {
                const newData = await chrome.storage.local.get(['expires_at']);
                const newTTL = newData.expires_at ? Math.floor((newData.expires_at - Date.now()) / 1000) : 'N/A';
                console.log('[forceRefreshToken] ✅ Refreshed via supabase key, new TTL:', newTTL, 's');
                return freshToken;
            }
            console.warn('[forceRefreshToken] ⚠️ Supabase key refresh also failed');
        }
    }

    // STEP 5: All refresh attempts failed
    // If current token is still valid (TTL > 0), return it as fallback
    if (data.auth_token && data.expires_at && Date.now() < data.expires_at) {
        const remainingTTL = Math.floor((data.expires_at - Date.now()) / 1000);
        console.warn('[forceRefreshToken] ⚠️ All refresh failed, falling back to existing token (TTL:', remainingTTL, 's)');
        return data.auth_token;
    }

    // STEP 6: No valid token available - throw error with errorCode
    console.error('[forceRefreshToken] ❌ ALL FAILED — no valid token available');
    const error = new Error('Token refresh failed: No valid refresh_token or all refresh attempts failed');
    error.errorCode = 'REFRESH_FAILED';
    throw error;
}

export async function checkAndRefreshToken() {
    try {
        await getAuthToken();
    } catch (error) {
        console.error('[checkAndRefreshToken] Error:', error);
    }
}

export async function makeAuthenticatedRequest(url, options = {}) {
    const token = await getAuthToken();
    if (!token) throw new Error('Unauthorized');

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (response.status === 401) {
        const storage = await chrome.storage.local.get('refresh_token');
        const newToken = await refreshAuthToken(storage.refresh_token);

        if (newToken) {
            return await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json',
                },
            });
        }
    }

    return response;
}
