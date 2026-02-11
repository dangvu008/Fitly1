/**
 * File: popup.js - Improved login flow
 * Purpose: Fix login popup to stay on current page and auto-close after success
 * 
 * Improvements:
 * 1. Better popup window handling
 * 2. Message passing to detect login success
 * 3. Keep current page after login
 * 4. Auto-close popup after success
 */

// ... (keep existing code until login button handler)

// Login button - opens compact popup and stays on current page
elements.loginBtn?.addEventListener('click', async () => {
    // Get server URL from service worker
    let serverUrl;
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_SERVER_URL' });
        serverUrl = response.url;
    } catch (error) {
        serverUrl = 'http://localhost:3000'; // Fallback
    }

    // Check if server is accessible first
    try {
        const authResponse = await fetch(`${serverUrl}/api/auth/me`, { 
            method: 'HEAD',
            timeout: 3000
        }).catch(() => null);
        
        if (!authResponse || authResponse.status > 500) {
            console.warn('Server not accessible, opening in new tab');
            chrome.tabs.create({ url: `${serverUrl}/login` });
            return;
        }
    } catch (error) {
        console.warn('Cannot check server status, proceeding with popup');
    }

    // Open popup window for login - compact size
    const popupUrl = `${serverUrl}/auth/popup`;
    const popupWidth = 400;
    const popupHeight = 600;
    
    // Center the popup on screen
    const left = Math.round((screen.width - popupWidth) / 2);
    const top = Math.round((screen.height - popupHeight) / 2);
    
    try {
        // Create popup window with specific features to make it a real popup
        const popupWindow = await chrome.windows.create({
            url: popupUrl,
            type: 'popup',
            width: popupWidth,
            height: popupHeight,
            left: left,
            top: top,
            focused: true,
            // Add features to make it clearly a popup
            state: 'normal'
        });

        console.log('[Fitly] Opened login popup:', popupWindow.id);

        // Set up message listener for auth success
        const messageListener = (message, sender, sendResponse) => {
            if (message.type === 'AUTH_SUCCESS' && message.from === 'popup') {
                console.log('[Fitly] Login success detected from popup');
                
                // Close the popup window
                if (popupWindow.id) {
                    chrome.windows.remove(popupWindow.id).catch(console.error);
                }

                // Update extension UI
                handleLoginSuccess(message.session);
                
                // Clean up listener
                chrome.runtime.onMessage.removeListener(messageListener);
                return true;
            }
        };

        // Add message listener
        chrome.runtime.onMessage.addListener(messageListener);

        // Also listen for window closed event
        const windowRemovedListener = (windowId) => {
            if (windowId === popupWindow.id) {
                console.log('[Fitly] Login popup closed');
                chrome.runtime.onMessage.removeListener(messageListener);
                chrome.windows.onRemoved.removeListener(windowRemovedListener);
            }
        };

        chrome.windows.onRemoved.addListener(windowRemovedListener);

        // Close extension popup
        window.close();

    } catch (error) {
        console.error('Failed to open popup, falling back to tab:', error);
        // Fallback to regular tab if popup fails
        chrome.tabs.create({ url: popupUrl });
        window.close();
    }
});

/**
 * Handle successful login - update UI without redirecting
 */
async function handleLoginSuccess(session) {
    console.log('[Fitly] Handling login success');
    
    try {
        // Store auth data
        await chrome.runtime.sendMessage({ 
            type: 'AUTH_SUCCESS', 
            session: session,
            from: 'popup' // Mark as from popup
        });

        // Update local state
        state.authenticated = true;
        state.user = session.user;
        
        // Refresh UI
        showMainSection();
        updateUserInfo();
        
        console.log('[Fitly] Login success handled - UI updated');
        
    } catch (error) {
        console.error('Error handling login success:', error);
    }
}

/**
 * Update user info in popup
 */
function updateUserInfo() {
    if (state.user) {
        elements.userName.textContent = state.user.user_metadata?.display_name || state.user.email?.split('@')[0] || 'User';
        elements.userEmail.textContent = state.user.email || '';
        
        // Update gems if available
        if (state.profile?.gems_balance !== undefined) {
            elements.gemsCount.textContent = state.profile.gems_balance;
        }
    }
}

// ... (rest of the existing code remains the same)