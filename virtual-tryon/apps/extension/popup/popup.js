/**
 * File: popup.js
 * Purpose: Popup logic - show auth state, quick actions, and profile dropdown menu
 * 
 * Input: Auth state from service worker
 * Output: Rendered popup UI with dropdown menu khi click avatar
 * 
 * Flow:
 * 1. Check auth state via service worker
 * 2. Show auth section (login) hoặc main section (logged in)
 * 3. Toggle dropdown menu khi click vào user-info
 * 4. Handle menu item actions (sidebar, wardrobe, web app, gems, logout)
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
    openWeb: $('open-web'),
    // Dropdown menu elements
    userInfo: $('user-info'),
    profileMenu: $('profile-menu'),
    menuAvatar: $('menu-avatar'),
    menuUsername: $('menu-username'),
    menuEmail: $('menu-email'),
    menuOpenSidebar: $('menu-open-sidebar'),
    menuWardrobe: $('menu-wardrobe'),
    menuWebapp: $('menu-webapp'),
    menuCredits: $('menu-credits'),
    menuLogout: $('menu-logout'),
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
}

function showMainSection() {
    elements.authSection?.classList.add('hidden');
    elements.mainSection?.classList.remove('hidden');
    elements.gemsBadge?.classList.remove('hidden');

    // Update user info in header bar
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
    const avatarUrl = state.profile?.avatar_url || state.user?.user_metadata?.avatar_url;
    const initial = displayName.charAt(0).toUpperCase();

    if (avatarEl) {
        if (avatarUrl) {
            avatarEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar" class="avatar-img" />`;
        } else {
            avatarEl.innerHTML = `<div class="avatar-initial">${initial}</div>`;
        }
    }

    // Update dropdown menu header info
    if (elements.menuUsername) {
        elements.menuUsername.textContent = displayName;
    }
    if (elements.menuEmail) {
        elements.menuEmail.textContent = state.user?.email || '';
    }
    if (elements.menuAvatar) {
        if (avatarUrl) {
            elements.menuAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar" />`;
        } else {
            elements.menuAvatar.innerHTML = `<div class="avatar-initial">${initial}</div>`;
        }
    }
}

// ==========================================
// DROPDOWN MENU TOGGLE
// ==========================================

function toggleProfileMenu() {
    const menu = elements.profileMenu;
    const wrapper = document.querySelector('.profile-wrapper');
    if (!menu || !wrapper) return;

    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        menu.classList.remove('hidden');
        wrapper.classList.add('menu-open');
    } else {
        menu.classList.add('hidden');
        wrapper.classList.remove('menu-open');
    }
}

function closeProfileMenu() {
    elements.profileMenu?.classList.add('hidden');
    document.querySelector('.profile-wrapper')?.classList.remove('menu-open');
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Login button - opens login popup
    elements.loginBtn?.addEventListener('click', async () => {
        let serverUrl;
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_SERVER_URL' });
            serverUrl = response.url;
        } catch (error) {
            serverUrl = 'http://localhost:3000';
        }

        try {
            await fetch(`${serverUrl}/api/auth/me`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-store',
            }).catch(() => null);
        } catch (error) { }

        const popupUrl = `${serverUrl}/auth/popup`;
        const popupWidth = 400;
        const popupHeight = 600;
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

    // ==========================================
    // DROPDOWN MENU - Toggle & Close
    // ==========================================

    // Click user-info to toggle dropdown
    elements.userInfo?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfileMenu();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const menu = elements.profileMenu;
        const userInfo = elements.userInfo;
        if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !userInfo?.contains(e.target)) {
            closeProfileMenu();
        }
    });

    // ==========================================
    // DROPDOWN MENU ITEM ACTIONS
    // ==========================================

    // Menu: Open Sidebar
    elements.menuOpenSidebar?.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await chrome.sidePanel.open({ tabId: tab.id });
        }
        window.close();
    });

    // Menu: Wardrobe
    elements.menuWardrobe?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000/wardrobe' });
        window.close();
    });

    // Menu: Web App
    elements.menuWebapp?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000' });
        window.close();
    });

    // Menu: Buy Gems
    elements.menuCredits?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000/profile' });
        window.close();
    });

    // Menu: Logout
    elements.menuLogout?.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        closeProfileMenu();
        showAuthSection();
    });

    // ==========================================
    // QUICK ACTION BUTTONS
    // ==========================================

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
            await chrome.sidePanel.open({ tabId: tab.id });
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

    // Open web app (footer link)
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

