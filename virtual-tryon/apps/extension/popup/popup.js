/**
 * File: popup.js
 * Purpose: Popup logic - show auth state and quick actions
 * 
 * Flow:
 * 1. Check auth state
 * 2. Show appropriate section
 * 3. Handle quick actions
 */

// State
let state = {
    authenticated: false,
    user: null,
    profile: null,
};

// DOM Elements
const $ = (id) => document.getElementById(id);

const elements = {
    authSection: $('auth-section'),
    mainSection: $('main-section'),
    loginBtn: $('login-btn'),
    gemsBadge: $('gems-badge'),
    gemsCount: $('gems-count'),
    userName: $('user-name'),
    userEmail: $('user-email'),
    openSidebar: $('open-sidebar'),
    selectImage: $('select-image'),
    viewWardrobe: $('view-wardrobe'),
    logoutBtn: $('logout-btn'),
    openWeb: $('open-web'),
};

// ==========================================
// INIT
// ==========================================

async function init() {
    await checkAuthState();
    setupEventListeners();
}

async function checkAuthState() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });

        if (response.authenticated) {
            state.authenticated = true;
            state.user = response.user;
            state.profile = response.profile;
            showMainSection();
        } else {
            state.authenticated = false;
            showAuthSection();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuthSection();
    }
}

// ==========================================
// UI STATE
// ==========================================

function showAuthSection() {
    elements.authSection?.classList.remove('hidden');
    elements.mainSection?.classList.add('hidden');
    elements.gemsBadge?.classList.add('hidden');
    elements.logoutBtn?.classList.add('hidden');
}

function showMainSection() {
    elements.authSection?.classList.add('hidden');
    elements.mainSection?.classList.remove('hidden');
    elements.gemsBadge?.classList.remove('hidden');
    elements.logoutBtn?.classList.remove('hidden');

    // Update user info
    const displayName = state.profile?.full_name || state.profile?.display_name || 'User';
    if (elements.userName) {
        elements.userName.textContent = displayName;
    }
    if (elements.userEmail && state.user) {
        elements.userEmail.textContent = state.user.email || '';
    }
    if (elements.gemsCount && state.profile) {
        elements.gemsCount.textContent = state.profile.gems_balance || 0;
    }

    // Update avatar with fallback logic
    const avatarEl = document.querySelector('.user-avatar');
    if (avatarEl) {
        const avatarUrl = state.profile?.avatar_url || state.user?.user_metadata?.avatar_url;
        const initial = displayName.charAt(0).toUpperCase();

        if (avatarUrl) {
            // Show avatar image
            avatarEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar" class="avatar-img" />`;
        } else {
            // Show fallback: initial letter in gradient circle
            avatarEl.innerHTML = `<div class="avatar-initial">${initial}</div>`;
        }
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Login button - opens login popup (not a new tab)
    elements.loginBtn?.addEventListener('click', async () => {
        // Get server URL from service worker
        let serverUrl;
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_SERVER_URL' });
            serverUrl = response.url;
        } catch (error) {
            serverUrl = 'http://localhost:3000'; // Fallback
        }

        try {
            await fetch(`${serverUrl}/api/auth/me`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-store',
            }).catch(() => null);
        } catch (error) { }

        // Open popup window for login - compact size
        const popupUrl = `${serverUrl}/auth/popup`;
        const popupWidth = 400;
        const popupHeight = 600;

        // Center the popup
        const left = Math.round((screen.width - popupWidth) / 2);
        const top = Math.round((screen.height - popupHeight) / 2);

        try {
            await chrome.windows.create({
                url: popupUrl,
                type: 'popup',
                width: popupWidth,
                height: popupHeight,
                left: left,
                top: top,
                focused: true
            });

            window.close();
        } catch (error) {
            console.error('Failed to open popup, falling back to tab:', error);
            chrome.tabs.create({ url: popupUrl });
            window.close();
        }
    });

    // Open sidebar
    elements.openSidebar?.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await chrome.sidePanel.open({ tabId: tab.id });
        }
        window.close();
    });

    // Select image from page
    elements.selectImage?.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            // Open sidebar first
            await chrome.sidePanel.open({ tabId: tab.id });

            // Then trigger image selection
            try {
                await chrome.tabs.sendMessage(tab.id, { type: 'START_IMAGE_SELECTION' });
            } catch (error) {
                console.log('Content script may not be loaded');
            }
        }
        window.close();
    });

    // View wardrobe
    elements.viewWardrobe?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000/wardrobe' });
        window.close();
    });

    // Logout
    elements.logoutBtn?.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        showAuthSection();
    });

    // Open web app
    elements.openWeb?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'http://localhost:3000' });
        window.close();
    });

    // Gems badge click - go to profile to buy gems
    elements.gemsBadge?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000/profile' });
        window.close();
    });
}

// ==========================================
// MESSAGE LISTENER
// ==========================================

// Listen for auth state changes (e.g., after popup login)
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'AUTH_STATE_CHANGED') {
        checkAuthState();
    }
});

// ==========================================
// START
// ==========================================

init();
