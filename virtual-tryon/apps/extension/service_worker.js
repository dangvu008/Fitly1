/**
 * File: service_worker.js
 * Purpose: Entry point cho Chrome Extension Service Worker
 * Layer: Infrastructure
 * * Flow:
 * 1. Initialize context menus
 * 2. Setup message routing
 * 3. Handle installation events
 * 4. Setup auto-sync and proactive auth refresh
 */

import { createContextMenus, handleContextTryonImage, handleContextAddWardrobe } from './background/context_menus.js';
import { handleMessage } from './background/message_routing.js';
import { updateCachedAuthState } from './background/auth_state_manager.js';
import { proactiveTokenRefresh } from './background/auth_handlers.js';
import { syncFromCloud, startAutoSync, stopAutoSync } from './background/cloud_sync.js';

// Khởi tạo Context Menus khi extension được cài đặt hoặc cập nhật
chrome.runtime.onInstalled.addListener(() => {
    createContextMenus();
});

// Lắng nghe Context Menu clicks và route đến đúng handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {

    try {
        // Lấy URL ảnh từ context phù hợp
        // Priority 1: srcUrl (thẻ <img> trực tiếp)
        // Priority 2: linkUrl (thẻ <a> với href là ảnh)
        // Priority 3: Session storage (background-image hoặc element phức tạp)
        let imageUrl = info.srcUrl || info.linkUrl || null;
        let altText = '';
        let nearbyText = '';

        // Nếu không có srcUrl/linkUrl, thử lấy từ session storage (content script đã detect)
        if (!imageUrl) {
            try {
                const session = await chrome.storage.session.get(['last_context_menu_image', 'last_context_menu_timestamp']);

                // Chỉ dùng nếu detect trong vòng 2 giây (tránh dùng data cũ)
                if (session.last_context_menu_image &&
                    session.last_context_menu_timestamp &&
                    (Date.now() - session.last_context_menu_timestamp) < 2000) {

                    imageUrl = session.last_context_menu_image.url;
                    altText = session.last_context_menu_image.altText || '';
                    nearbyText = session.last_context_menu_image.nearbyText || '';

                }
            } catch (e) {
                console.warn('[Fitly] Failed to get context menu image from session:', e);
            }
        }

        if (!imageUrl) {
            console.warn('[Fitly] No image URL found in context menu click');
            // Hiển thị notification cho user
            chrome.notifications.create('no-image-' + Date.now(), {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Fitly',
                message: 'Không tìm thấy ảnh. Vui lòng click chuột phải trực tiếp vào ảnh quần áo.'
            });
            return;
        }

        if (info.menuItemId === 'fitly-try-on') {
            await handleContextTryonImage({
                srcUrl: imageUrl,
                pageUrl: info.pageUrl,
                altText,
                nearbyText
            }, tab);
        } else if (info.menuItemId === 'fitly-add-wardrobe') {
            await handleContextAddWardrobe({
                srcUrl: imageUrl,
                pageUrl: info.pageUrl,
                altText,
                nearbyText
            }, tab);
        }
    } catch (error) {
        console.error('[Fitly] Error in context menu handler:', error);
        // Hiển thị notification lỗi
        chrome.notifications.create('error-' + Date.now(), {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Fitly - Lỗi',
            message: 'Đã xảy ra lỗi: ' + error.message
        });
    }
});


// Setup Message Routing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Xử lý message STORE_CONTEXT_MENU_IMAGE từ content script
    if (message.type === 'STORE_CONTEXT_MENU_IMAGE') {
        chrome.storage.session.set({
            last_context_menu_image: message.data,
            last_context_menu_timestamp: Date.now()
        }).then(() => {
            console.log('[Fitly] Stored context menu image from content script');
            sendResponse({ success: true });
        }).catch(err => {
            console.error('[Fitly] Failed to store context menu image:', err);
            sendResponse({ success: false, error: err.message });
        });
        return true; // Keep channel open for async response
    }

    // Không log quá nhiều để tránh rác console
    if (message.type !== 'GET_AUTH_STATE') {
        // console.log(`[SW] Received message type: ${message.type}`);
    }

    // Gọi hàm định tuyến từ message_routing.js
    handleMessage(message, sender).then(sendResponse);

    // Trả về true để Chrome biết chúng ta sẽ gửi response bất đồng bộ
    return true;
});


// ==========================================
// STARTUP LOGIC
// ==========================================

// Initial setup khi service worker khởi động
(async () => {
    // Cho phép content scripts truy cập chrome.storage.session
    // (MV3 mặc định chỉ cho service worker + extension pages)
    await chrome.storage.session.setAccessLevel({
        accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
    });

    // Cập nhật trạng thái auth cache
    await updateCachedAuthState();

    // Thử refresh token luôn nếu cần
    await proactiveTokenRefresh();

    // Kiểm tra xem user có token không, nếu có thì bắt đầu sync
    const data = await chrome.storage.local.get(['auth_token']);
    if (data.auth_token) {
        startAutoSync();

        // Initial sync from cloud (delay một chút để tránh block startup)
        setTimeout(async () => {
            await syncFromCloud();
        }, 2000);
    }
})();

// Lắng nghe thay đổi storage để bật/tắt sync
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes.auth_token) {
        if (changes.auth_token.newValue) {
            startAutoSync();
            syncFromCloud(); // Sync khi vừa đăng nhập
        } else {
            stopAutoSync();
        }
    }
});

// Lắng nghe alarm cho proactive token refresh
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'refresh-auth-token') {
        await proactiveTokenRefresh();
    }
});