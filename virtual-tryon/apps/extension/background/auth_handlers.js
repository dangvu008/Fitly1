/**
 * File: auth_handlers.js
 * Purpose: Xử lý đăng nhập, đăng xuất, lưu trữ token, và refresh token
 * Layer: Application / Feature
 * * Data Contract:
 * - Exports: handleStoreAuthToken, handleGoogleSignIn, handleAuthSuccess, handleLogout, proactiveTokenRefresh, startProactiveRefreshTimer, stopProactiveRefreshTimer
 */

import { updateCachedAuthState } from './auth_state_manager.js';
import { getT } from './i18n_manager.js';
import { demoState, MOCK_WARDROBE, MOCK_OUTFITS, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL as SUPABASE_URL } from './ENVIRONMENT_CONFIG.js';
import { startAutoSync, stopAutoSync, syncFromCloud } from './cloud_sync.js';
import { getAuthToken, refreshAuthToken } from './auth_state_manager.js';
import { log } from './debug_logger.js';


export async function fetchProfileFromSupabase(accessToken) {
    try {
        const tokenData = await chrome.storage.local.get('user');
        const userId = tokenData.user?.id;

        if (!userId) return null;

        const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': SUPABASE_AUTH_KEY,
            }
        });

        if (response.ok) {
            const data = await response.json();
            return { profile: data[0] };
        }
    } catch (error) {
        console.error('[auth_handlers] fetchProfileFromSupabase error:', error);
    }
    return null;
}

export async function handleStoreAuthToken(payload) {
    if (payload.authenticated) {
        await chrome.storage.local.set({
            auth_token: payload.access_token,
            refresh_token: payload.refresh_token,
            user: payload.user,
            expires_at: payload.expires_at || (Date.now() + 3600 * 1000),
            cached_user: payload.user,
        });

        await chrome.storage.local.remove(['guest_mode', 'guest_gems_balance']);
        await updateCachedAuthState();

        try {
            const profileData = await fetchProfileFromSupabase(payload.access_token);
            if (profileData?.profile) {
                await chrome.storage.local.set({ cached_profile: profileData.profile });
                demoState.gemsBalance = profileData.profile.gems_balance || 0;
            }
        } catch (error) {
            console.warn('[Fitly] Could not fetch profile:', error.message);
        }

        startAutoSync();

        chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', authenticated: true })
            .catch(() => { });

        return { success: true };
    } else {
        return await handleLogout();
    }
}

export async function handleGoogleSignIn() {
    console.log('[DEBUG-AUTH-LOGIN] handleGoogleSignIn called');
    try {
        const redirectUrl = chrome.identity.getRedirectURL();

        const oauthUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google` +
            `&redirect_to=${encodeURIComponent(redirectUrl)}` +
            `&access_type=offline` +
            `&prompt=consent` +
            `&query_params=${encodeURIComponent('access_type=offline&prompt=consent')}`;

        const responseUrl = await new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow(
                { url: oauthUrl, interactive: true },
                (callbackUrl) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (!callbackUrl) {
                        reject(new Error('Không nhận được callback URL'));
                    } else {
                        resolve(callbackUrl);
                    }
                }
            );
        });

        const urlObj = new URL(responseUrl);
        const hashParams = new URLSearchParams(urlObj.hash.replace('#', ''));
        const queryParams = new URLSearchParams(urlObj.search);

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const expiresIn = parseInt(hashParams.get('expires_in') || queryParams.get('expires_in') || '3600');
        console.log('[DEBUG-AUTH-LOGIN] OAuth callback parsed:');
        console.log('[DEBUG-AUTH-LOGIN]   accessToken:', accessToken ? `exists (${accessToken.substring(0, 30)}...)` : 'NULL');
        console.log('[DEBUG-AUTH-LOGIN]   refreshToken:', refreshToken ? `exists (${refreshToken.substring(0, 20)}...)` : '⚠️ NULL — THIẾU REFRESH TOKEN!');
        console.log('[DEBUG-AUTH-LOGIN]   expiresIn:', expiresIn, 's');

        if (!accessToken) {
            const code = hashParams.get('code') || queryParams.get('code');
            if (code) {
                const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_AUTH_KEY,
                    },
                    body: JSON.stringify({ auth_code: code, redirect_to: redirectUrl })
                });
                if (!resp.ok) {
                    const errText = await resp.text();
                    throw new Error(`Token exchange failed: ${errText}`);
                }
                const sessionData = await resp.json();
                if (sessionData.access_token) {
                    await _saveOAuthSession(sessionData, SUPABASE_URL, SUPABASE_AUTH_KEY);
                    return { success: true };
                }
            }
            throw new Error('Không tìm thấy access_token trong OAuth response');
        }

        const expiresAt = (Date.now() / 1000 + expiresIn) * 1000;
        console.log('[DEBUG-AUTH-LOGIN] Saving token to storage...');
        console.log('[DEBUG-AUTH-LOGIN]   expiresAt:', expiresAt, '| TTL:', expiresIn, 's');
        console.log('[DEBUG-AUTH-LOGIN]   refresh_token being saved:', refreshToken ? 'YES' : '❌ NO — sẽ ko refresh được sau này!');
        await chrome.storage.local.set({
            auth_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt,
        });

        const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': SUPABASE_AUTH_KEY,
            }
        });
        if (userResp.ok) {
            const userData = await userResp.json();
            await chrome.storage.local.set({ user: userData });
        }

        await updateCachedAuthState();
        startAutoSync();
        startProactiveRefreshTimer();

        setTimeout(() => syncFromCloud(), 1000);

        chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', authenticated: true })
            .catch(() => { });

        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: 'AUTH_STATE_CHANGED', authenticated: true }).catch(() => { });
            });
        });

        return { success: true };

    } catch (error) {
        console.error('[Fitly] Google Sign In exception:', error);
        if (error.message?.includes('canceled') || error.message?.includes('closed')) {
            return { success: false, error: 'Bạn đã đóng cửa sổ đăng nhập' };
        }
        return {
            success: false,
            error: 'Đã xảy ra lỗi khi đăng nhập với Google: ' + error.message
        };
    }
}

async function _saveOAuthSession(sessionData, supabaseUrl, anonKey) {
    const expiresAt = (Date.now() / 1000 + (sessionData.expires_in || 3600)) * 1000;
    await chrome.storage.local.set({
        auth_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_at: expiresAt,
        user: sessionData.user || null,
    });
    if (!sessionData.user && sessionData.access_token) {
        try {
            const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${sessionData.access_token}`,
                    'apikey': anonKey,
                }
            });
            if (r.ok) {
                const u = await r.json();
                await chrome.storage.local.set({ user: u });
            }
        } catch (fetchErr) {
            console.warn('[_saveOAuthSession] Could not fetch user info:', fetchErr.message);
        }
    }
}

export async function handleAuthSuccess(session) {
    console.log('[DEBUG-AUTH-LOGIN] handleAuthSuccess called');
    console.log('[DEBUG-AUTH-LOGIN] session:', session ? 'exists' : 'NULL');
    console.log('[DEBUG-AUTH-LOGIN] access_token:', session?.access_token ? `exists (${session.access_token.substring(0, 30)}...)` : 'NULL');
    console.log('[DEBUG-AUTH-LOGIN] refresh_token:', session?.refresh_token ? `exists (${session.refresh_token.substring(0, 20)}...)` : 'NULL');
    log('[Fitly] Auth success received from popup');

    if (!session || !session.access_token) {
        console.error('[Fitly] Invalid session data');
        return { success: false, error: 'Invalid session' };
    }

    try {
        await chrome.storage.local.set({
            auth_token: session.access_token,
            refresh_token: session.refresh_token,
            user: session.user,
            expires_at: Date.now() + 3600 * 1000,
            cached_user: session.user,
        });
        console.log('[DEBUG-AUTH-LOGIN] ✅ Token saved to chrome.storage.local');
        console.log('[DEBUG-AUTH-LOGIN] expires_at set to:', Date.now() + 3600 * 1000, '(+1 hour)');

        await updateCachedAuthState();

        try {
            const profileData = await fetchProfileFromSupabase(session.access_token);
            if (profileData?.profile) {
                await chrome.storage.local.set({ cached_profile: profileData.profile });
                demoState.gemsBalance = profileData.profile.gems_balance || 0;
            }
        } catch (profileErr) {
            console.warn('[handleAuthSuccess] Profile fetch failed (non-blocking):', profileErr.message);
        }

        startAutoSync();
        startProactiveRefreshTimer();

        setTimeout(() => syncFromCloud(), 1000);

        chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', authenticated: true })
            .catch(() => { });

        return { success: true };
    } catch (error) {
        console.error('[Fitly] Auth success handling error:', error);
        return { success: false, error: error.message };
    }
}

export async function handleLogout() {
    stopProactiveRefreshTimer();

    const allData = await chrome.storage.local.get(null);
    const currentToken = allData.auth_token;
    const supabaseKeys = Object.keys(allData).filter(k => k.startsWith('sb-'));

    await chrome.storage.local.remove([
        'auth_token',
        'refresh_token',
        'user',
        'expires_at',
        'fitly-auth-token',
        'fitly_auth_session',
        'fitly_auth_user',
        'cached_user',
        'cached_profile',
        'demo_wardrobe',
        'recent_clothing',
        'user_models',
        'default_model_id',
        'model_image',
        ...supabaseKeys,
    ]);

    // Revoke server-side session (requires Bearer token)
    try {
        const headers = { 'apikey': SUPABASE_AUTH_KEY };
        if (currentToken) {
            headers['Authorization'] = `Bearer ${currentToken}`;
        }
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: 'POST',
            headers,
        });
    } catch (logoutErr) {
        console.warn('[handleLogout] Server-side logout failed (non-blocking):', logoutErr.message);
    }

    Object.assign(demoState, {
        gemsBalance: 50,
        wardrobe: [...MOCK_WARDROBE],
        outfits: [...MOCK_OUTFITS],
        modelImage: null,
        recentClothing: [],
        userModels: [],
        defaultModelId: null,
    });

    stopAutoSync();
    return { success: true };
}

export async function proactiveTokenRefresh() {
    try {
        const data = await chrome.storage.local.get(['refresh_token', 'auth_token', 'expires_at']);
        if (!data.refresh_token) {
            return;
        }

        const now = Date.now();
        const expiresAt = data.expires_at || 0;
        const timeUntilExpiry = expiresAt - now;

        if (timeUntilExpiry < 15 * 60 * 1000) {
            const result = await refreshAuthToken(data.refresh_token);
            if (result) {
                await updateCachedAuthState();
                chrome.runtime.sendMessage({
                    type: 'TOKEN_REFRESHED',
                    token: result,
                    timestamp: Date.now()
                }).catch(() => { });
            } else {
                console.warn('[proactiveRefresh] Refresh failed — user may need to re-login');
                chrome.runtime.sendMessage({
                    type: 'TOKEN_REFRESH_FAILED',
                    timestamp: Date.now()
                }).catch(() => { });
            }
        }
    } catch (error) {
        console.error('[proactiveRefresh] Error:', error);
    }
}

export function startProactiveRefreshTimer() {
    chrome.alarms.create('refresh-auth-token', { periodInMinutes: 5 });
}

export function stopProactiveRefreshTimer() {
    chrome.alarms.clear('refresh-auth-token');
}

// Re-export from extracted modules for backward compatibility
export { handleEmailLogin, handleEmailRegister } from './auth_email.js';
export { handleSocialLogin } from './auth_social.js';


export async function handleGetAuthState() {
    console.log('[DEBUG-AUTH-STATE] handleGetAuthState() called');
    console.log('[DEBUG-AUTH-STATE] Timestamp:', new Date().toISOString());
    try {
        // Dùng Supabase session thay vì localStorage token
        const { data: { session }, error } = await getSupabaseSession();
        console.log('[DEBUG-AUTH-STATE] getSupabaseSession result:', session ? 'HAS SESSION' : 'NO SESSION', '| error:', error?.message || 'none');

        if (error || !session) {
            console.log('[DEBUG-AUTH-STATE] No session, checking legacy auth_token...');
            // Fallback: check legacy auth_token storage
            const legacyData = await chrome.storage.local.get(['auth_token', 'expires_at']);
            if (legacyData.auth_token && legacyData.expires_at && Date.now() < legacyData.expires_at) {
                const ttl = Math.floor((legacyData.expires_at - Date.now()) / 1000);
                console.log('[DEBUG-AUTH-STATE] Legacy token found, TTL:', ttl, 's');
                // Token còn hạn, fetch profile từ Supabase
                const profileData = await fetchProfileFromSupabase(legacyData.auth_token);
                if (profileData) {
                    await chrome.storage.local.remove(['guest_mode']);
                    startAutoSync();
                    return { success: true, authenticated: true, ...profileData };
                }
            }

            // Check guest mode
            const guestData = await chrome.storage.local.get('guest_mode');
            if (guestData.guest_mode) {
                const gemsData = await chrome.storage.local.get('guest_gems_balance');
                return {
                    authenticated: false,
                    guestMode: true,
                    profile: { gems_balance: gemsData.guest_gems_balance ?? 3 }
                };
            }

            return { authenticated: false };
        }

        // Session hợp lệ → Clear guest mode, fetch profile
        console.log('[DEBUG-AUTH-STATE] ✅ Valid session found, syncing to legacy keys...');
        const sessionTTL = session.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : 'N/A';
        console.log('[DEBUG-AUTH-STATE] Session TTL:', sessionTTL, 's, user:', session.user?.id);
        await chrome.storage.local.remove(['guest_mode', 'guest_gems_balance']);

        // Sync session sang legacy keys để compatibility
        await chrome.storage.local.set({
            auth_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000,
            user: session.user,
        });

        const profileData = await fetchProfileFromSupabase(session.access_token);
        if (profileData) {
            startAutoSync();
            return { success: true, authenticated: true, ...profileData };
        }

        return {
            success: true,
            authenticated: true,
            user: session.user,
            profile: { email: session.user.email, gems_balance: 0 }
        };

    } catch (error) {
        console.error('[Fitly] Auth check failed:', error);

        // Offline fallback
        const cached = await chrome.storage.local.get(['cached_user', 'cached_profile']);
        if (cached.cached_user) {
            return { success: true, authenticated: true, user: cached.cached_user, profile: cached.cached_profile, offline: true };
        }

        return { authenticated: false };
    }
}

/**
 * Lấy Supabase session từ chrome.storage.local
 * Supabase client lưu session với key dạng sb-[ref]-auth-token
 */
async function getSupabaseSession() {
    try {
        // Lấy tất cả keys trong storage để tìm key của Supabase
        const allData = await chrome.storage.local.get(null);
        const supabaseKey = Object.keys(allData).find(k => k === 'fitly-auth-token' || (k.startsWith('sb-') && k.endsWith('-auth-token')));

        if (supabaseKey && allData[supabaseKey]) {
            const sessionData = typeof allData[supabaseKey] === 'string'
                ? JSON.parse(allData[supabaseKey])
                : allData[supabaseKey];

            // Validate session
            if (sessionData?.access_token) {
                const expiresAt = sessionData.expires_at ? sessionData.expires_at * 1000 : Date.now() + 3600000;
                const timeUntilExpiry = expiresAt - Date.now();

                log('[getSupabaseSession] Token expires in:', Math.floor(timeUntilExpiry / 1000), 'seconds');

                // If token is expired or expiring soon (5 min buffer), try to refresh
                if (timeUntilExpiry < 5 * 60 * 1000 && sessionData.refresh_token) {
                    log('[getSupabaseSession] Token expired or expiring soon, attempting refresh...');

                    const refreshedToken = await refreshAuthToken(sessionData.refresh_token);
                    if (refreshedToken) {
                        log('[getSupabaseSession] Token refreshed successfully');
                        // Get the updated session after refresh
                        const updatedData = await chrome.storage.local.get(supabaseKey);
                        const updatedSession = typeof updatedData[supabaseKey] === 'string'
                            ? JSON.parse(updatedData[supabaseKey])
                            : updatedData[supabaseKey];
                        return { data: { session: updatedSession }, error: null };
                    } else {
                        console.error('[getSupabaseSession] Token refresh failed');
                        return { data: { session: null }, error: new Error('Token refresh failed') };
                    }
                }

                // Token is still valid
                if (timeUntilExpiry > 0) {
                    return { data: { session: sessionData }, error: null };
                }
            }
        }

        return { data: { session: null }, error: null };
    } catch (error) {
        console.error('[getSupabaseSession] Error:', error);
        return { data: { session: null }, error };
    }
}

// Enable guest mode - allows using extension without authentication with limited features
export async function handleEnableGuestMode() {
    try {
        // Set guest mode flag
        await chrome.storage.local.set({ guest_mode: true });

        // Initialize guest gems balance
        const GUEST_FREE_GEMS = 3;
        demoState.gemsBalance = GUEST_FREE_GEMS;
        await chrome.storage.local.set({ guest_gems_balance: GUEST_FREE_GEMS });

        log('[Fitly] Guest mode enabled with', GUEST_FREE_GEMS, 'free gems');

        return {
            success: true,
            gemsBalance: GUEST_FREE_GEMS,
            message: 'Guest mode enabled'
        };
    } catch (error) {
        console.error('Enable guest mode failed:', error);
        return { success: false, error: error.message };
    }
}

// Check if guest mode is enabled
export async function isGuestMode() {
    const data = await chrome.storage.local.get('guest_mode');
    return data.guest_mode === true;
}
