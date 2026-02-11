# 🔧 Hướng dẫn Fix Login Flow - Giữ lại trang đang truy cập

## 🎯 Mục tiêu
- ✅ **Chỉ mở popup nhỏ gọn** (400x600px) thay vì tab toàn màn hình
- ✅ **Giữ lại trang đang truy cập** sau khi đăng nhập thành công
- ✅ **Tự động đóng popup** sau khi login xong
- ✅ **Cập nhật trạng thái realtime** cho extension

## 🔍 Vấn đề hiện tại
1. Extension đang mở **tab mới** thay vì **popup window**
2. Sau khi đăng nhập, người dùng bị **chuyển hướng khỏi trang** đang xem
3. **Popup không tự động đóng** sau khi login thành công

## 🚀 Giải pháp

### 1. **Fix Popup Window Creation**

**File:** `popup.js` (login button handler)

```javascript
elements.loginBtn?.addEventListener('click', async () => {
    // ... (existing server check code) ...

    // ✅ Mở popup window đúng cách
    const popupUrl = `${serverUrl}/auth/popup`;
    const popupWidth = 400;
    const popupHeight = 600;
    
    // Center popup on screen
    const left = Math.round((screen.width - popupWidth) / 2);
    const top = Math.round((screen.height - popupHeight) / 2);
    
    try {
        // ✅ Tạo popup window với type: 'popup'
        const popupWindow = await chrome.windows.create({
            url: popupUrl,
            type: 'popup', // Đây là key để tạo popup thật sự
            width: popupWidth,
            height: popupHeight,
            left: left,
            top: top,
            focused: true,
            state: 'normal'
        });

        console.log('[Fitly] Opened login popup:', popupWindow.id);

        // ✅ Lắng nghe message từ popup
        const messageListener = (message, sender, sendResponse) => {
            if (message.type === 'AUTH_SUCCESS' && message.from === 'popup') {
                console.log('[Fitly] Login success detected');
                
                // ✅ Đóng popup window
                if (popupWindow.id) {
                    chrome.windows.remove(popupWindow.id).catch(console.error);
                }

                // ✅ Cập nhật UI extension mà KHÔNG chuyển trang
                handleLoginSuccess(message.session);
                
                // ✅ Dọn dẹp listener
                chrome.runtime.onMessage.removeListener(messageListener);
                chrome.windows.onRemoved.removeListener(windowRemovedListener);
                return true;
            }
        };

        // ✅ Lắng nghe khi popup bị đóng
        const windowRemovedListener = (windowId) => {
            if (windowId === popupWindow.id) {
                console.log('[Fitly] Login popup closed');
                chrome.runtime.onMessage.removeListener(messageListener);
                chrome.windows.onRemoved.removeListener(windowRemovedListener);
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);
        chrome.windows.onRemoved.addListener(windowRemovedListener);

        // ✅ Đóng extension popup nhưng KHÔNG đóng trang web
        window.close();

    } catch (error) {
        console.error('Failed to open popup, falling back to tab:', error);
        // Fallback: mở tab nếu popup thất bại
        chrome.tabs.create({ url: popupUrl });
        window.close();
    }
});
```

### 2. **Enhanced Login Success Handler**

```javascript
/**
 * ✅ Xử lý login thành công - chỉ cập nhật UI, KHÔNG chuyển trang
 */
async function handleLoginSuccess(session) {
    console.log('[Fitly] Handling login success');
    
    try {
        // ✅ Lưu auth data
        await chrome.runtime.sendMessage({ 
            type: 'AUTH_SUCCESS', 
            session: session,
            from: 'popup'
        });

        // ✅ Cập nhật state local
        state.authenticated = true;
        state.user = session.user;
        
        // ✅ Refresh UI ngay lập tức
        showMainSection();
        updateUserInfo();
        
        console.log('[Fitly] Login success - UI updated, staying on current page');
        
    } catch (error) {
        console.error('Error handling login success:', error);
    }
}
```

### 3. **Enhanced Auth Popup Page**

**File:** `/web/src/app/auth/popup/page.tsx`

```typescript
// ✅ Enhanced auth success handler
const notifyExtensionAndClose = useCallback(async (session: any) => {
    console.log('[Auth Popup] Notifying extension and closing popup...');

    try {
        // Method 1: chrome.runtime (nếu trong extension context)
        if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime?.sendMessage) {
            await chrome.runtime.sendMessage({
                type: 'AUTH_SUCCESS',
                session: session,
                from: 'popup'
            });
        }

        // Method 2: Post message cho content script (đáng tin cậy hơn)
        window.postMessage({
            type: 'FITLY_AUTH_SUCCESS',
            session: session,
            from: 'popup'
        }, '*');

        // Method 3: localStorage event
        localStorage.setItem('fitly_auth_event', JSON.stringify({
            type: 'success',
            timestamp: Date.now(),
            session: session
        }));

        // Chờ 1 chút để đảm bảo message được gửi
        await new Promise(resolve => setTimeout(resolve, 300));

    } catch (e) {
        console.error('[Auth Popup] Error notifying extension:', e);
    }

    // ✅ Đóng popup window
    console.log('[Auth Popup] Closing popup window...');
    try {
        window.close();
    } catch (e) {
        console.error('[Auth Popup] Failed to close window:', e);
    }

    // ✅ Fallback: redirect về home nếu close thất bại
    setTimeout(() => {
        if (!window.closed) {
            window.location.href = '/';
        }
    }, 500);
}, []);
```

### 4. **Enhanced Service Worker**

```javascript
/**
 * ✅ Xử lý auth success từ popup
 */
async function handleAuthSuccess(session) {
    console.log('[Fitly] Auth success received from popup');

    if (!session || !session.access_token) {
        console.error('[Fitly] Invalid session data');
        return { success: false, error: 'Invalid session' };
    }

    try {
        // ✅ Lưu auth tokens
        await chrome.storage.local.set({
            auth_token: session.access_token,
            refresh_token: session.refresh_token,
            user: session.user,
            expires_at: Date.now() + 3600 * 1000,
            cached_user: session.user,
        });

        // ✅ Fetch profile
        const profileResponse = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
        });

        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.profile) {
                await chrome.storage.local.set({
                    cached_profile: profileData.profile,
                });
                demoState.gemsBalance = profileData.profile.gems_balance || 0;
            }
        }

        // ✅ Start auto-sync
        startAutoSync();

        // ✅ Sync from cloud
        setTimeout(() => syncFromCloud(), 1000);

        // ✅ Thông báo cho tất cả extension views để refresh
        chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', authenticated: true })
            .catch(() => { }); // Ignore if no listeners

        console.log('[Fitly] Auth success - user logged in:', session.user?.email);
        return { success: true };
        
    } catch (error) {
        console.error('[Fitly] Auth success handling error:', error);
        return { success: false, error: error.message };
    }
}
```

## 🧪 Test Flow

### 1. **Test Popup Creation**
```javascript
// Trong console của extension popup
elements.loginBtn.click();
// Kiểm tra console: "[Fitly] Opened login popup: [windowId]"
```

### 2. **Test Login Success**
```javascript
// Sau khi login thành công trong popup
// Kiểm tra console: "[Fitly] Login success detected"
// Kiểm tra: Extension popup đã chuyển sang main section
```

### 3. **Test Current Page Preservation**
```javascript
// Trang web đang xem: https://example-shop.com/product/123
// Sau login: vẫn ở https://example-shop.com/product/123
// Extension đã đăng nhập nhưng trang web không bị chuyển hướng
```

## 🚨 Troubleshooting

### **Popup không mở?**
- Kiểm tra `chrome.windows` API permissions trong `manifest.json`
- Test với `chrome.tabs.create()` fallback

### **Login success nhưng extension không update?**
- Kiểm tra message passing trong console
- Verify `AUTH_SUCCESS` handler trong service worker
- Test `chrome.runtime.sendMessage()` manually

### **Popup không tự đóng?**
- Kiểm tra `window.close()` trong auth popup
- Test fallback redirect
- Verify popup window ID

## 📊 Kết quả mong đợi

✅ **Login button** → Mở popup nhỏ gọn (400x600px)  
✅ **Login thành công** → Popup tự đóng, extension update  
✅ **Trang web** → Giữ nguyên, không bị chuyển hướng  
✅ **User experience** → Mượt mà, không gián đoạn shopping  

**🎉 Trải nghiệm đăng nhập hoàn hảo - giữ nguyên trang đang mua sắm!**