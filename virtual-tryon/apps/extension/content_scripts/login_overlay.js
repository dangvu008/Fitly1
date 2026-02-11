/**
 * File: login_overlay.js
 * Purpose: Inject login popup overlay trực tiếp vào trang web hiện tại
 * 
 * Input: Message từ sidebar/service_worker để show/hide overlay
 * Output: Hiển thị iframe chứa /auth/popup
 * 
 * Flow:
 * 1. Nhận message SHOW_LOGIN_OVERLAY từ extension
 * 2. Inject overlay với iframe vào body
 * 3. Listen cho auth success và đóng overlay
 * 4. Cleanup khi đóng
 */

(function () {
    'use strict';

    const OVERLAY_ID = 'fitly-login-overlay';
    const IFRAME_ID = 'fitly-login-iframe';

    // Listen for messages from extension
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'SHOW_LOGIN_OVERLAY') {
            showLoginOverlay(message.serverUrl);
            sendResponse({ success: true });
        } else if (message.type === 'HIDE_LOGIN_OVERLAY') {
            hideLoginOverlay();
            sendResponse({ success: true });
        }
        return true;
    });

    // Listen for auth success from iframe (postMessage)
    window.addEventListener('message', (event) => {
        const message = event.data;

        // Auth success from popup iframe
        if (message?.type === 'FITLY_AUTH_SUCCESS') {
            console.log('[FitlyExt] Login overlay: Auth success, closing overlay');

            // Forward to service worker
            chrome.runtime.sendMessage({
                type: 'AUTH_SUCCESS',
                session: message.session
            }).catch(console.error);

            // Close overlay with animation
            hideLoginOverlay();
        }
    });

    /**
     * Show login overlay with iframe
     */
    function showLoginOverlay(serverUrl = 'http://localhost:3000') {
        // Don't create if already exists
        if (document.getElementById(OVERLAY_ID)) {
            console.log('[FitlyExt] Login overlay already exists');
            return;
        }

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.innerHTML = `
            <style>
                #${OVERLAY_ID} {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 2147483647 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: rgba(0, 0, 0, 0.6) !important;
                    backdrop-filter: blur(4px) !important;
                    -webkit-backdrop-filter: blur(4px) !important;
                    animation: fitlyOverlayFadeIn 0.2s ease-out !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                }
                
                @keyframes fitlyOverlayFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fitlyOverlayFadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                @keyframes fitlyModalSlideIn {
                    from { 
                        opacity: 0;
                        transform: scale(0.95) translateY(10px);
                    }
                    to { 
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                
                #${OVERLAY_ID}.fitly-closing {
                    animation: fitlyOverlayFadeOut 0.2s ease-out forwards !important;
                }
                
                #${OVERLAY_ID} .fitly-modal-container {
                    position: relative !important;
                    width: 400px !important;
                    height: 520px !important;
                    max-width: 95vw !important;
                    max-height: 90vh !important;
                    border-radius: 16px !important;
                    overflow: hidden !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                    animation: fitlyModalSlideIn 0.3s ease-out !important;
                }
                
                #${OVERLAY_ID} .fitly-close-btn {
                    position: absolute !important;
                    top: 10px !important;
                    right: 10px !important;
                    width: 32px !important;
                    height: 32px !important;
                    border-radius: 50% !important;
                    background: rgba(0, 0, 0, 0.5) !important;
                    color: white !important;
                    border: none !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-size: 18px !important;
                    font-weight: bold !important;
                    z-index: 10 !important;
                    transition: background 0.2s !important;
                }
                
                #${OVERLAY_ID} .fitly-close-btn:hover {
                    background: rgba(0, 0, 0, 0.7) !important;
                }
                
                #${IFRAME_ID} {
                    width: 100% !important;
                    height: 100% !important;
                    border: none !important;
                    background: #1a1a2e !important;
                    position: relative !important;
                    z-index: 1 !important;
                }
                
                #${OVERLAY_ID} .fitly-loading {
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    color: white !important;
                    font-size: 14px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 12px !important;
                    z-index: 2 !important;
                    background: rgba(26, 26, 46, 0.95) !important;
                    padding: 32px !important;
                    border-radius: 16px !important;
                }
                
                #${OVERLAY_ID} .fitly-spinner {
                    width: 32px !important;
                    height: 32px !important;
                    border: 3px solid rgba(255, 255, 255, 0.3) !important;
                    border-top-color: #f97316 !important;
                    border-radius: 50% !important;
                    animation: fitlySpin 0.8s linear infinite !important;
                }
                
                @keyframes fitlySpin {
                    to { transform: rotate(360deg); }
                }
            </style>
            
            <div class="fitly-modal-container">
                <button class="fitly-close-btn" title="Đóng">×</button>
                <div class="fitly-loading">
                    <div class="fitly-spinner"></div>
                    <span>Đang tải...</span>
                </div>
                <iframe id="${IFRAME_ID}" src="${serverUrl}/auth/popup" allow="clipboard-write"></iframe>
            </div>
        `;

        // Add to page
        document.body.appendChild(overlay);

        // Close button handler
        const closeBtn = overlay.querySelector('.fitly-close-btn');
        closeBtn.addEventListener('click', hideLoginOverlay);

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                hideLoginOverlay();
            }
        });

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                hideLoginOverlay();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Hide loading when iframe loads
        const iframe = document.getElementById(IFRAME_ID);
        let iframeLoaded = false;

        iframe.addEventListener('load', () => {
            iframeLoaded = true;
            const loading = overlay.querySelector('.fitly-loading');
            if (loading) {
                loading.style.display = 'none';
            }
        });

        // Handle iframe load error
        iframe.addEventListener('error', () => {
            showIframeError(overlay, serverUrl);
        });

        // Timeout fallback - if iframe doesn't load within 3 seconds (reduced from 5s)
        setTimeout(() => {
            if (!iframeLoaded) {
                console.log('[FitlyExt] Iframe load timeout, showing fallback');
                showIframeError(overlay, serverUrl);
            }
        }, 3000);

        // Additional check: Try to ping server to see if it's running
        // If server is down, show error immediately
        fetch(`${serverUrl}/api/health`, { method: 'HEAD', mode: 'no-cors' })
            .catch(() => {
                // Server không phản hồi, hiện lỗi ngay
                if (!iframeLoaded) {
                    console.log('[FitlyExt] Server not responding, showing fallback');
                    setTimeout(() => {
                        if (!iframeLoaded) {
                            showIframeError(overlay, serverUrl);
                        }
                    }, 1500); // Wait 1.5s before showing error (give iframe a chance)
                }
            });


        console.log('[FitlyExt] Login overlay shown');
    }

    /**
     * Show error message with fallback option
     */
    function showIframeError(overlay, serverUrl) {
        const loading = overlay.querySelector('.fitly-loading');
        if (loading) {
            loading.innerHTML = `
                <div style="text-align: center !important;">
                    <div style="font-size: 48px !important; margin-bottom: 16px !important;">⚠️</div>
                    <div style="margin-bottom: 12px !important; font-size: 16px !important; font-weight: 600 !important;">Không thể tải popup</div>
                    <div style="margin-bottom: 16px !important; font-size: 13px !important; opacity: 0.7 !important;">
                        Có thể do CSP của trang web<br/>hoặc server chưa chạy
                    </div>
                    <button id="fitly-fallback-btn" style="
                        background: linear-gradient(135deg, #f97316, #ec4899) !important;
                        color: white !important;
                        border: none !important;
                        padding: 12px 24px !important;
                        border-radius: 12px !important;
                        font-size: 14px !important;
                        font-weight: 600 !important;
                        cursor: pointer !important;
                        margin-bottom: 12px !important;
                    ">🔗 Mở cửa sổ đăng nhập</button>
                    <div style="font-size: 11px !important; opacity: 0.5 !important;">
                        Sẽ mở cửa sổ popup riêng
                    </div>
                </div>
            `;

            // Add click handler for fallback button
            const fallbackBtn = document.getElementById('fitly-fallback-btn');
            fallbackBtn?.addEventListener('click', () => {
                // Open popup window as fallback
                const popupUrl = `${serverUrl}/auth/popup`;
                const popupWidth = 400;
                const popupHeight = 600;
                const left = Math.round((screen.width - popupWidth) / 2);
                const top = Math.round((screen.height - popupHeight) / 2);

                window.open(
                    popupUrl,
                    'fitly-login',
                    `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`
                );

                // Close overlay
                hideLoginOverlay();
            });
        }
    }

    /**
     * Hide and remove login overlay
     */
    function hideLoginOverlay() {
        const overlay = document.getElementById(OVERLAY_ID);
        if (!overlay) return;

        // Add closing animation
        overlay.classList.add('fitly-closing');

        // Remove after animation
        setTimeout(() => {
            overlay.remove();
            console.log('[FitlyExt] Login overlay hidden');
        }, 200);
    }

    console.log('[FitlyExt] Login overlay script initialized');
})();
