/**
 * File: popup-improved.js
 * Purpose: Enhanced popup with improved login flow that keeps current page
 * 
 * Key improvements:
 * 1. Better popup window handling with proper window management
 * 2. Enhanced message passing for login success detection
 * 3. Keep current page after login (no redirect)
 * 4. Auto-close popup after successful login
 * 5. Better error handling and user feedback
 */

// Import existing functions and state
// This is a patch file - copy the relevant parts to your existing popup.js

/**
 * Enhanced login button handler - opens compact popup and stays on current page
 */
async function handleLoginClick() {
    console.log('[Fitly] Login button clicked');
    
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
        // Create popup window with specific features
        const popupWindow = await chrome.windows.create({
            url: popupUrl,
            type: 'popup',
            width: popupWidth,
            height: popupHeight,
            left: left,
            top: top,
            focused: true,
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

                // Update extension UI without closing
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

        // Close extension popup but keep the logic
        window.close();

    } catch (error) {
        console.error('Failed to open popup, falling back to tab:', error);
        // Fallback to regular tab if popup fails
        chrome.tabs.create({ url: popupUrl });
        window.close();
    }
}

/**
 * Handle successful login - update UI without redirecting or closing extension
 */
async function handleLoginSuccess(session) {
    console.log('[Fitly] Handling login success');
    
    try {
        // Store auth data in service worker
        await chrome.runtime.sendMessage({ 
            type: 'AUTH_SUCCESS', 
            session: session,
            from: 'popup' // Mark as from popup
        });

        // Update local state
        state.authenticated = true;
        state.user = session.user;
        
        // Refresh UI immediately
        showMainSection();
        updateUserInfo();
        
        console.log('[Fitly] Login success handled - UI updated, staying on current page');
        
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

/**
 * Enhanced logout handler
 */
async function handleLogoutClick() {
    console.log('[Fitly] Logout button clicked');
    
    try {
        // Call service worker logout
        const response = await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        
        if (response.success) {
            // Update local state
            state.authenticated = false;
            state.user = null;
            state.profile = null;
            
            // Show auth section
            showAuthSection();
            
            console.log('[Fitly] Logout successful');
        } else {
            console.error('Logout failed:', response.error);
        }
    } catch (error) {
        console.error('Error during logout:', error);
    }
}

/**
 * Show main section (when logged in)
 */
function showMainSection() {
    elements.authSection?.classList.add('hidden');
    elements.mainSection?.classList.remove('hidden');
    
    // Update user info
    updateUserInfo();
    
    console.log('[Fitly] Switched to main section');
}

/**
 * Show auth section (when not logged in)
 */
function showAuthSection() {
    elements.mainSection?.classList.add('hidden');
    elements.authSection?.classList.remove('hidden');
    
    console.log('[Fitly] Switched to auth section');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Login button - enhanced version
    elements.loginBtn?.addEventListener('click', handleLoginClick);
    
    // Logout button - enhanced version
    elements.logoutBtn?.addEventListener('click', handleLogoutClick);
    
    // Other existing listeners...
    // (Keep existing code for other buttons)
    
    console.log('[Fitly] Event listeners setup complete');
}

/**
 * Initialize the popup
 */
async function init() {
    console.log('[Fitly] Initializing popup...');
    
    try {
        await checkAuthState();
        setupEventListeners();
        
        console.log('[Fitly] Popup initialized successfully');
    } catch (error) {
        console.error('Error initializing popup:', error);
        showAuthSection(); // Fallback to auth section
    }
}

/**
 * Check current auth state
 */
async function checkAuthState() {
    console.log('[Fitly] Checking auth state...');
    
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });

        if (response.authenticated) {
            state.authenticated = true;
            state.user = response.user;
            state.profile = response.profile;
            showMainSection();
            console.log('[Fitly] User is authenticated');
        } else {
            state.authenticated = false;
            showAuthSection();
            console.log('[Fitly] User is not authenticated');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuthSection();
    }
}

// Export the enhanced functions
window.handleLoginClick = handleLoginClick;
window.handleLogoutClick = handleLogoutClick;
window.handleLoginSuccess = handleLoginSuccess;
window.updateUserInfo = updateUserInfo;
window.showMainSection = showMainSection;
window.showAuthSection = showAuthSection;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}