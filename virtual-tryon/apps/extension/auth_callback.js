import { supabase } from './extension/config.js';

/**
 * Handle OAuth callback
 * This script runs when Supabase redirects back to the extension
 */
async function handleCallback() {
    try {
        console.log('[AuthCallback] Processing callback...');

        // Supabase client (configured in config.js) will automatically:
        // 1. Parse the URL hash/query
        // 2. Extract the session
        // 3. Save it to chrome.storage.local (via ChromeStorageAdapter)

        // We ensure it's done by calling getSession
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
            console.log('[AuthCallback] Session found:', session.user.email);

            // Sync to legacy keys for Service Worker compatibility
            // service_worker.js uses 'auth_token', 'refresh_token', etc.
            // google_auth_service.js uses 'fitly_auth_session'
            await chrome.storage.local.set({
                // Legacy Service Worker keys
                auth_token: session.access_token,
                refresh_token: session.refresh_token,
                user: session.user,
                expires_at: (session.expires_at || (Date.now() / 1000 + 3600)) * 1000,

                // Legacy google_auth_service keys
                fitly_auth_session: session,
                fitly_auth_user: session.user
            });

            // Show success message
            document.querySelector('h1').textContent = 'Đăng nhập thành công!';
            document.querySelector('p').textContent = 'Cửa sổ sẽ tự động đóng...';

            // Close window after a brief delay
            setTimeout(() => {
                window.close();
            }, 1500);
        } else {
            throw new Error('No session found in URL');
        }
    } catch (error) {
        console.error('[AuthCallback] Error:', error);
        document.querySelector('h1').textContent = 'Đăng nhập thất bại';
        document.querySelector('p').textContent = error.message || 'Vui lòng thử lại';
    }
}

handleCallback();
