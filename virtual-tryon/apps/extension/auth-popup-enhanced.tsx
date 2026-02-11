/**
 * File: auth-popup-enhanced.tsx
 * Purpose: Enhanced login popup for browser extension with better extension communication
 * 
 * Features:
 * - Lightweight UI (no header/footer/navigation)
 * - Designed for popup window (400x500px)
 * - Enhanced communication with extension
 * - Auto-close with proper extension notification
 * - Better error handling and user feedback
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Loader2, X, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type AuthStatus = 'idle' | 'loading' | 'success' | 'error' | 'checking';

declare const chrome: any;

function AuthPopupContent() {
    const searchParams = useSearchParams();
    const isSuccessRedirect = searchParams.get('success') === 'true';
    const errorParam = searchParams.get('error');

    const [status, setStatus] = useState<AuthStatus>(isSuccessRedirect ? 'checking' : 'idle');
    const [error, setError] = useState<string | null>(errorParam);

    // Enhanced function to notify extension and close popup
    const notifyExtensionAndClose = useCallback(async (session: any) => {
        console.log('[Auth Popup] Notifying extension and closing popup...');

        try {
            // Method 1: Try chrome.runtime if in extension context
            if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime?.sendMessage) {
                await chrome.runtime.sendMessage({
                    type: 'AUTH_SUCCESS',
                    session: {
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        user: session.user,
                    },
                    from: 'popup'
                });
                console.log('[Auth Popup] Sent message via chrome.runtime');
            }

            // Method 2: Post message for content script (more reliable)
            window.postMessage({
                type: 'FITLY_AUTH_SUCCESS',
                session: {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    user: session.user,
                },
                from: 'popup'
            }, '*');
            console.log('[Auth Popup] Posted FITLY_AUTH_SUCCESS message');

            // Method 3: localStorage event for additional sync
            localStorage.setItem('fitly_auth_event', JSON.stringify({
                type: 'success',
                timestamp: Date.now(),
                session: session
            }));

            // Wait a bit to ensure message is sent
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (e) {
            console.error('[Auth Popup] Error notifying extension:', e);
        }

        // Close the popup window
        console.log('[Auth Popup] Closing popup window...');
        try {
            window.close();
        } catch (e) {
            console.error('[Auth Popup] Failed to close window:', e);
        }

        // Fallback: redirect to home if close fails
        setTimeout(() => {
            if (!window.closed) {
                console.log('[Auth Popup] Fallback: redirecting to home');
                window.location.href = '/';
            }
        }, 500);
    }, []);

    // Handle successful auth
    const handleAuthSuccess = useCallback(async (session: any) => {
        setStatus('success');
        await notifyExtensionAndClose(session);
    }, [notifyExtensionAndClose]);

    // Check for existing session on mount
    useEffect(() => {
        let isMounted = true;
        let retryCount = 0;
        const maxRetries = 5;

        const checkSession = async () => {
            try {
                const supabase = createClient();
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                console.log('[Auth Popup] Session check:', {
                    hasSession: !!session,
                    error: sessionError?.message,
                    retryCount
                });

                if (isMounted && session) {
                    await handleAuthSuccess(session);
                    return;
                }

                // Retry for OAuth redirect
                if (isSuccessRedirect && retryCount < maxRetries && isMounted) {
                    retryCount++;
                    console.log('[Auth Popup] Retrying session check...', retryCount);
                    setTimeout(checkSession, 500);
                } else if (isSuccessRedirect && retryCount >= maxRetries && isMounted) {
                    setStatus('error');
                    setError('Không thể xác thực. Vui lòng thử lại.');
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                console.error('Session check error:', err);
                if (isMounted) {
                    setStatus('error');
                    setError('Lỗi kết nối. Vui lòng thử lại.');
                }
            }
        };

        if (isSuccessRedirect) {
            setTimeout(checkSession, 300);
        } else {
            checkSession();
        }

        return () => {
            isMounted = false;
        };
    }, [handleAuthSuccess, isSuccessRedirect]);

    // Listen for auth state changes
    useEffect(() => {
        const supabase = createClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[Auth Popup] Auth event:', event);

                if (event === 'SIGNED_IN' && session) {
                    await handleAuthSuccess(session);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [handleAuthSuccess]);

    // Handle Google login
    const handleGoogleLogin = async () => {
        setStatus('loading');
        setError(null);

        try {
            const supabase = createClient();

            // Use popup's own URL as redirect
            const redirectUrl = `${window.location.origin}/auth/callback?popup=true`;

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) throw error;

        } catch (err: any) {
            console.error('Google login error:', err);
            setError(err.message || 'Đăng nhập thất bại');
            setStatus('error');
        }
    };

    // Handle close button
    const handleClose = () => {
        console.log('[Auth Popup] User closing popup');
        
        // Notify extension that popup is being closed without login
        try {
            window.postMessage({
                type: 'FITLY_AUTH_CANCELLED',
                from: 'popup'
            }, '*');
        } catch (e) {
            console.error('[Auth Popup] Error sending cancel message:', e);
        }

        window.close();
        
        // Fallback redirect if close fails
        setTimeout(() => {
            if (!window.closed) {
                window.location.href = '/';
            }
        }, 150);
    };

    // Checking state
    if (status === 'checking') {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
                <div className="w-full max-w-[320px] bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] shadow-2xl text-center">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-[var(--muted-foreground)] text-sm">Đang xác thực...</p>
                </div>
            </div>
        );
    }

    // Success state - Auto-closing
    if (status === 'success') {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
                <div className="w-full max-w-[340px] bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] shadow-2xl text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-xl font-bold text-[var(--foreground)] mb-2">
                        Đăng nhập thành công!
                    </h1>
                    <p className="text-[var(--muted-foreground)] text-sm mb-4">
                        Extension đã được đồng bộ. Đang quay lại trang mua sắm...
                    </p>
                    <Loader2 className="w-6 h-6 text-orange-500 animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
            <div className="w-full max-w-[360px] bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden">
                {/* Header with close button */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-base bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                            Fitly
                        </span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-[var(--muted)] hover:bg-[var(--accent)] flex items-center justify-center transition-colors"
                        title="Đóng"
                    >
                        <X className="w-4 h-4 text-[var(--muted-foreground)]" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Logo */}
                    <div className="mb-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-[var(--foreground)]">Đăng nhập Fitly</h1>
                        <p className="text-[var(--muted-foreground)] text-sm mt-1">
                            Để thử đồ và lưu kết quả
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={status === 'loading'}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-gray-800 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {status === 'loading' ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                        )}
                        <span>
                            {status === 'loading' ? 'Đang đăng nhập...' : 'Tiếp tục với Google'}
                        </span>
                    </button>

                    {/* Features list */}
                    <div className="mt-5 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            <span>Thử đồ trực tiếp trên mọi website</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                            <span>Lưu kết quả và outfit yêu thích</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span>Đồng bộ với Fitly Web App</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 text-center text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] bg-[var(--muted)]">
                    Bằng việc đăng nhập, bạn đồng ý với{' '}
                    <a href="http://localhost:3000/terms" target="_blank" className="text-orange-500 hover:underline">
                        Điều khoản
                    </a>{' '}
                    và{' '}
                    <a href="http://localhost:3000/privacy" target="_blank" className="text-orange-500 hover:underline">
                        Chính sách
                    </a>
                </div>
            </div>
        </div>
    );
}

// Main export with Suspense wrapper for useSearchParams
export default function AuthPopupPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
                <div className="w-full max-w-[320px] bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] shadow-2xl text-center">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
                </div>
            </div>
        }>
            <AuthPopupContent />
        </Suspense>
    );
}