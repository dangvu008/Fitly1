/**
 * File: service_worker.js
 * Purpose: Background service worker cho Chrome extension
 * 
 * DEMO MODE: Bật để test không cần đăng nhập
 */

// ==========================================
// MODE CONFIG
// ==========================================
// DEMO_MODE_OVERRIDE: Set to true to FORCE demo mode even when logged in (for testing)
const DEMO_MODE_OVERRIDE = false;

// Dynamic check: Use demo mode only when NOT authenticated
// When user logs in, we automatically switch to real API mode
let _cachedAuthState = null;

async function isDemoMode() {
    // If override is set, always use demo mode
    if (DEMO_MODE_OVERRIDE) return true;

    // Check if we have a valid auth token
    try {
        const data = await chrome.storage.local.get(['auth_token', 'expires_at']);
        if (data.auth_token && data.expires_at) {
            const isExpired = Date.now() > data.expires_at;
            if (!isExpired) {
                return false; // User is authenticated, use real API
            }
        }
    } catch (error) {
        console.warn('[Fitly] Error checking auth state:', error);
    }

    return true; // No auth, use demo mode
}

// Synchronous version for places that can't use async (uses cache)
function isDemoModeSync() {
    if (DEMO_MODE_OVERRIDE) return true;
    return _cachedAuthState === null ? true : !_cachedAuthState;
}

// Update cached auth state
async function updateCachedAuthState() {
    try {
        const data = await chrome.storage.local.get(['auth_token', 'expires_at']);
        if (data.auth_token && data.expires_at && Date.now() < data.expires_at) {
            _cachedAuthState = true; // Authenticated
        } else {
            _cachedAuthState = false; // Not authenticated
        }
    } catch (error) {
        _cachedAuthState = false;
    }
}

// Feature flags
const FEATURES = {
    SYNC_TO_CLOUD: true,      // Sync data to Supabase
    OFFLINE_FALLBACK: true,   // Fall back to local storage when offline
    AUTO_SYNC_INTERVAL: 5 * 60 * 1000, // Sync every 5 minutes
};

// Mock data cho demo mode
const MOCK_USER = {
    id: 'mock-user-001',
    email: 'demo@fitly.app',
};

const MOCK_PROFILE = {
    id: 'mock-user-001',
    email: 'demo@fitly.app',
    full_name: 'Demo User',
    display_name: 'Demo User',
    avatar_url: null,
    gems_balance: 50,
    model_image_url: null,
    created_at: new Date().toISOString(),
};

const MOCK_WARDROBE = [
    {
        id: 'wardrobe-001',
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        name: 'Áo thun trắng basic',
        category: 'top',
    },
    {
        id: 'wardrobe-002',
        image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
        name: 'Quần jeans xanh',
        category: 'bottom',
    },
    {
        id: 'wardrobe-003',
        image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
        name: 'Áo khoác denim',
        category: 'outerwear',
    },
];

const MOCK_OUTFITS = [
    {
        id: 'outfit-001',
        name: 'Casual Friday',
        result_image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
        created_at: new Date().toISOString(),
    },
];

// Các ảnh kết quả try-on mẫu để random khi demo
// Ảnh full body người mặc quần áo để giả lập kết quả AI try-on
const MOCK_TRYON_RESULTS = [
    // Fashion women - Full body casual outfits
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800',
    'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800',

    // Fashion women - Dresses & Elegant
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800',
    'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=800',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800',
    'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=800',

    // Fashion women - Modern looks  
    'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800',
    'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=800',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
    'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=800',
    'https://images.unsplash.com/photo-1488716820149-c88a428d37e8?w=800',

    // Fashion men - Full body outfits
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800',
    'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
    'https://images.unsplash.com/photo-1492447166138-50c3889fccb1?w=800',
];

// API base URL
const API_BASE_URL = 'http://localhost:3000';

// Dynamic port detection
let detectedPort = 3000;

/**
 * Detect available server port (3000, 3001, 3002, etc.)
 */
async function detectServerPort() {
    const ports = [3000, 3001, 3002, 3003, 3004];

    for (const port of ports) {
        try {
            const response = await fetch(`http://localhost:${port}/api/health`, {
                method: 'HEAD',
                timeout: 2000
            });

            if (response.status === 200) {
                detectedPort = port;
                console.log(`[Fitly] Server detected on port ${port}`);
                return port;
            }
        } catch (error) {
            // Port not available, try next
            continue;
        }
    }

    console.log('[Fitly] No server found on ports 3000-3004');
    return 3000; // Default fallback
}

/**
 * Get current API base URL with detected port
 */
function getApiBaseUrl() {
    return `http://localhost:${detectedPort}`;
}

// In-memory state for demo mode
let demoState = {
    gemsBalance: 50,
    wardrobe: [...MOCK_WARDROBE],
    outfits: [...MOCK_OUTFITS],
    modelImage: null,
    recentClothing: [],
    userModels: [], // Ảnh model của người dùng
    defaultModelId: null, // ID của ảnh mặc định
};

// ==========================================
// INSTALLATION & CONTEXT MENU
// ==========================================

// Create context menus - called on install and service worker startup
function createContextMenus() {
    // Remove existing menus first to avoid duplicates
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'try-on-image',
            title: '👗 Thử đồ này với Fitly',
            contexts: ['image']
        }, () => {
            if (chrome.runtime.lastError) {
                console.warn('[Fitly] Context menu try-on-image:', chrome.runtime.lastError.message);
            }
        });

        chrome.contextMenus.create({
            id: 'add-to-wardrobe',
            title: '📦 Thêm vào tủ đồ',
            contexts: ['image']
        }, () => {
            if (chrome.runtime.lastError) {
                console.warn('[Fitly] Context menu add-to-wardrobe:', chrome.runtime.lastError.message);
            }
        });

        console.log('[Fitly] Context menus created');
    });
}

// Create menus on install
chrome.runtime.onInstalled.addListener(() => {
    createContextMenus();
    console.log('[Fitly] Extension installed (DEMO_MODE_OVERRIDE:', DEMO_MODE_OVERRIDE, ')');
});

// Also create menus on service worker startup (in case it was terminated)
chrome.runtime.onStartup.addListener(() => {
    createContextMenus();
    console.log('[Fitly] Service worker started');
});

// Create menus immediately when script loads (for development/reload)
createContextMenus();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('[Fitly] Context menu clicked:', info.menuItemId, info.srcUrl);

    if (info.menuItemId === 'try-on-image' && info.srcUrl) {
        await chrome.sidePanel.open({ tabId: tab.id });
        await chrome.storage.session.set({
            pending_clothing_image: info.srcUrl,
            pending_source_url: info.pageUrl
        });

        chrome.tabs.sendMessage(tab.id, {
            type: 'CAPTURE_IMAGE',
            imageUrl: info.srcUrl
        }).catch(() => { });
    }

    if (info.menuItemId === 'add-to-wardrobe' && info.srcUrl) {
        try {
            // Safely parse hostname
            let sourceName = 'Web';
            try {
                if (info.pageUrl) {
                    sourceName = new URL(info.pageUrl).hostname;
                }
            } catch (e) {
                console.warn('[Fitly] Could not parse pageUrl:', info.pageUrl);
            }

            const result = await handleAddToWardrobe({
                image_url: info.srcUrl,
                source_url: info.pageUrl || '',
                name: 'Saved from ' + sourceName
            });

            console.log('[Fitly] Add to wardrobe result:', result);

            if (result.success) {
                // Show notification with proper ID (required for MV3)
                chrome.notifications.create('wardrobe-add-' + Date.now(), {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Fitly',
                    message: result.message || 'Đã thêm vào tủ đồ!'
                });

                // Notify sidebar to refresh if open
                try {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'WARDROBE_UPDATED',
                        item: result.item
                    }).catch(() => { });
                } catch (e) { }
            } else {
                chrome.notifications.create('wardrobe-error-' + Date.now(), {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Fitly',
                    message: 'Lỗi: ' + (result.error || 'Không thể thêm vào tủ đồ')
                });
            }
        } catch (error) {
            console.error('[Fitly] Error adding to wardrobe:', error);
            chrome.notifications.create('wardrobe-error-' + Date.now(), {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Fitly',
                message: 'Có lỗi xảy ra khi thêm vào tủ đồ'
            });
        }
    }
});

// ==========================================
// MESSAGE HANDLERS
// ==========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse).catch(error => {
        console.error('Message handler error:', error);
        sendResponse({ success: false, error: error.message });
    });
    return true;
});

async function handleMessage(message, sender) {
    console.log('[ServiceWorker] Message:', message.type);

    switch (message.type) {
        case 'GET_SERVER_URL':
            return { url: getApiBaseUrl() };

        case 'GET_AUTH_STATE':
            return await handleGetAuthState();

        case 'ENABLE_GUEST_MODE':
            return await handleEnableGuestMode();

        case 'STORE_AUTH_TOKEN':
            return await handleStoreAuthToken(message.payload);

        case 'AUTH_SUCCESS':
            // Handle auth success from popup window
            return await handleAuthSuccess(message.session);

        case 'LOGOUT':
            return await handleLogout();

        case 'PROCESS_TRYON':
            return await handleProcessTryOn(message.data);

        case 'ADD_TO_WARDROBE':
            return await handleAddToWardrobe(message.data);

        case 'GET_WARDROBE':
            return await handleGetWardrobe(message.data);

        case 'GET_GEMS_BALANCE':
            return await handleGetGemsBalance();

        case 'SAVE_OUTFIT':
            return await handleSaveOutfit(message.data);

        case 'GET_OUTFITS':
            return await handleGetOutfits(message.data);

        case 'IMAGE_SELECTED':
            await chrome.storage.session.set({
                pending_clothing_image: message.imageUrl
            });
            return { success: true };

        case 'GET_PENDING_IMAGE':
            const data = await chrome.storage.session.get(['pending_clothing_image', 'pending_source_url']);
            if (data.pending_clothing_image) {
                await chrome.storage.session.remove(['pending_clothing_image', 'pending_source_url']);
                return {
                    imageUrl: data.pending_clothing_image,
                    sourceUrl: data.pending_source_url
                };
            }
            return { imageUrl: null };

        case 'SAVE_MODEL_IMAGE':
            return await handleSaveModelImage(message.data);

        case 'GET_MODEL_IMAGE':
            return await handleGetModelImage();

        case 'GET_RECENT_CLOTHING':
            return await handleGetRecentClothing();

        case 'SAVE_RECENT_CLOTHING':
            return await handleSaveRecentClothing(message.data);

        case 'DELETE_RECENT_CLOTHING':
            return await handleDeleteRecentClothing(message.data);

        case 'SAVE_CLOTHING_TO_WARDROBE':
            return await handleSaveClothingToWardrobe(message.data);

        case 'SAVE_TO_WARDROBE':
            return await handleAddToWardrobe({
                image_url: message.data?.imageUrl,
                name: message.data?.name || 'Saved Result',
                category: message.data?.type === 'tryon_result' ? 'outfit' : 'other',
                source_url: message.data?.sourceUrl || '',
            });

        // User model images management
        case 'GET_USER_MODELS':
            return await handleGetUserModels();

        case 'ADD_USER_MODEL':
            return await handleAddUserModel(message.data);

        case 'DELETE_USER_MODEL':
            return await handleDeleteUserModel(message.data);

        case 'SET_DEFAULT_MODEL':
            return await handleSetDefaultModel(message.data);

        case 'GET_DEFAULT_MODEL':
            return await handleGetDefaultModel();

        // Demo mode specific
        case 'GET_SAMPLE_MODELS':
            return handleGetSampleModels();

        case 'GET_SAMPLE_CLOTHING':
            return handleGetSampleClothing();

        // Cloud sync
        case 'SYNC_TO_CLOUD':
            return await syncToCloud();

        case 'SYNC_FROM_CLOUD':
            return await syncFromCloud();

        case 'GET_SYNC_STATUS':
            const lastSync = await chrome.storage.local.get('last_sync');
            return {
                success: true,
                lastSync: lastSync.last_sync || null,
                autoSyncEnabled: FEATURES.SYNC_TO_CLOUD,
            };

        // Settings
        case 'UPDATE_SETTINGS':
            return await handleUpdateSettings(message.data);

        case 'GET_SETTINGS':
            return await handleGetSettings();

        // Payment status
        case 'CHECK_PAYMENT_STATUS':
            return await handleCheckPaymentStatus();

        // Refund gems when image validation fails
        case 'REFUND_GEMS':
            return await handleRefundGems(message.data);

        default:
            return { success: false, error: 'Unknown message type' };
    }
}

// ==========================================
// API HANDLERS (with Demo Mode support)
// ==========================================

async function handleGetAuthState() {
    const demoMode = await isDemoMode();
    if (demoMode) {
        return {
            authenticated: true,
            user: MOCK_USER,
            profile: { ...MOCK_PROFILE, gems_balance: demoState.gemsBalance }
        };
    }

    try {
        const token = await getAuthToken();

        // If user has token (authenticated), clear guest mode
        if (token) {
            await chrome.storage.local.remove(['guest_mode', 'guest_gems_balance']);
        }
        if (!token) {
            return { authenticated: false };
        }

        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/auth/me`);
        if (!response.ok) {
            // Clear stored token if invalid
            if (response.status === 401) {
                await handleLogout();
            }
            return { authenticated: false };
        }

        const data = await response.json();

        // Update local gems balance
        if (data.profile?.gems_balance !== undefined) {
            demoState.gemsBalance = data.profile.gems_balance;
        }

        // Start auto-sync if not already running
        startAutoSync();

        return {
            authenticated: true,
            user: data.user,
            profile: data.profile,
            syncEnabled: FEATURES.SYNC_TO_CLOUD,
        };
    } catch (error) {
        console.error('Auth check failed:', error);

        // Check if we have cached user data for offline mode
        if (FEATURES.OFFLINE_FALLBACK) {
            const cached = await chrome.storage.local.get(['cached_user', 'cached_profile']);
            if (cached.cached_user) {
                return {
                    authenticated: true,
                    user: cached.cached_user,
                    profile: cached.cached_profile,
                    offline: true,
                };
            }
        }

        return { authenticated: false };
    }
}

// Enable guest mode - allows using extension without authentication with limited features
async function handleEnableGuestMode() {
    try {
        // Set guest mode flag
        await chrome.storage.local.set({ guest_mode: true });

        // Initialize guest gems balance
        const GUEST_FREE_GEMS = 3;
        demoState.gemsBalance = GUEST_FREE_GEMS;
        await chrome.storage.local.set({ guest_gems_balance: GUEST_FREE_GEMS });

        console.log('[Fitly] Guest mode enabled with', GUEST_FREE_GEMS, 'free gems');

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
async function isGuestMode() {
    const data = await chrome.storage.local.get('guest_mode');
    return data.guest_mode === true;
}

async function handleProcessTryOn(data) {
    // Check for guest mode (runs as demo without authentication)
    const guestMode = await isGuestMode();
    const demoMode = await isDemoMode();

    if (demoMode || guestMode || data.use_mock) {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

        // Get current gems balance (from storage for guest mode)
        let currentBalance = demoState.gemsBalance;
        if (guestMode) {
            const storageData = await chrome.storage.local.get('guest_gems_balance');
            currentBalance = storageData.guest_gems_balance ?? demoState.gemsBalance;
        }

        // Deduct gems
        const gemCost = data.quality === 'hd' ? 2 : 1;
        if (currentBalance < gemCost) {
            return {
                success: false,
                error: 'Không đủ gems. Đăng nhập để mua thêm gems!'
            };
        }

        const newBalance = currentBalance - gemCost;
        demoState.gemsBalance = newBalance;

        // Persist new balance for guest mode
        if (guestMode) {
            await chrome.storage.local.set({ guest_gems_balance: newBalance });
        }

        // Save person image to user models (if not already there)
        if (data.person_image && !data.person_image.startsWith('data:')) {
            await handleAddUserModel({
                imageUrl: data.person_image,
                source: 'tryon',
                label: 'Ảnh thử đồ'
            });
        }

        // Save to recent clothing
        await handleSaveRecentClothing({ 
            imageUrl: data.clothing_image,
            sourceUrl: data.source_url,
            name: data.clothing_name
        });

        // Return random result
        const resultUrl = MOCK_TRYON_RESULTS[Math.floor(Math.random() * MOCK_TRYON_RESULTS.length)];

        return {
            success: true,
            result_image_url: resultUrl,
            tryon_id: 'tryon-' + Date.now(),
            gems_used: gemCost,
            provider_used: data.use_mock ? 'mock-dev' : (guestMode ? 'guest-demo' : 'demo'),
            gems_remaining: newBalance,
        };
    }

    try {
        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/tryon`, {
            method: 'POST',
            body: JSON.stringify(data),
        });

        const result = await response.json();
        if (result.success) {
            await handleSaveRecentClothing({ 
                imageUrl: data.clothing_image,
                sourceUrl: data.source_url,
                name: data.clothing_name
            });
        }
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Handle refund gems when image validation fails
 * This prevents charging users for failed try-on results
 */
async function handleRefundGems(data) {
    const guestMode = await isGuestMode();
    const demoMode = await isDemoMode();
    const refundAmount = data.amount || 1;

    console.log('[Fitly] Processing gem refund:', data.reason, 'Amount:', refundAmount);

    if (demoMode || guestMode) {
        // Get current balance
        let currentBalance = demoState.gemsBalance;
        if (guestMode) {
            const storageData = await chrome.storage.local.get('guest_gems_balance');
            currentBalance = storageData.guest_gems_balance ?? demoState.gemsBalance;
        }

        // Add refund amount
        const newBalance = currentBalance + refundAmount;
        demoState.gemsBalance = newBalance;

        // Persist for guest mode
        if (guestMode) {
            await chrome.storage.local.set({ guest_gems_balance: newBalance });
        }

        console.log('[Fitly] Gems refunded. New balance:', newBalance);

        return {
            success: true,
            refunded: refundAmount,
            newBalance: newBalance,
            message: `Đã hoàn lại ${refundAmount} gem do ảnh bị lỗi`
        };
    }

    // For authenticated users, call backend API
    try {
        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/gems/refund`, {
            method: 'POST',
            body: JSON.stringify({
                amount: refundAmount,
                reason: data.reason,
                tryon_id: data.tryonId
            }),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('[Fitly] Refund API error:', error);
        return { success: false, error: error.message };
    }
}

async function handleAddToWardrobe(data) {
    const demoMode = await isDemoMode();
    if (demoMode) {
        const newItem = {
            id: 'wardrobe-' + Date.now(),
            user_id: MOCK_USER.id,
            image_url: data.image_url,
            name: data.name || 'New Item',
            category: data.category || 'other',
            source_url: data.source_url,
            created_at: new Date().toISOString(),
        };

        // Load existing wardrobe from storage first
        const storage = await chrome.storage.local.get('demo_wardrobe');
        let wardrobe = storage.demo_wardrobe || [...MOCK_WARDROBE];

        // Check for duplicate
        const exists = wardrobe.find(item => item.image_url === data.image_url);
        if (exists) {
            return { success: true, item: exists, message: 'Đã có trong tủ đồ' };
        }

        // Add new item to beginning
        wardrobe.unshift(newItem);

        // Persist to storage
        await chrome.storage.local.set({ demo_wardrobe: wardrobe });

        // Also update in-memory state
        demoState.wardrobe = wardrobe;

        console.log('[Fitly] Added to wardrobe:', newItem.name, 'Total items:', wardrobe.length);
        return { success: true, item: newItem };
    }

    try {
        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/wardrobe`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function handleGetWardrobe(data = {}) {
    const demoMode = await isDemoMode();
    if (demoMode) {
        // Load from storage (persisted) instead of just memory
        const storage = await chrome.storage.local.get('demo_wardrobe');
        let items = storage.demo_wardrobe || [...MOCK_WARDROBE];

        // Update in-memory state
        demoState.wardrobe = items;

        if (data.category) {
            items = items.filter(item => item.category === data.category);
        }
        return { success: true, items, total: items.length };
    }

    try {
        const params = new URLSearchParams();
        if (data.limit) params.set('limit', data.limit);
        if (data.category) params.set('category', data.category);

        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/wardrobe?${params}`);
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function handleGetGemsBalance() {
    const guestMode = await isGuestMode();

    const demoMode = await isDemoMode();
    if (demoMode || guestMode) {
        // For guest mode, check storage for persisted balance
        const data = await chrome.storage.local.get('guest_gems_balance');
        const balance = data.guest_gems_balance ?? demoState.gemsBalance;
        return { success: true, balance: balance };
    }

    try {
        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/gems/balance`);
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function handleSaveOutfit(data) {
    const demoMode = await isDemoMode();
    if (demoMode) {
        const newOutfit = {
            id: 'outfit-' + Date.now(),
            user_id: MOCK_USER.id,
            name: data.name || 'My Outfit',
            result_image_url: data.result_image_url,
            clothing_image_url: data.clothing_image_url,
            model_image_url: data.model_image_url,
            created_at: new Date().toISOString(),
        };
        demoState.outfits.unshift(newOutfit);
        return { success: true, outfit: newOutfit };
    }

    try {
        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/outfits`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function handleGetOutfits(data = {}) {
    const demoMode = await isDemoMode();
    if (demoMode) {
        return { success: true, outfits: demoState.outfits, total: demoState.outfits.length };
    }

    try {
        const params = new URLSearchParams();
        if (data.limit) params.set('limit', data.limit);

        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/outfits?${params}`);
        return await response.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function handleSaveModelImage(data) {
    const demoMode = await isDemoMode();
    if (demoMode) {
        demoState.modelImage = data.imageUrl;
        await chrome.storage.local.set({ model_image: data.imageUrl });
        return { success: true };
    }

    try {
        await chrome.storage.local.set({ model_image: data.imageUrl });
        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/auth/me`, {
            method: 'PUT',
            body: JSON.stringify({ model_image_url: data.imageUrl }),
        });
        return { success: true, ...(await response.json()) };
    } catch (error) {
        return { success: true, local: true };
    }
}

async function handleGetModelImage() {
    const local = await chrome.storage.local.get('model_image');
    if (local.model_image) {
        return { success: true, imageUrl: local.model_image };
    }

    const demoMode = await isDemoMode();
    if (demoMode) {
        return { success: true, imageUrl: demoState.modelImage };
    }

    try {
        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/auth/me`);
        const data = await response.json();
        if (data.profile?.model_image_url) {
            await chrome.storage.local.set({ model_image: data.profile.model_image_url });
            return { success: true, imageUrl: data.profile.model_image_url };
        }
        return { success: true, imageUrl: null };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function handleGetRecentClothing() {
    const data = await chrome.storage.local.get('recent_clothing');
    return { success: true, items: data.recent_clothing || demoState.recentClothing };
}

async function handleSaveRecentClothing(data) {
    const storage = await chrome.storage.local.get('recent_clothing');
    let recentClothing = storage.recent_clothing || [];

    // Check for duplicate
    const exists = recentClothing.find(item => item.imageUrl === data.imageUrl);
    if (exists) {
        // Move to top if already exists
        recentClothing = recentClothing.filter(item => item.imageUrl !== data.imageUrl);
        exists.timestamp = Date.now();
        exists.tryCount = (exists.tryCount || 1) + 1;
        // Update name if not set
        if (!exists.name && data.sourceUrl && !data.sourceUrl.startsWith('data:') && !data.sourceUrl.startsWith('blob:')) {
             try {
                const hostname = new URL(data.sourceUrl).hostname;
                exists.name = hostname.replace('www.', '');
            } catch (e) {}
        }
        recentClothing.unshift(exists);
    } else {
        // Detect source type: data: hoặc blob: URL = local upload, http = online
        const isLocalUpload = data.imageUrl.startsWith('data:') || data.imageUrl.startsWith('blob:');

        let name = data.name;
        if (!name && data.sourceUrl && !data.sourceUrl.startsWith('data:') && !data.sourceUrl.startsWith('blob:')) {
             try {
                const hostname = new URL(data.sourceUrl).hostname;
                name = hostname.replace('www.', '');
            } catch (e) {}
        }

        recentClothing.unshift({
            id: 'clothing-' + Date.now(),
            imageUrl: data.imageUrl,
            sourceUrl: data.sourceUrl,
            name: name || 'Item',
            sourceType: data.sourceType || (isLocalUpload ? 'local_upload' : 'online'),
            cachedKey: data.cachedKey || null,
            timestamp: Date.now(),
            tryCount: 1,
            saved: false, // Đã lưu vào bộ sưu tập chưa
        });
    }

    recentClothing = recentClothing.slice(0, 15);

    await chrome.storage.local.set({ recent_clothing: recentClothing });
    return { success: true };
}

// Delete a clothing item from history
async function handleDeleteRecentClothing(data) {
    if (!data.clothingId && !data.imageUrl) {
        return { success: false, error: 'Clothing ID or URL is required' };
    }

    const storage = await chrome.storage.local.get('recent_clothing');
    let recentClothing = storage.recent_clothing || [];

    if (data.clothingId) {
        recentClothing = recentClothing.filter(item => item.id !== data.clothingId);
    } else {
        recentClothing = recentClothing.filter(item => item.imageUrl !== data.imageUrl);
    }

    await chrome.storage.local.set({ recent_clothing: recentClothing });
    return { success: true };
}

// Save clothing to wardrobe collection
async function handleSaveClothingToWardrobe(data) {
    if (!data.imageUrl) {
        return { success: false, error: 'Image URL is required' };
    }

    // Add to wardrobe
    const result = await handleAddToWardrobe({
        image_url: data.imageUrl,
        source_url: data.sourceUrl,
        name: data.name || 'Saved Item',
        category: data.category || 'other',
    });

    if (result.success) {
        // Mark as saved in recent clothing
        const storage = await chrome.storage.local.get('recent_clothing');
        let recentClothing = storage.recent_clothing || [];

        recentClothing = recentClothing.map(item => {
            if (item.imageUrl === data.imageUrl) {
                return { ...item, saved: true };
            }
            return item;
        });

        await chrome.storage.local.set({ recent_clothing: recentClothing });
    }

    return result;
}

// ==========================================
// USER MODEL IMAGES MANAGEMENT
// ==========================================

const MAX_USER_MODELS = 10;

async function handleGetUserModels() {
    // Always check local storage first (offline support)
    const storage = await chrome.storage.local.get(['user_models', 'default_model_id']);
    let models = storage.user_models || [];
    let defaultModelId = storage.default_model_id || null;

    // Try to get from cloud if authenticated
    const demoMode = await isDemoMode();
    if (!demoMode && FEATURES.SYNC_TO_CLOUD) {
        try {
            const token = await getAuthToken();
            if (token) {
                const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/extension/models`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.models) {
                        models = data.models;
                        defaultModelId = data.defaultModelId;

                        // Update local storage
                        await chrome.storage.local.set({
                            user_models: models,
                            default_model_id: defaultModelId,
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('[Fitly] Failed to get models from cloud, using local:', error);
        }
    }

    return {
        success: true,
        models,
        defaultModelId
    };
}

async function handleAddUserModel(data) {
    if (!data.imageUrl) {
        return { success: false, error: 'Image URL is required' };
    }

    const storage = await chrome.storage.local.get(['user_models', 'default_model_id']);
    let models = storage.user_models || [];

    // Check if already exists
    const exists = models.find(m => m.url === data.imageUrl);
    if (exists) {
        return { success: true, model: exists, message: 'Already exists' };
    }

    // Create new model entry
    const newModel = {
        id: 'model-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        url: data.imageUrl,
        label: data.label || 'Ảnh ' + (models.length + 1),
        source: data.source || 'upload',
        createdAt: Date.now(),
    };

    // Add to beginning
    models.unshift(newModel);

    // Limit to max
    models = models.slice(0, MAX_USER_MODELS);

    // Save locally
    await chrome.storage.local.set({ user_models: models });

    // If first model, set as default
    const isFirst = models.length === 1 || !storage.default_model_id;
    if (isFirst) {
        await chrome.storage.local.set({ default_model_id: newModel.id });
    }

    // Sync to cloud if authenticated
    const demoMode = await isDemoMode();
    if (!demoMode && FEATURES.SYNC_TO_CLOUD) {
        try {
            const token = await getAuthToken();
            if (token) {
                await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/extension/models`, {
                    method: 'POST',
                    body: JSON.stringify({
                        imageUrl: data.imageUrl,
                        label: newModel.label,
                        source: newModel.source,
                    }),
                });
            }
        } catch (error) {
            console.warn('[Fitly] Failed to sync model to cloud:', error);
            // Continue - local save succeeded
        }
    }

    return { success: true, model: newModel };
}

async function handleDeleteUserModel(data) {
    if (!data.modelId) {
        return { success: false, error: 'Model ID is required' };
    }

    const storage = await chrome.storage.local.get(['user_models', 'default_model_id']);
    let models = storage.user_models || [];

    // Remove model
    models = models.filter(m => m.id !== data.modelId);
    await chrome.storage.local.set({ user_models: models });

    // If deleted model was default, set new default
    if (storage.default_model_id === data.modelId) {
        const newDefaultId = models.length > 0 ? models[0].id : null;
        await chrome.storage.local.set({ default_model_id: newDefaultId });
    }

    return { success: true };
}

async function handleSetDefaultModel(data) {
    if (!data.modelId) {
        return { success: false, error: 'Model ID is required' };
    }

    await chrome.storage.local.set({ default_model_id: data.modelId });

    // Also update the current model_image
    const storage = await chrome.storage.local.get('user_models');
    const models = storage.user_models || [];
    const model = models.find(m => m.id === data.modelId);

    if (model) {
        await chrome.storage.local.set({ model_image: model.url });
    }

    return { success: true };
}

async function handleGetDefaultModel() {
    const storage = await chrome.storage.local.get(['user_models', 'default_model_id']);
    const models = storage.user_models || [];
    const defaultModelId = storage.default_model_id;

    if (defaultModelId) {
        const model = models.find(m => m.id === defaultModelId);
        if (model) {
            return { success: true, model };
        }
    }

    // Return first model if no default set
    if (models.length > 0) {
        return { success: true, model: models[0] };
    }

    return { success: true, model: null };
}

// Demo mode: Sample data for quick testing
function handleGetSampleModels() {
    return {
        success: true,
        models: [
            { id: 'sample-1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600', label: 'Mẫu 1', source: 'sample' },
            { id: 'sample-2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', label: 'Mẫu 2', source: 'sample' },
            { id: 'sample-3', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600', label: 'Mẫu 3', source: 'sample' },
        ]
    };
}

function handleGetSampleClothing() {
    return {
        success: true,
        clothing: [
            { id: 'c1', url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', label: 'White T-Shirt' },
            { id: 'c2', url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', label: 'Blue Jeans' },
            { id: 'c3', url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400', label: 'Denim Jacket' },
            { id: 'c4', url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', label: 'Floral Dress' },
            { id: 'c5', url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400', label: 'Black Hoodie' },
        ]
    };
}

// ==========================================
// AUTH HELPERS (for production mode)
// ==========================================

async function getAuthToken() {
    const data = await chrome.storage.local.get(['auth_token', 'expires_at', 'refresh_token']);
    if (!data.auth_token) return null;

    // Check if token expired and try refresh
    if (data.expires_at && Date.now() > data.expires_at - 60000) { // 1 min buffer
        try {
            const refreshed = await refreshAuthToken(data.refresh_token);
            if (refreshed) return refreshed;
        } catch (e) {
            console.error('Token refresh failed:', e);
        }
    }

    return data.auth_token;
}

async function refreshAuthToken(refreshToken) {
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.access_token) {
            await chrome.storage.local.set({
                auth_token: data.access_token,
                refresh_token: data.refresh_token || refreshToken,
                expires_at: Date.now() + (data.expires_in || 3600) * 1000,
            });
            return data.access_token;
        }
    } catch (error) {
        console.error('Refresh token error:', error);
    }
    return null;
}

async function makeAuthenticatedRequest(url, options = {}) {
    const token = await getAuthToken();
    if (!token) throw new Error('Unauthorized');

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    // If unauthorized, try to refresh and retry once
    if (response.status === 401) {
        const storage = await chrome.storage.local.get('refresh_token');
        const newToken = await refreshAuthToken(storage.refresh_token);

        if (newToken) {
            return await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json',
                },
            });
        }
    }

    return response;
}

// ==========================================
// SETTINGS HANDLERS
// ==========================================

async function handleUpdateSettings(data) {
    try {
        // Save locally
        const updates = {};

        if (data.language) {
            updates.extension_locale = data.language;
        }
        if (data.theme) {
            updates.extension_theme = data.theme;
        }
        if (data.qualityPreference) {
            updates.extension_quality = data.qualityPreference;
        }

        await chrome.storage.local.set(updates);

        // Sync to server if authenticated
        const demoMode = await isDemoMode();
        if (!demoMode && FEATURES.SYNC_TO_CLOUD) {
            try {
                const token = await getAuthToken();
                if (token) {
                    await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/extension/settings`, {
                        method: 'PUT',
                        body: JSON.stringify(data),
                    });
                }
            } catch (error) {
                console.warn('[Fitly] Settings sync to cloud failed:', error);
            }
        }

        return { success: true };
    } catch (error) {
        console.error('[Fitly] Update settings error:', error);
        return { success: false, error: error.message };
    }
}

async function handleGetSettings() {
    try {
        const storage = await chrome.storage.local.get([
            'extension_locale',
            'extension_theme',
            'extension_quality',
        ]);

        return {
            success: true,
            settings: {
                language: storage.extension_locale || 'vi',
                theme: storage.extension_theme || 'dark',
                qualityPreference: storage.extension_quality || 'standard',
            },
        };
    } catch (error) {
        console.error('[Fitly] Get settings error:', error);
        return { success: false, error: error.message };
    }
}

async function handleCheckPaymentStatus() {
    // Refresh user profile to get updated gems balance after payment
    try {
        const demoMode = await isDemoMode();
        if (demoMode) {
            return { success: true, balance: demoState.gemsBalance };
        }

        const token = await getAuthToken();
        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/gems/balance`);
        const data = await response.json();

        if (data.success) {
            demoState.gemsBalance = data.balance;
            return { success: true, balance: data.balance };
        }

        return data;
    } catch (error) {
        console.error('[Fitly] Check payment status error:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// CLOUD SYNC FUNCTIONS
// ==========================================

// Sync all extension data to cloud
async function syncToCloud() {
    if (!FEATURES.SYNC_TO_CLOUD) return { success: true, skipped: true };

    try {
        const token = await getAuthToken();
        if (!token) {
            console.log('[Fitly] Sync skipped - not authenticated');
            return { success: false, error: 'Not authenticated' };
        }

        // Get local data
        const storage = await chrome.storage.local.get([
            'user_models',
            'default_model_id',
            'recent_clothing'
        ]);

        const payload = {
            userModels: storage.user_models || [],
            clothingHistory: storage.recent_clothing || [],
            settings: {
                defaultModelId: storage.default_model_id,
            },
        };

        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/extension/sync`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
            console.log('[Fitly] Cloud sync successful:', result.results);
            await chrome.storage.local.set({ last_sync: Date.now() });
        }

        return result;
    } catch (error) {
        console.error('[Fitly] Cloud sync error:', error);
        return { success: false, error: error.message };
    }
}

// Pull data from cloud
async function syncFromCloud() {
    if (!FEATURES.SYNC_TO_CLOUD) return { success: true, skipped: true };

    try {
        const token = await getAuthToken();
        if (!token) return { success: false, error: 'Not authenticated' };

        const response = await makeAuthenticatedRequest(`${getApiBaseUrl()}/api/extension/sync`);
        const result = await response.json();

        if (result.success && result.data) {
            // Update local storage with cloud data
            const updates = {};

            if (result.data.userModels) {
                updates.user_models = result.data.userModels.map(m => ({
                    id: m.id,
                    url: m.url || m.image_url,
                    label: m.label,
                    source: m.source,
                    createdAt: m.createdAt || m.created_at,
                }));
            }

            if (result.data.clothingHistory) {
                updates.recent_clothing = result.data.clothingHistory.map(c => ({
                    id: c.id,
                    imageUrl: c.imageUrl || c.image_url,
                    sourceUrl: c.sourceUrl || c.source_url,
                    tryCount: c.tryCount || c.try_count,
                    saved: c.saved || c.is_saved,
                    timestamp: c.timestamp || c.last_used_at,
                }));
            }

            if (result.data.settings?.defaultModelId) {
                updates.default_model_id = result.data.settings.defaultModelId;
            }

            if (result.data.profile?.gems_balance !== undefined) {
                demoState.gemsBalance = result.data.profile.gems_balance;
            }

            await chrome.storage.local.set(updates);
            console.log('[Fitly] Synced from cloud:', Object.keys(updates));
        }

        return result;
    } catch (error) {
        console.error('[Fitly] Sync from cloud error:', error);
        return { success: false, error: error.message };
    }
}

// Auto-sync on intervals
let syncInterval = null;

function startAutoSync() {
    if (syncInterval) return;

    syncInterval = setInterval(async () => {
        const token = await getAuthToken();
        if (token) {
            await syncToCloud();
        }
    }, FEATURES.AUTO_SYNC_INTERVAL);

    console.log('[Fitly] Auto-sync started');
}

function stopAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('[Fitly] Auto-sync stopped');
    }
}

async function handleStoreAuthToken(payload) {
    if (payload.authenticated) {
        console.log('[Fitly] Storing auth token from web app');

        // Store auth tokens
        await chrome.storage.local.set({
            auth_token: payload.access_token,
            refresh_token: payload.refresh_token,
            user: payload.user,
            expires_at: payload.expires_at || (Date.now() + 3600 * 1000),
            cached_user: payload.user, // Cache for offline mode
        });

        // Clear guest mode when user authenticates
        await chrome.storage.local.remove(['guest_mode', 'guest_gems_balance']);

        // Update cached auth state for isDemoMode()
        await updateCachedAuthState();

        // Fetch and cache profile for complete sync
        try {
            const profileResponse = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${payload.access_token}`,
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
                    console.log('[Fitly] Profile synced from web, gems:', demoState.gemsBalance);
                }
            }
        } catch (error) {
            console.warn('[Fitly] Could not fetch profile:', error.message);
        }

        // Start auto-sync
        startAutoSync();

        // Notify all extension views to refresh (sidebar, popup, etc.)
        chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', authenticated: true })
            .catch(() => { }); // Ignore if no listeners

        console.log('[Fitly] Auth synced from web app for user:', payload.user?.email);
        return { success: true };
    } else {
        console.log('[Fitly] Logout signal received from web app');
        return await handleLogout();
    }
}

/**
 * Handle auth success from popup window
 * Called when user successfully logs in via /auth/popup
 */
async function handleAuthSuccess(session) {
    console.log('[Fitly] Auth success received from popup');

    if (!session || !session.access_token) {
        console.error('[Fitly] Invalid session data');
        return { success: false, error: 'Invalid session' };
    }

    try {
        // Store auth tokens
        await chrome.storage.local.set({
            auth_token: session.access_token,
            refresh_token: session.refresh_token,
            user: session.user,
            expires_at: Date.now() + 3600 * 1000, // 1 hour
            cached_user: session.user, // Cache for offline mode
        });

        // Update cached auth state for isDemoMode()
        await updateCachedAuthState();

        // Fetch and cache profile
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

        // Start auto-sync
        startAutoSync();

        // Sync from cloud to get user data
        setTimeout(() => syncFromCloud(), 1000);

        // Notify all extension views to refresh
        chrome.runtime.sendMessage({ type: 'AUTH_STATE_CHANGED', authenticated: true })
            .catch(() => { }); // Ignore if no listeners

        console.log('[Fitly] Auth success - user logged in:', session.user?.email);
        return { success: true };
    } catch (error) {
        console.error('[Fitly] Auth success handling error:', error);
        return { success: false, error: error.message };
    }
}

async function handleLogout() {
    await chrome.storage.local.remove([
        'auth_token',
        'refresh_token',
        'user',
        'expires_at',
        'demo_wardrobe',  // Reset demo wardrobe
        'recent_clothing',
        'user_models',
        'default_model_id',
        'model_image'
    ]);

    // Reset demo state
    demoState = {
        gemsBalance: 50,
        wardrobe: [...MOCK_WARDROBE],
        outfits: [...MOCK_OUTFITS],
        modelImage: null,
        recentClothing: [],
        userModels: [],
        defaultModelId: null,
    };

    return { success: true };
}

// ==========================================
// STARTUP
// ==========================================

// Initial setup
(async () => {
    console.log('[Fitly] Service worker loaded');

    // Initialize cached auth state for isDemoMode()
    await updateCachedAuthState();

    // Detect server port on startup
    await detectServerPort();

    // Start auto-sync if authenticated
    const token = await getAuthToken();
    if (token && FEATURES.SYNC_TO_CLOUD) {
        startAutoSync();

        // Initial sync from cloud
        setTimeout(async () => {
            await syncFromCloud();
        }, 2000); // Wait 2s before initial sync
    }
})();

// Listen for auth changes to start/stop sync
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes.auth_token) {
        if (changes.auth_token.newValue) {
            startAutoSync();
            syncFromCloud(); // Sync when logging in
        } else {
            stopAutoSync();
        }
    }
});