/**
 * File: sidebar.js
 * Purpose: Main logic cho sidebar extension - đồng bộ với web app design
 * 
 * Input: User interactions, messages từ service worker
 * Output: UI updates, API calls thông qua service worker
 * 
 * Flow:
 * 1. Khởi tạo UI và check auth state
 * 2. Load model image từ storage
 * 3. Lắng nghe image capture từ context menu
 * 4. Xử lý try-on flow gọi backend chung với web
 * 5. Hiển thị kết quả và actions
 * 
 * Backend: Sử dụng chung API với web app (/api/tryon, /api/gems, etc.)
 */

// State
let state = {
    authenticated: false,
    user: null,
    profile: null,
    gemsBalance: 0,
    modelImage: null,
    clothingImage: null,
    clothingSourceUrl: null, // URL of the product page where clothing was captured
    resultImage: null,
    isProcessing: false,
    recentClothing: [],
    showRecentClothing: false,
    userModels: [],
    defaultModelId: null,
    selectedModelId: null,
    // Multiple results support
    results: [], // Array of { id, name, imageUrl, clothingUrl, modelUrl, sourceUrl, timestamp }
    activePopups: [], // Array of popup IDs currently open
    resultWindows: {}, // Map of result ID to window ID for tracking open popup windows
    nextResultId: 1,
    // Language support
    locale: 'vi',
    // Panel states
    showGemsPanel: false,
    showLanguagePanel: false,
};

// ==========================================
// I18N - Use window.i18n from lib/i18n.js
// ==========================================

// Get references from window.i18n (loaded via script tag)
const {
    SUPPORTED_LOCALES,
    DEFAULT_LOCALE,
    LOCALE_INFO,
    CURRENCY_CONFIG,
    TRANSLATIONS,
    LOADING_MESSAGES,
    t: i18nT,
    formatCurrency,
    formatPriceVND,
    formatTimeAgo,
    getLoadingMessage,
    saveLocalePreference,
    loadLocalePreference,
} = window.i18n || {};

// Wrapper function to use current state locale
function t(key, vars = {}) {
    if (!i18nT) {
        console.warn('[i18n] i18n module not loaded');
        return key;
    }
    return i18nT(key, state.locale, vars);
}

// Format currency with current locale
function formatPrice(amountVND) {
    if (!formatCurrency) return amountVND + '₫';
    return formatCurrency(amountVND, state.locale);
}

// Get time ago with current locale
function getTimeAgo(timestamp) {
    if (!formatTimeAgo) return '';
    return formatTimeAgo(timestamp, state.locale);
}

// Config
const GEM_COST_STANDARD = 1;
const GEM_COST_HD = 2;

// DOM Elements
const $ = (id) => document.getElementById(id);

const elements = {
    // Header
    gemsDisplay: $('gems-display'),
    gemsCount: $('gems-count'),
    profileBtn: $('profile-btn'),

    // Sections
    authSection: $('auth-section'),
    mainContent: $('main-content'),
    resultSection: $('result-section'),

    // Auth
    loginGoogleBtn: $('login-google-btn'),

    // Model
    modelImageContainer: $('model-image-container'),
    modelImage: $('model-image'),
    modelPlaceholder: $('model-placeholder'),
    modelUploadInput: $('model-upload-input'),
    changeModelBtn: $('change-model-btn'),

    // Clothing
    clothingImageContainer: $('clothing-image-container'),
    clothingImage: $('clothing-image'),
    clothingPlaceholder: $('clothing-placeholder'),
    pasteUrlBtn: $('paste-url-btn'),

    // Try-on
    tryOnBtn: $('try-on-btn'),

    // Result - New popup system (popups are injected into webpage)
    resultPreviewSection: $('result-preview-section'),
    resultThumbnails: $('result-thumbnails'),
    resultCount: $('result-count'),
    clearAllResults: $('clear-all-results'),

    // Loading
    loadingOverlay: $('loading-overlay'),
    loadingText: $('loading-text'),
    loadingProgressBar: $('loading-progress-bar'),

    // Error Overlay
    errorOverlay: $('error-overlay'),
    errorMessageText: $('error-message-text'),
    errorRetryBtn: $('error-retry-btn'),
    errorCloseBtn: $('error-close-btn'),

    // Recent clothing (will be added dynamically)
    recentClothingSection: null,
};

// ==========================================
// INIT
// ==========================================

async function init() {
    await checkAuthState();
    await loadUserModels();
    await loadModelImage();
    await checkPendingImage();
    await loadRecentClothing();
    await loadResults(); // Load saved results
    setupEventListeners();
    initTooltipSystem();
    listenForMessages();
    listenForStorageChanges();
    console.log('Fitly sidebar initialized');
}

// ==========================================
// TOOLTIP SYSTEM
// ==========================================

function initTooltipSystem() {
    // Create global tooltip element
    let tooltip = document.getElementById('global-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'global-tooltip';
        document.body.appendChild(tooltip);
    }

    // Delegate event listeners for better performance and dynamic elements
    document.addEventListener('mouseover', (e) => {
        // Find closest element with title or data-tooltip
        const target = e.target.closest('[title], [data-tooltip]');
        if (!target) return;

        // Ignore if it's not an interactive element (optional check)
        // For now, we trust the [title] attribute

        // Handle title attribute (browser native tooltip)
        const title = target.getAttribute('title');
        if (title) {
            target.setAttribute('data-tooltip', title);
            target.setAttribute('data-original-title', title);
            target.removeAttribute('title'); // Remove to prevent native tooltip
        }

        const tooltipText = target.getAttribute('data-tooltip');
        if (tooltipText) {
            showGlobalTooltip(target, tooltipText);
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            // Restore title if it was swapped
            const originalTitle = target.getAttribute('data-original-title');
            if (originalTitle) {
                target.setAttribute('title', originalTitle);
                target.removeAttribute('data-original-title');
            }
            hideGlobalTooltip();
        }
    });
}

function showGlobalTooltip(element, text) {
    const tooltip = document.getElementById('global-tooltip');
    if (!tooltip) return;

    tooltip.textContent = text;
    tooltip.classList.add('visible');

    // Calculate position
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = rect.top - tooltipRect.height - 8; // Above element
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2); // Centered

    // Prevent going off-screen top
    if (top < 0) {
        top = rect.bottom + 8; // Move below
        tooltip.classList.add('bottom'); // Add class for arrow rotation if needed
    } else {
        tooltip.classList.remove('bottom');
    }

    // Prevent going off-screen left/right
    if (left < 4) left = 4;
    if (left + tooltipRect.width > window.innerWidth - 4) {
        left = window.innerWidth - tooltipRect.width - 4;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
}

function hideGlobalTooltip() {
    const tooltip = document.getElementById('global-tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
}

// ==========================================
// USER MODELS MANAGEMENT
// ==========================================

async function loadUserModels() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_USER_MODELS' });
        if (response?.success) {
            state.userModels = response.models || [];
            state.defaultModelId = response.defaultModelId;
            renderUserModels();

            // If there's a default model, use it
            if (state.defaultModelId && !state.modelImage) {
                const defaultModel = state.userModels.find(m => m.id === state.defaultModelId);
                if (defaultModel) {
                    state.modelImage = defaultModel.url;
                    state.selectedModelId = defaultModel.id;
                }
            }
        }
    } catch (error) {
        console.error('Failed to load user models:', error);
    }
}

function renderUserModels() {
    const grid = document.getElementById('user-models-grid');
    const countEl = document.getElementById('models-count');

    if (!grid) return;

    // Update count
    if (countEl) {
        countEl.textContent = `${state.userModels.length}/10`;
    }

    if (state.userModels.length === 0) {
        grid.innerHTML = `
            <div class="user-models-empty" style="grid-column: 1/-1;">
                Chưa có ảnh nào. Tải ảnh lên hoặc thử đồ để lưu tự động.
            </div>
        `;
        return;
    }

    grid.innerHTML = state.recentModels.map(item => {
        const isSelected = state.modelImage === item.imageUrl;
        const isDefault = item.isDefault;
        const label = item.label || 'FRONT'; // Default label

        return `
            <div class="user-model-item ${isSelected ? 'selected' : ''} ${isDefault ? 'is-default' : ''}" 
                 data-id="${item.id}" 
                 data-url="${item.imageUrl}"
                 title="${item.label}${isDefault ? ' (Mặc định)' : ''}">
                <img src="${item.imageUrl}" alt="${item.label}" loading="lazy">
                
                <!-- Overlay with Text -->
                <div class="thumbnail-overlay">
                    <span class="thumbnail-label">${label}</span>
                </div>

                <!-- Status Dot -->
                <div class="status-dot"></div>

                <div class="model-item-actions">
                    ${!isDefault ? `
                        <button class="model-action-btn default-btn" data-action="set-default" title="Đặt mặc định">★</button>
                    ` : ''}
                    <button class="model-action-btn delete-btn" data-action="delete" title="Xóa">×</button>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    grid.querySelectorAll('.user-model-item').forEach(item => {
        // Select model on click
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking action buttons
            if (e.target.closest('.model-item-actions')) return;

            const id = item.dataset.id;
            const url = item.dataset.url;

            state.modelImage = url;
            state.selectedModelId = id;

            // Update selected state visually
            grid.querySelectorAll('.user-model-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');

            updateUI();
            showToast(t('photo_selected'), 'success');
        });

        // Handle action buttons
        item.querySelectorAll('.model-action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const modelId = item.dataset.id;

                if (action === 'delete') {
                    await deleteUserModel(modelId);
                } else if (action === 'set-default') {
                    await setDefaultModel(modelId);
                }
            });
        });
    });
}

async function addUserModel(imageUrl, source = 'upload') {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'ADD_USER_MODEL',
            data: { imageUrl, source }
        });

        if (response?.success) {
            await loadUserModels();

            // Select the new model
            if (response.model) {
                state.modelImage = response.model.url;
                state.selectedModelId = response.model.id;
                updateUI();
            }

            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to add user model:', error);
        return false;
    }
}

async function deleteUserModel(modelId) {
    if (!confirm(t('delete') + '?')) return;

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'DELETE_USER_MODEL',
            data: { modelId }
        });

        if (response?.success) {
            // If deleted model was selected, clear selection
            if (state.selectedModelId === modelId) {
                state.selectedModelId = null;
                state.modelImage = null;
            }

            await loadUserModels();
            updateUI();
            showToast(t('photo_deleted'), 'success');
        }
    } catch (error) {
        console.error('Failed to delete user model:', error);
        showToast(t('photo_delete_error'), 'error');
    }
}

async function setDefaultModel(modelId) {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'SET_DEFAULT_MODEL',
            data: { modelId }
        });

        if (response?.success) {
            state.defaultModelId = modelId;

            // Also select this model
            const model = state.userModels.find(m => m.id === modelId);
            if (model) {
                state.modelImage = model.url;
                state.selectedModelId = modelId;
            }

            renderUserModels();
            updateUI();
            showToast(t('default_set'), 'success');
        }
    } catch (error) {
        console.error('Failed to set default model:', error);
        showToast(t('error_short'), 'error');
    }
}

// Handle Social Login
async function handleSocialLogin(provider) {
    // Get server URL from service worker
    let serverUrl;
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_SERVER_URL' });
        serverUrl = response.url;
    } catch (error) {
        serverUrl = 'http://localhost:3000'; // Fallback
    }

    // Ping server first to ensure it's running
    try {
        await fetch(`${serverUrl}/api/auth/me`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store',
        }).catch(() => null);
    } catch (error) { }

    // Open popup window directly (more reliable than iframe overlay)
    // For now all providers redirect to same auth endpoint or specific provider endpoint
    const popupUrl = `${serverUrl}/auth/popup?provider=${provider}`;
    const popupWidth = 500;
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
        console.log(`[Fitly] ${provider} login popup window opened`);
    } catch (winError) {
        console.error('Failed to open popup window:', winError);
        // Fallback: open as new tab
        chrome.tabs.create({ url: popupUrl });
    }
}

// Check if there's a pending image from context menu selection
async function checkPendingImage() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_PENDING_IMAGE' });
        if (response?.imageUrl) {
            state.clothingImage = response.imageUrl;
            state.clothingSourceUrl = response.sourceUrl || null;
            updateUI();

            if (response.sourceUrl) {
                showToast(t('image_from_context_with_link'), 'success');
            } else {
                showToast(t('image_from_context'), 'success');
            }
        }
    } catch (error) {
        console.error('Failed to get pending image:', error);
    }
}

// Load saved model image
async function loadModelImage() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_MODEL_IMAGE' });
        if (response?.imageUrl) {
            state.modelImage = response.imageUrl;
            updateUI();
        }
    } catch (error) {
        console.error('Failed to load model image:', error);
    }
}

// Load saved try-on results
async function loadResults() {
    try {
        const data = await chrome.storage.local.get('tryon_results');
        if (data.tryon_results) {
            state.results = data.tryon_results;
            // Ensure nextResultId is higher than max existing ID
            if (state.results.length > 0) {
                const maxId = Math.max(...state.results.map(r => r.id));
                state.nextResultId = maxId + 1;
            }
        }
        updateGalleryUI();
    } catch (error) {
        console.error('Failed to load results:', error);
    }
}

// Save results to storage
async function saveResults() {
    try {
        await chrome.storage.local.set({ tryon_results: state.results });
    } catch (error) {
        console.error('Failed to save results:', error);
    }
}

// Load recent clothing images
async function loadRecentClothing() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_RECENT_CLOTHING' });
        if (response?.success && response.items) {
            state.recentClothing = response.items;
            renderClothingHistory();
        }
    } catch (error) {
        console.error('Failed to load recent clothing:', error);
    }
}

// Render clothing history grid
function renderClothingHistory() {
    const grid = document.getElementById('clothing-history-grid');
    const section = document.getElementById('clothing-history-section');

    if (!grid) return;

    if (state.recentClothing.length === 0) {
        grid.innerHTML = `
            <div class="clothing-history-empty">
                Chưa có. Chuột phải vào ảnh quần áo trên web để thử.
            </div>
        `;
        return;
    }

    grid.innerHTML = state.recentClothing.map(item => {
        const isSelected = state.clothingImage === item.imageUrl;
        const isSaved = item.saved;
        const hasSourceUrl = item.sourceUrl && item.sourceUrl.startsWith('http');
        const isLocalUpload = item.sourceType === 'local_upload';
        
        // Determine label (FRONT/SIDE/etc) based on analysis or random for demo
        const poseLabel = item.pose || 'FRONT';

        return `
            <div class="clothing-history-item ${isSelected ? 'selected' : ''} ${isSaved ? 'saved' : ''} ${hasSourceUrl ? 'has-source' : ''}" 
                 data-id="${item.id || ''}"
                 data-url="${item.imageUrl}"
                 data-source-url="${item.sourceUrl || ''}"
                 data-source-type="${item.sourceType || 'online'}"
                 data-cached-key="${item.cachedKey || item.id || ''}"
                 title="${isSaved ? 'Đã lưu vào bộ sưu tập' : 'Click để chọn'}${hasSourceUrl ? ' • Có link sản phẩm' : ''}${isLocalUpload ? ' • Ảnh tải lên' : ''}">
                <img src="${item.imageUrl}" alt="Clothing" loading="lazy"
                     onerror="this.onerror=null; loadCachedFallback(this, '${item.cachedKey || item.id || ''}');">
                
                <!-- Overlay with Text -->
                <div class="thumbnail-overlay">
                    <span class="thumbnail-label">${poseLabel}</span>
                </div>

                <!-- Status Dot -->
                <div class="status-dot"></div>

                ${item.tryCount > 1 ? `<span class="clothing-try-count">×${item.tryCount}</span>` : ''}
                
                <button class="clothing-quick-try" data-action="quick-try" title="Thử ngay!">
                    ✨ Thử
                </button>
                <div class="clothing-item-actions">
                    ${hasSourceUrl ? `<button class="clothing-action-btn visit-btn" data-action="visit" title="Mở trang sản phẩm">🛒</button>` : ''}
                    ${!isSaved ? `<button class="clothing-action-btn save-btn" data-action="save" title="Lưu vào bộ sưu tập">♥</button>` : ''}
                    <button class="clothing-action-btn delete-btn" data-action="delete" title="Xóa">×</button>
                </div>
            </div>
        `;
    }).join('');

    // Auto-cache local upload images
    cacheLocalUploadImages();

    // Add event listeners
    grid.querySelectorAll('.clothing-history-item').forEach(item => {
        // Click to select
        item.addEventListener('click', (e) => {
            if (e.target.closest('.clothing-item-actions')) return;

            const url = item.dataset.url;
            const sourceUrl = item.dataset.sourceUrl;

            state.clothingImage = url;
            state.clothingSourceUrl = sourceUrl || null; // Save source URL for later use

            // Update selected state
            grid.querySelectorAll('.clothing-history-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');

            updateUI();
            showToast(t('clothing_selected'), 'success');
        });

        // Action buttons
        item.querySelectorAll('.clothing-action-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const url = item.dataset.url;
                const id = item.dataset.id;
                const sourceUrl = item.dataset.sourceUrl;

                if (action === 'delete') {
                    await deleteClothingFromHistory(id, url);
                } else if (action === 'save') {
                    await saveClothingToWardrobe(url);
                } else if (action === 'quick-try') {
                    await quickTryClothing(url, sourceUrl);
                } else if (action === 'visit' && sourceUrl) {
                    openProductPage(sourceUrl);
                }
            });
        });
    });
}

// Delete clothing from history
async function deleteClothingFromHistory(clothingId, imageUrl) {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'DELETE_RECENT_CLOTHING',
            data: { clothingId, imageUrl }
        });

        if (response?.success) {
            // If deleted item was selected, clear selection
            if (state.clothingImage === imageUrl) {
                state.clothingImage = null;
            }

            await loadRecentClothing();
            updateUI();
            showToast(t('result_deleted'), 'success');
        }
    } catch (error) {
        console.error('Failed to delete clothing:', error);
        showToast(t('photo_delete_error'), 'error');
    }
}

// Save clothing to wardrobe
async function saveClothingToWardrobe(imageUrl) {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'SAVE_CLOTHING_TO_WARDROBE',
            data: { imageUrl }
        });

        if (response?.success) {
            await loadRecentClothing();
            showToast(t('saved_to_collection'), 'success');
        } else {
            showToast(response?.error || t('save_error'), 'error');
        }
    } catch (error) {
        console.error('Failed to save clothing:', error);
        showToast(t('save_error'), 'error');
    }
}

// Quick try - immediately start try-on
async function quickTryClothing(imageUrl, sourceUrl = null) {
    state.clothingImage = imageUrl;
    state.clothingSourceUrl = sourceUrl || null;
    updateUI();

    // Auto-start try-on if model is ready
    if (state.modelImage) {
        if (state.gemsBalance >= GEM_COST_STANDARD) {
            showToast(t('trying_on'), 'info');
            await processTryOn();
        } else {
            showToast(t('not_enough_gems'), 'error');
        }
    } else {
        showToast(t('select_photo_first'), 'warning');
    }
}

// Clear all clothing history
async function clearClothingHistory() {
    if (!confirm(t('clear_all') + '?')) return;

    try {
        await chrome.storage.local.remove('recent_clothing');
        state.recentClothing = [];
        state.clothingImage = null;
        renderClothingHistory();
        updateUI();
        showToast(t('history_cleared'), 'success');
    } catch (error) {
        console.error('Failed to clear history:', error);
    }
}

// Listen for storage changes (auth token updates from web app)
function listenForStorageChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;

        // Auth token changed - refresh auth state
        if (changes.auth_token) {
            console.log('[Sidebar] Auth token changed, refreshing state...');
            checkAuthState();
        }
    });
}

// ==========================================
// AUTH
// ==========================================

async function checkAuthState() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' });

        if (response.authenticated) {
            state.authenticated = true;
            state.user = response.user;
            state.profile = response.profile;
            state.gemsBalance = response.profile?.gems_balance || 0;
            showMainContent();
        } else {
            // Check if guest mode is enabled
            const storage = await chrome.storage.local.get(['guest_mode', 'guest_gems_balance']);
            if (storage.guest_mode) {
                // User is in guest mode - show main content with limited features
                state.authenticated = false;
                state.user = null;
                state.profile = null;
                state.gemsBalance = storage.guest_gems_balance ?? 0;
                showMainContent();
            } else {
                state.authenticated = false;
                state.user = null;
                state.profile = null;
                state.gemsBalance = 0;
                showAuthSection();
            }
        }

        updateUI();
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
    elements.mainContent?.classList.add('hidden');
}

function showMainContent() {
    elements.authSection?.classList.add('hidden');
    elements.mainContent?.classList.remove('hidden');
}

function updateUI() {
    // Update demo banner visibility and text
    const demoBanner = document.getElementById('demo-banner');
    if (demoBanner) {
        if (!state.authenticated && state.gemsBalance > 0) {
            // Guest mode - show banner
            demoBanner.classList.remove('hidden');
            demoBanner.textContent = `🧪 Chế độ dùng thử - Còn ${state.gemsBalance} lần thử miễn phí`;
        } else if (!state.authenticated && state.gemsBalance === 0) {
            // Guest mode with no gems left
            demoBanner.classList.remove('hidden');
            demoBanner.innerHTML = '⚠️ Hết lượt thử miễn phí - <a href="#" id="login-link">Đăng nhập để tiếp tục</a>';
            // Add login link handler
            const loginLink = demoBanner.querySelector('#login-link');
            loginLink?.addEventListener('click', (e) => {
                e.preventDefault();
                elements.loginGoogleBtn?.click();
            });
        } else {
            // Authenticated - hide banner
            demoBanner.classList.add('hidden');
        }
    }

    // Update gems count with tries remaining
    if (elements.gemsCount) {
        const triesRemaining = Math.floor(state.gemsBalance / GEM_COST_STANDARD);
        elements.gemsCount.textContent = state.gemsBalance;

        // Update tooltip to show tries remaining
        if (elements.gemsDisplay) {
            elements.gemsDisplay.title = `${state.gemsBalance} gems = ${triesRemaining} lần thử`;
        }
    }

    // Update profile button with avatar (sync with web app style)
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        const avatarUrl = state.profile?.avatar_url;
        const displayName = state.profile?.full_name || state.user?.email?.split('@')[0] || 'Guest';
        const initial = displayName.charAt(0).toUpperCase();
        
        // Greeting based on time
        const hour = new Date().getHours();
        let greeting = 'GOOD MORNING';
        if (hour >= 12 && hour < 18) greeting = 'GOOD AFTERNOON';
        else if (hour >= 18) greeting = 'GOOD EVENING';

        // Badge content (using flag based on locale)
        const flags = {
            'vi': '🇻🇳', 'en': '🇺🇸', 'ja': '🇯🇵', 'ko': '🇰🇷', 
            'zh': '🇨🇳', 'th': '🇹🇭', 'id': '🇮🇩', 'es': '🇪🇸', 'fr': '🇫🇷'
        };
        const flag = flags[state.locale] || '🇻🇳';

        if (state.authenticated && avatarUrl) {
            // Show avatar image + Text
            profileBtn.innerHTML = `
                <div class="profile-avatar-container">
                    <img src="${avatarUrl}" alt="Avatar" class="avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="avatar-fallback" style="display: none;">${initial}</div>
                    <div class="avatar-badge">${flag}</div>
                </div>
                <div class="profile-text-info">
                    <span class="greeting-text">${greeting}</span>
                    <span class="username-text">${displayName}</span>
                </div>
            `;
        } else if (state.authenticated) {
            // Show initial letter + Text
            profileBtn.innerHTML = `
                <div class="profile-avatar-container">
                    <div class="avatar-fallback">${initial}</div>
                    <div class="avatar-badge">${flag}</div>
                </div>
                <div class="profile-text-info">
                    <span class="greeting-text">${greeting}</span>
                    <span class="username-text">${displayName}</span>
                </div>
            `;
        } else {
            // Not authenticated - show Guest
            profileBtn.innerHTML = `
                <div class="profile-avatar-container">
                    <div class="avatar-fallback" style="background: #e0e0e0; color: #757575;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">person</span>
                    </div>
                </div>
                <div class="profile-text-info">
                    <span class="greeting-text">WELCOME</span>
                    <span class="username-text">Guest</span>
                </div>
            `;
        }
        profileBtn.title = state.authenticated ? displayName : t('account');
    }


    // Update model image preview
    if (state.modelImage && elements.modelImage) {
        elements.modelImage.src = state.modelImage;
        elements.modelImage.classList.remove('hidden');
        elements.modelPlaceholder?.classList.add('hidden');
        elements.modelImageContainer?.classList.add('has-image');
    } else if (elements.modelImage) {
        elements.modelImage.classList.add('hidden');
        elements.modelPlaceholder?.classList.remove('hidden');
        elements.modelImageContainer?.classList.remove('has-image');
    }

    // Update selected state in user models grid
    const userModelsGrid = document.getElementById('user-models-grid');
    if (userModelsGrid) {
        userModelsGrid.querySelectorAll('.user-model-item').forEach(item => {
            const isSelected = item.dataset.id === state.selectedModelId;
            item.classList.toggle('selected', isSelected);
        });
    }

    // Update clothing image
    if (state.clothingImage && elements.clothingImage) {
        elements.clothingImage.src = state.clothingImage;
        elements.clothingImage.classList.remove('hidden');
        elements.clothingPlaceholder?.classList.add('hidden');
        elements.clothingImageContainer?.classList.add('has-image');
    } else if (elements.clothingImage) {
        elements.clothingImage.classList.add('hidden');
        elements.clothingPlaceholder?.classList.remove('hidden');
        elements.clothingImageContainer?.classList.remove('has-image');
    }

    // Update try-on button
    const canTryOn = state.modelImage && state.clothingImage && state.gemsBalance >= GEM_COST_STANDARD;
    if (elements.tryOnBtn) {
        elements.tryOnBtn.disabled = !canTryOn || state.isProcessing;

        // Update button text with tries remaining
        const triesRemaining = Math.floor(state.gemsBalance / GEM_COST_STANDARD);
        if (state.modelImage && state.clothingImage && state.gemsBalance < GEM_COST_STANDARD) {
            elements.tryOnBtn.innerHTML = '💎 Cần thêm gems';
        } else {
            elements.tryOnBtn.innerHTML = `✨ Thử đồ ngay <span class="gem-cost">(còn ${triesRemaining} lần)</span>`;
        }
    }

    // Results are now in the gallery section
    updateGalleryUI();
}

function updateGalleryUI() {
    const container = document.getElementById('result-thumbnails');
    if (!container) return;

    if (state.results.length === 0) {
        // Generate Mock Data for Demo if empty
        const mockResults = [
            { id: 101, name: 'Everyday Chic', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', timestamp: Date.now() - 7200000, matchPercentage: 98, isFeatured: false },
            { id: 102, name: 'Office Ready', imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', timestamp: Date.now() - 86400000, matchPercentage: 92, isFeatured: false },
            { id: 103, name: 'Gala Evening', imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', timestamp: Date.now() - 172800000, matchPercentage: 99, isFeatured: true },
            { id: 104, name: 'City Walker', imageUrl: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', timestamp: Date.now() - 259200000, matchPercentage: 88, isFeatured: false }
        ];
        
        container.innerHTML = mockResults.map((result, index) => {
             const isSelected = state.selectedResultIds?.includes(result.id);
             // Default first one selected for demo
             if (index === 0 && (!state.selectedResultIds || state.selectedResultIds.length === 0)) {
                 // isSelected = true; 
             }
             
             return renderGalleryCard(result, isSelected);
        }).join('');
        
        // Add listeners for mock data
        addGalleryCardListeners(container, true);
        return;
    }

    container.innerHTML = state.results.map((result, index) => {
        const isSelected = state.selectedResultIds?.includes(result.id);
        return renderGalleryCard(result, isSelected);
    }).join('');

    // Add event listeners
    addGalleryCardListeners(container, false);

    // Update sticky action bar visibility and text
    updateStickyActionBar();
}

function renderGalleryCard(result, isSelected) {
    const displayName = result.name || `Outfit #${result.id}`;
    const timeAgo = getTimeAgo(result.timestamp);
    const matchPercentage = result.matchPercentage || 95;
    const isFeatured = result.isFeatured || false;

    return `
        <div class="gallery-card" data-id="${result.id}">
            <div class="gallery-card-image-wrapper">
                <img src="${result.imageUrl}" alt="${displayName}" class="gallery-card-image" loading="lazy">
                
                <!-- Selection Checkbox -->
                <div class="card-select-check ${isSelected ? 'selected' : ''}" data-action="toggle-select">
                    ${isSelected ? '<span class="material-symbols-outlined">check</span>' : ''}
                </div>

                <!-- Badges -->
                ${isFeatured ? '<div class="card-feature-badge">★ Featured</div>' : `<div class="card-match-badge">${matchPercentage}% Match</div>`}
            </div>
            
            <div class="gallery-card-content">
                <h3 class="gallery-card-title">${escapeHtml(displayName)}</h3>
                <p class="gallery-card-meta">Created ${timeAgo}</p>
                
                <div class="gallery-card-actions">
                    <button class="card-swap-btn" data-action="open">
                        <span class="material-symbols-outlined" style="font-size: 18px;">sync_alt</span>
                        Swap
                    </button>
                    <button class="card-delete-btn" data-action="delete">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function addGalleryCardListeners(container, isMock) {
    container.querySelectorAll('.gallery-card').forEach(card => {
        const id = parseInt(card.dataset.id);

        // Toggle selection
        card.querySelector('.card-select-check').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleResultSelection(id);
        });

        // Open popup (Swap)
        card.querySelector('[data-action="open"]').addEventListener('click', (e) => {
            e.stopPropagation();
            if(isMock) {
                showToast("Opening swap view...", "info");
            } else {
                openResultPopup(id);
            }
        });

        // Delete
        card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(t('delete') + '?')) {
                if (isMock) {
                    card.remove();
                    showToast("Deleted (Demo)", "success");
                } else {
                    deleteResult(id);
                }
            }
        });
        
        // Click on image
        card.querySelector('.gallery-card-image-wrapper').addEventListener('click', (e) => {
            if (!e.target.closest('.card-select-check')) {
                toggleResultSelection(id);
            }
        });
    });
}

function updateStickyActionBar() {
    const stickyBar = document.querySelector('.gallery-sticky-actions');
    if (!stickyBar) return;

    const selectedCount = state.selectedResultIds?.length || 0;
    const shareBtn = document.getElementById('share-friends-btn');
    
    if (selectedCount > 0) {
        stickyBar.classList.remove('hidden');
        if (shareBtn) {
            shareBtn.innerHTML = `<span class="material-symbols-outlined">ios_share</span> Chia sẻ ${selectedCount} mục`;
        }
    } else {
        // Option to hide or keep visible. Let's keep visible but default action
        // stickyBar.classList.add('hidden');
        if (shareBtn) {
            shareBtn.innerHTML = `<span class="material-symbols-outlined">ios_share</span> Chia sẻ với bạn bè`;
        }
    }
}

function toggleResultSelection(id) {
    if (!state.selectedResultIds) state.selectedResultIds = [];
    
    const index = state.selectedResultIds.indexOf(id);
    if (index === -1) {
        // Limit selection to 2 for comparison share
        if (state.selectedResultIds.length >= 2) {
            state.selectedResultIds.shift(); // Remove oldest
        }
        state.selectedResultIds.push(id);
    } else {
        state.selectedResultIds.splice(index, 1);
    }
    updateGalleryUI();
}

// ==========================================
// SHARE LOOKBOOK LOGIC
// ==========================================

function initShareLookbookEvents() {
    // Open Share View from Gallery
    document.getElementById('share-friends-btn')?.addEventListener('click', () => {
        openShareLookbook();
    });

    // Close Share View
    document.getElementById('close-share-btn')?.addEventListener('click', () => {
        document.getElementById('share-lookbook-section')?.classList.add('hidden');
    });

    // Copy Link
    document.getElementById('copy-link-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText('https://fitly.app/share/x839z'); // Mock link
        showToast('Link copied to clipboard!', 'success');
    });

    // Download Lookbook
    document.getElementById('download-final-btn')?.addEventListener('click', () => {
        downloadLookbookCard();
    });
}

function openShareLookbook() {
    const section = document.getElementById('share-lookbook-section');
    const container = document.getElementById('lookbook-images');
    
    if (!section || !container) return;

    // Get selected results or default to latest
    let selectedResults = [];
    if (state.selectedResultIds && state.selectedResultIds.length > 0) {
        selectedResults = state.results.filter(r => state.selectedResultIds.includes(r.id));
    } else if (state.results.length > 0) {
        selectedResults = [state.results[0]];
    }

    if (selectedResults.length === 0) {
        showToast('No outfits to share', 'warning');
        return;
    }

    // Render Images
    container.innerHTML = selectedResults.map((result, index) => `
        <div class="lookbook-image-wrapper">
            <img src="${result.imageUrl}" class="lookbook-image" alt="Outfit">
            <div class="lookbook-option-label">OPTION ${String.fromCharCode(65 + index)}</div>
        </div>
    `).join('');

    // Reset Caption if needed or keep user edit
    // const caption = document.getElementById('lookbook-caption');
    // if (caption && caption.textContent.trim() === '') {
    //     caption.textContent = "Help me choose the perfect fit for tonight's gala ✨";
    // }

    section.classList.remove('hidden');
}

async function downloadLookbookCard() {
    const card = document.getElementById('lookbook-card');
    if (!card) return;

    showToast('Preparing lookbook...', 'info');

    try {
        // Use html2canvas or similar if available, otherwise mock download source images
        // Since we can't easily add libraries, we'll try to download the source images merged
        // For now, let's just download the first image as a fallback demo
        const img = card.querySelector('img');
        if (img) {
            const link = document.createElement('a');
            link.href = img.src;
            link.download = 'my-lookbook.png';
            link.click();
            showToast('Lookbook downloaded!', 'success');
        }
    } catch (e) {
        console.error(e);
        showToast('Could not download lookbook', 'error');
    }
}

// Add init call
initShareLookbookEvents();

function renderResultThumbnails() {
    // Legacy function redirect
    updateGalleryUI();
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Rename a result
function renameResult(id) {
    const result = state.results.find(r => r.id === id);
    if (!result) return;

    const resultIndex = state.results.findIndex(r => r.id === id) + 1;
    const currentName = result.name || `Kết quả #${resultIndex}`;

    const newName = prompt('Đặt tên cho kết quả này:', currentName);

    if (newName !== null) {
        const trimmedName = newName.trim();
        result.name = trimmedName || null; // null if empty to use default

        // Update UI
        renderResultThumbnails();

        // Update popup on webpage if open
        if (state.activePopups.includes(id)) {
            sendToActiveTab({
                type: 'UPDATE_POPUP_NAME',
                data: { id, name: trimmedName || `Kết quả #${resultIndex}` }
            });
        }

        showToast(trimmedName ? `Đã đổi tên thành "${trimmedName}"` : 'Đã xóa tên tùy chỉnh', 'success');
    }
}

function addResult(imageUrl, clothingUrl, modelUrl, sourceUrl = null) {
    const result = {
        id: state.nextResultId++,
        name: null, // User can set custom name
        imageUrl,
        clothingUrl,
        modelUrl,
        sourceUrl: sourceUrl || state.clothingSourceUrl, // Link to product page
        timestamp: Date.now()
    };

    state.results.unshift(result); // Add to beginning
    saveResults(); // Persist changes
    state.resultImage = imageUrl; // Keep for backward compatibility
    state.currentResultId = result.id; // Track current result for inline actions

    // Show result inline in sidebar
    showResultInline(result);

    // Also open popup for easy comparison (outside extension)
    // Multiple popups can be opened side-by-side for outfit comparison
    openResultPopup(result.id);

    // Update thumbnails
    updateGalleryUI();

    return result;
}


/**
 * Show result inline in sidebar (inspired by FitlyExt extension)
 * @param {object} result - Result object with id, imageUrl, sourceUrl, etc.
 */
function showResultInline(result) {
    if (!result || !result.imageUrl) return;

    const section = $('inline-result-section');
    const image = $('inline-result-image');
    const reportBtn = $('report-wrong-btn');

    if (!section || !image) {
        console.warn('[Fitly] Inline result elements not found');
        return;
    }

    // Set image
    image.src = result.imageUrl;
    image.alt = result.name || `Kết quả #${result.id}`;

    // Reset report button state
    if (reportBtn) {
        reportBtn.disabled = false;
        reportBtn.textContent = t('report_wrong_btn');
    }

    // Show section
    section.classList.remove('hidden');

    // Scroll to result section
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    console.log('[Fitly] Showing result inline:', result.id);
}

/**
 * Hide inline result section
 */
function hideResultInline() {
    const section = $('inline-result-section');
    if (section) {
        section.classList.add('hidden');
    }
}

// ==========================================
// INLINE RESULT ACTIONS
// ==========================================

/**
 * Handle result download
 */
async function handleResultDownload() {
    const resultImage = $('inline-result-image');
    if (!resultImage?.src) {
        showToast(t('no_image_to_download'), 'error');
        return;
    }

    try {
        const response = await fetch(resultImage.src);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `fitly-tryon-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(t('image_downloaded'), 'success');
    } catch (error) {
        console.error('[Fitly] Download error:', error);
        // Fallback - direct download
        const link = document.createElement('a');
        link.href = resultImage.src;
        link.download = `fitly-tryon-${Date.now()}.png`;
        link.click();
    }
}

/**
 * Handle result copy to clipboard
 */
async function handleResultCopy() {
    const resultImage = $('inline-result-image');
    if (!resultImage?.src) {
        showToast(t('no_image_to_copy'), 'error');
        return;
    }

    try {
        const response = await fetch(resultImage.src);
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        showToast(t('image_copied'), 'success');
    } catch (error) {
        console.error('[Fitly] Copy error:', error);
        // Fallback: Copy URL
        try {
            await navigator.clipboard.writeText(resultImage.src);
            showToast(t('link_copied'), 'success');
        } catch (e) {
            showToast(t('cannot_copy'), 'error');
        }
    }
}

/**
 * Handle save result to wardrobe
 */
async function handleResultSave() {
    const resultImage = $('inline-result-image');
    if (!resultImage?.src) {
        showToast(t('no_image_to_save'), 'error');
        return;
    }

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'SAVE_TO_WARDROBE',
            data: {
                imageUrl: resultImage.src,
                type: 'tryon_result'
            }
        });

        if (response?.success) {
            showToast(t('saved_to_wardrobe'), 'success');
        } else {
            showToast(response?.error || t('save_error'), 'error');
        }
    } catch (error) {
        console.error('[Fitly] Save error:', error);
        showToast(t('error_occurred'), 'error');
    }
}

/**
 * Handle share result
 */
async function handleResultShare() {
    const resultImage = $('inline-result-image');
    const currentResult = state.results.find(r => r.id === state.currentResultId);
    const sourceUrl = currentResult?.sourceUrl || state.clothingSourceUrl;

    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Fitly - Thử đồ ảo',
                text: 'Xem tôi thử đồ này! 👕',
                url: sourceUrl || window.location.href
            });
            showToast(t('shared_success'), 'success');
        } else {
            // Fallback: copy URL
            await navigator.clipboard.writeText(sourceUrl || window.location.href);
            showToast(t('product_link_copied'), 'success');
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('[Fitly] Share error:', error);
            showToast(t('cannot_share'), 'error');
        }
    }
}

/**
 * Handle use result as model
 */
async function handleUseResultAsModel() {
    const resultImage = $('inline-result-image');
    if (!resultImage?.src) {
        showToast(t('no_image'), 'error');
        return;
    }

    try {
        showToast(t('saving_as_model'), 'info');

        // Add as user model
        await addUserModel(resultImage.src, 'tryon_result');

        // Also set as current model
        state.modelImage = resultImage.src;

        updateUI();
        showToast(t('model_saved'), 'success');

        // Hide result section and scroll to model section
        hideResultInline();
        elements.modelImageContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('[Fitly] Use as model error:', error);
        showToast(t('error_occurred'), 'error');
    }
}

/**
 * Handle edit result with AI
 */
async function handleResultEdit() {
    const editInput = $('inline-edit-input');
    const editBtn = $('inline-edit-btn');
    const resultImage = $('inline-result-image');
    const editRequest = editInput?.value?.trim();

    if (!editRequest) {
        showToast(t('enter_edit_prompt'), 'error');
        editInput?.focus();
        return;
    }

    if (!resultImage?.src) {
        showToast(t('no_image_to_edit'), 'error');
        return;
    }

    const originalBtnContent = editBtn?.innerHTML;

    try {
        // Show loading
        if (editBtn) {
            editBtn.disabled = true;
            editBtn.innerHTML = '<span class="edit-spinner"></span>';
        }
        showToast(t('editing_image'), 'info');

        const response = await chrome.runtime.sendMessage({
            type: 'EDIT_IMAGE',
            data: {
                imageUrl: resultImage.src,
                editRequest: editRequest
            }
        });

        if (response?.success && response?.resultImage) {
            resultImage.src = response.resultImage;
            editInput.value = '';
            showToast(t('edit_success'), 'success');

            // Update in results array
            if (state.currentResultId) {
                const result = state.results.find(r => r.id === state.currentResultId);
                if (result) {
                    result.imageUrl = response.resultImage;
                    renderResultThumbnails();
                }
            }
        } else {
            showToast('❌ ' + (response?.error || 'Lỗi khi chỉnh sửa'), 'error');
        }
    } catch (error) {
        console.error('[Fitly] Edit error:', error);
        showToast(t('edit_error'), 'error');
    } finally {
        if (editBtn) {
            editBtn.disabled = false;
            editBtn.innerHTML = originalBtnContent;
        }
    }
}

/**
 * Handle report wrong image (refund gems)
 */
async function handleReportWrong() {
    const reportBtn = $('report-wrong-btn');

    if (reportBtn?.disabled) return;

    try {
        // Disable button immediately
        if (reportBtn) {
            reportBtn.disabled = true;
            reportBtn.textContent = '⏳...';
        }

        // Request refund
        const response = await chrome.runtime.sendMessage({
            type: 'REFUND_GEMS',
            data: {
                reason: 'User reported wrong image',
                amount: GEM_COST_STANDARD
            }
        });

        if (response?.success) {
            // Update gems balance
            if (response.newBalance !== undefined) {
                state.gemsBalance = response.newBalance;
            } else {
                state.gemsBalance += GEM_COST_STANDARD;
            }

            updateUI();
            showToast(t('refund_success'), 'success');

            if (reportBtn) {
                reportBtn.textContent = t('report_done_btn');
            }
        } else {
            showToast(response?.error || t('error_occurred'), 'error');
            if (reportBtn) {
                reportBtn.disabled = false;
                reportBtn.textContent = t('report_wrong_btn');
            }
        }
    } catch (error) {
        console.error('[Fitly] Report wrong error:', error);
        showToast(t('error_occurred'), 'error');
        if (reportBtn) {
            reportBtn.disabled = false;
            reportBtn.textContent = t('report_wrong_btn');
        }
    }
}


function deleteResult(id) {
    // Close popup if open
    closeResultPopup(id);

    // Remove from results
    state.results = state.results.filter(r => r.id !== id);
    saveResults(); // Persist changes

    updateGalleryUI();
    showToast(t('result_deleted'), 'success');
}

function clearAllResults() {
    if (!confirm(t('clear_all') + '?')) return;

    // Send close message to content script to close all floating popups
    sendToActiveTab({ type: 'CLOSE_ALL_POPUPS' });

    state.activePopups = [];
    state.results = [];
    state.resultImage = null;

    updateGalleryUI();
    showToast(t('all_results_deleted'), 'success');
}

function openResultPopup(id) {
    const result = state.results.find(r => r.id === id);
    if (!result) return;

    const resultIndex = state.results.findIndex(r => r.id === id) + 1;
    const displayName = result.name || `Result #${resultIndex}`;

    // Check if popup window already exists for this result
    if (state.popupWindows && state.popupWindows.has(id)) {
        const windowId = state.popupWindows.get(id);
        // Try to focus existing window
        chrome.windows.update(windowId, { focused: true }).catch(() => {
            // Window was closed externally, remove from tracking and re-open
            state.popupWindows.delete(id);
            openResultPopup(id);
        });
        return;
    }

    // Build popup URL with query params
    const popupUrl = chrome.runtime.getURL('popup/result-popup.html') +
        `?imageUrl=${encodeURIComponent(result.imageUrl || '')}` +
        `&name=${encodeURIComponent(displayName)}` +
        `&sourceUrl=${encodeURIComponent(result.sourceUrl || '')}` +
        `&modelUrl=${encodeURIComponent(result.modelUrl || '')}` +
        `&id=${encodeURIComponent(id)}`;

    // Create independent browser window — survives tab switch/close
    chrome.windows.create({
        url: popupUrl,
        type: 'popup',
        width: 420,
        height: 650,
        focused: true
    }).then(popupWindow => {
        // Track window ID for this result
        if (!state.popupWindows) state.popupWindows = new Map();
        state.popupWindows.set(id, popupWindow.id);

        // Add to active popups tracker
        if (!state.activePopups.includes(id)) {
            state.activePopups.push(id);
        }

        renderResultThumbnails();
        console.log('[Fitly] Popup window created:', displayName, 'windowId:', popupWindow.id);
    }).catch(error => {
        console.error('[Fitly] Failed to create popup window:', error);
        showToast(t('cannot_open_popup'), 'error');
    });
}



// Open product page in new tab
function openProductPage(url) {
    if (!url || !url.startsWith('http')) {
        showToast(t('no_product_link'), 'error');
        return;
    }

    chrome.tabs.create({ url });
    showToast(t('opening_product'), 'success');
}

// Copy result image to clipboard
async function copyResultImage(imageUrl) {
    try {
        showToast(t('copying_image'), 'info');

        // Fetch image as blob
        const response = await fetch(imageUrl);
        let blob = await response.blob();

        // Convert to PNG if needed
        if (blob.type !== 'image/png') {
            blob = await convertImageToPng(blob);
        }

        // Copy to clipboard
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]);

        showToast(t('copied_to_clipboard'), 'success');
    } catch (error) {
        console.error('Copy image error:', error);

        // Fallback: copy URL
        try {
            await navigator.clipboard.writeText(imageUrl);
            showToast(t('link_copied'), 'warning');
        } catch (e) {
            showToast(t('cannot_copy'), 'error');
        }
    }
}

// Convert image blob to PNG
function convertImageToPng(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((pngBlob) => {
                URL.revokeObjectURL(img.src);
                if (pngBlob) {
                    resolve(pngBlob);
                } else {
                    reject(new Error('Failed to convert to PNG'));
                }
            }, 'image/png');
        };
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image'));
        };
        img.src = URL.createObjectURL(blob);
    });
}

// Helper function to send message to active tab's content script
async function sendToActiveTab(message) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            await chrome.tabs.sendMessage(tab.id, message);
        }
    } catch (error) {
        console.error('Failed to send to active tab:', error);
        showToast(t('cannot_open_popup'), 'error');
    }
}

function closeResultPopup(id) {
    // Close the popup window if it exists
    if (state.popupWindows && state.popupWindows.has(id)) {
        const windowId = state.popupWindows.get(id);
        chrome.windows.remove(windowId).catch(() => { });
        state.popupWindows.delete(id);
    }

    // Also try closing content script popup (backward compat)
    sendToActiveTab({
        type: 'CLOSE_RESULT_POPUP',
        data: { id: id }
    }).catch(() => { });

    // Remove from active popups list
    state.activePopups = state.activePopups.filter(pId => pId !== id);
    renderResultThumbnails();
}

// Listen for popup windows being closed by user
chrome.windows.onRemoved.addListener((windowId) => {
    if (!state.popupWindows) return;
    for (const [resultId, wId] of state.popupWindows.entries()) {
        if (wId === windowId) {
            state.popupWindows.delete(resultId);
            state.activePopups = state.activePopups.filter(pId => pId !== resultId);
            renderResultThumbnails();
            console.log('[Fitly] Popup window closed by user:', resultId);
            break;
        }
    }
});

// Popup actions are now handled by the popup window itself


async function downloadResultImage(imageUrl) {
    try {
        if (imageUrl.startsWith('data:')) {
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `fitly - tryon - ${Date.now()}.png`;
            link.click();
        } else {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `fitly - tryon - ${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        }
        showToast(t('downloading'), 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast(t('cannot_download'), 'error');
    }
}

async function shareResultImage(imageUrl) {
    if (navigator.share) {
        try {
            let blob;
            if (imageUrl.startsWith('data:')) {
                const response = await fetch(imageUrl);
                blob = await response.blob();
            } else {
                const response = await fetch(imageUrl);
                blob = await response.blob();
            }

            const file = new File([blob], 'fitly-tryon.png', { type: 'image/png' });
            await navigator.share({
                title: 'Fitly Virtual Try-On',
                text: 'Xem outfit của tôi!',
                files: [file]
            });
        } catch (error) {
            if (error.name !== 'AbortError') {
                await navigator.clipboard.writeText(imageUrl);
                showToast(t('link_copied'), 'success');
            }
        }
    } else {
        await navigator.clipboard.writeText(imageUrl);
        showToast(t('link_copied'), 'success');
    }
}

async function saveResultOutfit(result) {
    showLoading(true, t('processing'));

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'SAVE_OUTFIT',
            data: {
                name: `Outfit ${new Date().toLocaleDateString('vi-VN')} `,
                result_image_url: result.imageUrl,
                clothing_image_url: result.clothingUrl,
                model_image_url: result.modelUrl
            }
        });

        if (response.success) {
            showToast(t('outfit_saved'), 'success');
        } else {
            showToast(t('outfit_save_error') + ': ' + (response.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Save outfit error:', error);
        showToast(t('outfit_save_error'), 'error');
    } finally {
        showLoading(false);
    }
}

// Loading messages - use imported LOADING_MESSAGES from i18n
// (Already imported above)

let loadingMessageInterval = null;
let loadingMessageIndex = 0;

function showLoading(show, text = null) {
    state.isProcessing = show;

    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.toggle('hidden', !show);
    }

    if (show) {
        // If specific text provided, show it and don't rotate
        if (text && elements.loadingText) {
            elements.loadingText.textContent = text;
            // Clear any existing interval
            if (loadingMessageInterval) {
                clearInterval(loadingMessageInterval);
                loadingMessageInterval = null;
            }
        } else {
            // Start rotating messages
            loadingMessageIndex = 0;
            updateLoadingMessage();
            loadingMessageInterval = setInterval(() => {
                loadingMessageIndex++;
                updateLoadingMessage();
            }, 2500);
        }

        // Update tip text based on locale
        const tipElement = document.getElementById('loading-tip');
        if (tipElement) {
            tipElement.textContent = '💡 ' + t('loading_tip');
        }
    } else {
        // Stop rotating messages
        if (loadingMessageInterval) {
            clearInterval(loadingMessageInterval);
            loadingMessageInterval = null;
        }
    }

    updateUI();
}

function updateLoadingMessage() {
    // Use getLoadingMessage from i18n module
    if (elements.loadingText) {
        if (getLoadingMessage) {
            elements.loadingText.textContent = getLoadingMessage(loadingMessageIndex, state.locale);
        } else {
            // Fallback messages
            const fallbackMessages = [
                'Đang tìm phong cách hoàn hảo... ✨',
                'AI stylist đang làm phép... 🪄',
                'Sắp xong rồi, đẹp lắm! 💫',
            ];
            elements.loadingText.textContent = fallbackMessages[loadingMessageIndex % fallbackMessages.length];
        }
    }
}

function updateProgress(percent) {
    if (elements.loadingProgressBar) {
        elements.loadingProgressBar.style.width = `${percent}% `;
    }

    // Update progress text
    const progressText = document.getElementById('loading-progress-text');
    if (progressText) {
        progressText.textContent = percent > 0 ? `${Math.round(percent)}% ` : '...';
    }
}

function showErrorOverlay(show, message = null) {
    if (elements.errorOverlay) {
        elements.errorOverlay.classList.toggle('hidden', !show);
        
        if (show && message && elements.errorMessageText) {
            elements.errorMessageText.textContent = message;
        }
    }
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type} `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}


// ==========================================
// AUTH ACTIONS
// ==========================================

async function handleSocialLogin(provider) {
    console.log(`[Fitly] Social login with ${provider}`);
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    
    showLoading(true, `Đang kết nối với ${providerName}...`);
    
    // Simulate API call / Popup delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock success
    state.authenticated = true;
    state.user = { 
        email: `user@${provider}.com`,
        user_metadata: {
            display_name: `User ${providerName}`,
            avatar_url: null
        }
    };
    // Mock profile with random avatar
    state.profile = { 
        full_name: `Fitly User`, 
        gems_balance: 50,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider}`
    };
    state.gemsBalance = 50;
    
    showMainContent();
    updateUI();
    showLoading(false);
    showToast(`Đăng nhập ${providerName} thành công!`, 'success');
}

async function handleLogout() {
    if(!confirm('Bạn có chắc chắn muốn đăng xuất?')) return;
    
    showLoading(true, 'Đang đăng xuất...');
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    state.authenticated = false;
    state.user = null;
    state.profile = null;
    state.gemsBalance = 0;
    
    showAuthSection();
    updateUI();
    showLoading(false);
    showToast('Đã đăng xuất thành công', 'info');
    
    // Close profile menu if open
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu) profileMenu.classList.add('hidden');
}

// ==========================================
// EVENT LISTENERS
// ==========================================

function setupEventListeners() {
    // Error Overlay Actions
    elements.errorRetryBtn?.addEventListener('click', () => {
        showErrorOverlay(false);
        // Retry logic: if both images are present, retry
        if (state.modelImage && state.clothingImage) {
            quickTryClothing(state.clothingImage, state.clothingSourceUrl);
        }
    });

    elements.errorCloseBtn?.addEventListener('click', () => {
        showErrorOverlay(false);
    });

    // Login with Google - opens popup window (không dùng overlay vì hay bị CSP block)
    elements.loginGoogleBtn?.addEventListener('click', async () => {
        handleSocialLogin('google');
    });

    // Facebook & Apple buttons
    document.querySelector('.social-btn.facebook')?.addEventListener('click', () => handleSocialLogin('facebook'));
    document.querySelector('.social-btn.apple')?.addEventListener('click', () => handleSocialLogin('apple'));

    // Auth Tabs Switching
    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            authTabs.forEach(t => t.classList.remove('active'));
            // Add active to clicked tab
            tab.classList.add('active');

            // Show corresponding form
            const target = tab.dataset.tab; // 'login' or 'register'
            document.getElementById('login-form').classList.toggle('hidden', target !== 'login');
            document.getElementById('register-form').classList.toggle('hidden', target !== 'register');
        });
    });

    // Profile Dropdown Toggle
    elements.profileBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('profile-menu');
        menu?.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('profile-menu');
        const btn = document.getElementById('profile-btn');
        if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !btn?.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

    // Logout
    document.getElementById('menu-logout')?.addEventListener('click', handleLogout);

    // Password Toggle
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = 'visibility';
            } else {
                input.type = 'password';
                this.textContent = 'visibility_off';
            }
        });
    });

    // Forgot Password
    document.querySelector('.forgot-password')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast(t('check_email_reset'), 'info');
    });

    // Form Submissions (Mock)
    document.querySelectorAll('.auth-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            
            btn.disabled = true;
            btn.textContent = t('processing') + '...';

            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = originalText;
                // Mock login success
                state.authenticated = true;
                state.user = { email: 'user@example.com' };
                state.profile = { full_name: 'Fitly User', gems_balance: 10 };
                state.gemsBalance = 10;
                showMainContent();
                updateUI();
                showToast(t('login_success'), 'success');
            }, 1500);
        });
    });

    // Skip Login - use without signing in (demo/guest mode)
    const skipLoginBtn = document.getElementById('skip-login-btn');
    skipLoginBtn?.addEventListener('click', async () => {
        // Enable guest/demo mode via service worker
        try {
            const response = await chrome.runtime.sendMessage({ type: 'ENABLE_GUEST_MODE' });
            if (response?.success) {
                state.authenticated = false;
                state.gemsBalance = response.gemsBalance || 3;
                showMainContent();
                updateUI();
                showToast(t('demo_mode_toast', { count: state.gemsBalance }), 'info');
            } else {
                showToast(t('cannot_enable_demo'), 'error');
            }
        } catch (error) {
            console.error('Enable guest mode error:', error);
            // Fallback - still allow access
            state.authenticated = false;
            state.gemsBalance = 3;
            showMainContent();
            updateUI();
            showToast(t('demo_mode_toast', { count: 3 }), 'info');
        }
    });

    // Profile button — toggle dropdown menu
    elements.profileBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfileMenu();
    });

    // Gems display - show purchase panel
    elements.gemsDisplay?.addEventListener('click', () => {
        toggleGemsPanel();
    });

    // Language button
    const languageBtn = document.getElementById('language-btn');
    languageBtn?.addEventListener('click', () => {
        toggleLanguagePanel();
    });

    // Close gems panel
    const closeGemsPanel = document.getElementById('close-gems-panel');
    closeGemsPanel?.addEventListener('click', () => {
        hideGemsPanel();
    });

    // Close language panel
    const closeLanguagePanel = document.getElementById('close-language-panel');
    closeLanguagePanel?.addEventListener('click', () => {
        hideLanguagePanel();
    });

    // Gem packages
    const gemPackages = document.querySelectorAll('.gem-package');
    gemPackages.forEach(pkg => {
        pkg.addEventListener('click', () => {
            const packageId = pkg.dataset.package;
            purchaseGems(packageId);
        });
    });

    // Language options
    const languageOptions = document.querySelectorAll('.language-option');
    languageOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const lang = opt.dataset.lang;
            changeLanguage(lang);
        });
    });

    // Upload model button (removed)
    // const uploadModelBtn = document.getElementById('upload-model-btn');
    // uploadModelBtn?.addEventListener('click', () => {
    //     elements.modelUploadInput?.click();
    // });


    // Model image container click - open upload if no image
    elements.modelImageContainer?.addEventListener('click', () => {
        if (!state.modelImage) {
            elements.modelUploadInput?.click();
        }
    });

    // Handle model image upload
    elements.modelUploadInput?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate
        if (file.size > 10 * 1024 * 1024) {
            showToast(t('image_too_large'), 'error');
            return;
        }

        if (!file.type.startsWith('image/')) {
            showToast(t('select_image_file'), 'error');
            return;
        }

        // Read and save
        const reader = new FileReader();
        reader.onload = async (event) => {
            const imageUrl = event.target.result;

            // Add to user models
            const added = await addUserModel(imageUrl, 'upload');

            if (added) {
                state.modelImage = imageUrl;
                updateUI();
                showToast(t('photo_added_success'), 'success');
            }
        };
        reader.readAsDataURL(file);

        // Reset input
        e.target.value = '';
    });

    // Clothing - paste URL
    elements.pasteUrlBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        handlePasteUrl();
    });

    // Clear clothing history
    const clearClothingHistoryBtn = document.getElementById('clear-clothing-history');
    clearClothingHistoryBtn?.addEventListener('click', clearClothingHistory);

    // Clear all results
    elements.clearAllResults?.addEventListener('click', clearAllResults);

    // Gallery / Collection View
    document.getElementById('view-all-results-btn')?.addEventListener('click', () => {
        openGallery();
    });

    document.getElementById('close-gallery-btn')?.addEventListener('click', () => {
        closeGallery();
    });

    // Clothing container click - chọn ảnh từ web
    elements.clothingImageContainer?.addEventListener('click', () => {
        if (!state.clothingImage) {
            startImageSelection();
        }
    });

    // Clear clothing image on double click when has image
    elements.clothingImageContainer?.addEventListener('dblclick', () => {
        if (state.clothingImage) {
            state.clothingImage = null;
            updateUI();
            showToast(t('clothing_removed'));
        }
    });

    // Try on
    // Try on
    elements.tryOnBtn?.addEventListener('click', (e) => processTryOn(e));

    // Result actions are now handled by the popup system

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Don't trigger if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // V to paste URL (without Ctrl)
        if (e.key === 'v' || e.key === 'V') {
            e.preventDefault();
            handlePasteUrl();
        }
        // T to try on (same as Enter but more intuitive)
        if ((e.key === 't' || e.key === 'T') && state.modelImage && state.clothingImage && !state.isProcessing) {
            e.preventDefault();
            processTryOn();
        }
        // Enter to try on
        if (e.key === 'Enter' && state.modelImage && state.clothingImage && !state.isProcessing) {
            processTryOn();
        }
        // Escape to close active popup
        if (e.key === 'Escape' && state.activePopups.length > 0) {
            const lastPopupId = state.activePopups[state.activePopups.length - 1];
            closeResultPopup(lastPopupId);
        }
        // C to copy latest result
        if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && state.results.length > 0) {
            e.preventDefault();
            copyResultImage(state.results[0].imageUrl);
        }
        // R to rename latest result or active popup
        if ((e.key === 'r' || e.key === 'R') && state.results.length > 0) {
            e.preventDefault();
            const activeId = state.activePopups.length > 0
                ? state.activePopups[state.activePopups.length - 1]
                : state.results[0].id;
            renameResult(activeId);
        }
        // 1-9 to open result popup
        if (e.key >= '1' && e.key <= '9') {
            const index = parseInt(e.key) - 1;
            if (state.results[index]) {
                e.preventDefault();
                openResultPopup(state.results[index].id);
            }
        }
    });

    // ==========================================
    // INLINE RESULT ACTION BUTTONS
    // ==========================================

    // Download button
    const downloadBtn = document.getElementById('result-download-btn');
    downloadBtn?.addEventListener('click', () => handleResultDownload());

    // Copy button
    const copyBtn = document.getElementById('result-copy-btn');
    copyBtn?.addEventListener('click', () => handleResultCopy());

    // Save to wardrobe button
    const saveBtn = document.getElementById('result-save-btn');
    saveBtn?.addEventListener('click', () => handleResultSave());

    // Share button
    const shareBtn = document.getElementById('result-share-btn');
    shareBtn?.addEventListener('click', () => handleResultShare());

    // Use as model button
    const useModelBtn = document.getElementById('result-use-model-btn');
    useModelBtn?.addEventListener('click', () => handleUseResultAsModel());

    // Open popup button - still allow opening in separate window
    const popupBtn = document.getElementById('result-popup-btn');
    popupBtn?.addEventListener('click', () => {
        if (state.currentResultId) {
            openResultPopup(state.currentResultId);
        } else if (state.results.length > 0) {
            openResultPopup(state.results[0].id);
        }
    });

    // Edit button
    const editBtn = document.getElementById('inline-edit-btn');
    editBtn?.addEventListener('click', () => handleResultEdit());

    // Edit input - submit on Enter
    const editInput = document.getElementById('inline-edit-input');
    editInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleResultEdit();
        }
    });

    // Edit suggestion buttons
    const suggestionBtns = document.querySelectorAll('.edit-suggestion-btn');
    suggestionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const suggestion = btn.dataset.suggestion;
            if (suggestion && editInput) {
                editInput.value = suggestion;
                editInput.focus();
            }
        });
    });

    // Report wrong button
    const reportBtn = document.getElementById('report-wrong-btn');
    reportBtn?.addEventListener('click', () => handleReportWrong());

    // Setup drag & drop for images
    setupDragAndDrop();
}

// ==========================================
// DRAG & DROP
// ==========================================

function setupDragAndDrop() {
    const dropZones = [
        { element: elements.modelImageContainer, type: 'model' },
        { element: elements.clothingImageContainer, type: 'clothing' }
    ];

    // Global drag indicator
    let dragOverlay = null;

    // Create overlay for drag feedback
    function createDragOverlay() {
        if (dragOverlay) return dragOverlay;

        dragOverlay = document.createElement('div');
        dragOverlay.className = 'drag-overlay';
        dragOverlay.innerHTML = `
    < div class="drag-content" >
                <span class="drag-icon">📸</span>
                <span class="drag-text">Thả ảnh vào đây</span>
            </div >
    `;
        return dragOverlay;
    }

    // Handle drag events on body (for global drop)
    document.body.addEventListener('dragenter', (e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();

        const overlay = createDragOverlay();
        if (!document.body.contains(overlay)) {
            document.body.appendChild(overlay);
        }
        overlay.classList.add('active');
    });

    document.body.addEventListener('dragleave', (e) => {
        if (e.relatedTarget && document.body.contains(e.relatedTarget)) return;
        if (dragOverlay) {
            dragOverlay.classList.remove('active');
        }
    });

    document.body.addEventListener('dragover', (e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    document.body.addEventListener('drop', async (e) => {
        e.preventDefault();

        if (dragOverlay) {
            dragOverlay.classList.remove('active');
        }

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        const file = files[0];
        if (!file.type.startsWith('image/')) {
            showToast(t('drop_image_file'), 'error');
            return;
        }

        // Determine drop target based on position or current state
        const dropY = e.clientY;
        const bodyRect = document.body.getBoundingClientRect();
        const isTopHalf = dropY < bodyRect.height / 2;

        // If dropped on top half or no clothing yet, treat as clothing
        // If we have no model, treat as model
        let targetType = 'clothing';

        if (!state.modelImage) {
            targetType = 'model';
        } else if (isTopHalf && state.modelImage) {
            // Check if near model container
            const modelRect = elements.modelImageContainer?.getBoundingClientRect();
            if (modelRect && dropY < modelRect.bottom + 50) {
                targetType = 'model';
            }
        }

        await handleDroppedImage(file, targetType);
    });

    // Setup individual drop zones
    dropZones.forEach(({ element, type }) => {
        if (!element) return;

        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');

            if (dragOverlay) {
                dragOverlay.classList.remove('active');
            }

            const files = e.dataTransfer.files;
            if (files.length === 0) return;

            const file = files[0];
            if (!file.type.startsWith('image/')) {
                showToast(t('drop_image_file'), 'error');
                return;
            }

            await handleDroppedImage(file, type);
        });
    });
}

async function handleDroppedImage(file, type) {
    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
        showToast(t('image_too_large'), 'error');
        return;
    }

    showToast(`📸 Đang xử lý ảnh...`, 'info');

    try {
        const imageUrl = await fileToDataUrl(file);

        if (type === 'model') {
            // Add to user models
            const added = await addUserModel(imageUrl, 'drag-drop');
            if (added) {
                state.modelImage = imageUrl;
                updateUI();
                showToast(t('model_photo_added'), 'success');
            }
        } else {
            // Set as clothing
            state.clothingImage = imageUrl;
            state.clothingSourceUrl = null;
            updateUI();
            showToast(t('clothing_photo_added'), 'success');

            // Auto try-on if ready
            if (state.modelImage && state.gemsBalance >= GEM_COST_STANDARD) {
                setTimeout(() => {
                    showToast(t('press_t_to_try'), 'info');
                }, 1500);
            }
        }
    } catch (error) {
        console.error('Drop image error:', error);
        showToast(t('cannot_read_image'), 'error');
    }
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ==========================================
// IMAGE HANDLING
// ==========================================

async function handlePasteUrl() {
    try {
        const url = await navigator.clipboard.readText();
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            await validateAndSetClothingImage(url.trim());
        } else {
            showToast(t('invalid_url'), 'error');
        }
    } catch (error) {
        // Fallback: prompt with instructions
        const url = prompt('Dán URL ảnh quần áo:\n\n💡 Mẹo: Chuột phải vào ảnh → Copy image address');
        if (url && url.trim()) {
            if (url.startsWith('http')) {
                await validateAndSetClothingImage(url.trim());
            } else {
                showToast(t('invalid_url_short'), 'error');
            }
        }
    }
}

// Validate image URL before setting
async function validateAndSetClothingImage(url) {
    showToast(t('checking_image'), 'info');

    try {
        const isValid = await testImageLoadable(url);

        if (isValid) {
            state.clothingImage = url;
            updateUI();
            showToast(t('image_added_success'), 'success');
        } else {
            // Show options modal
            showImageErrorModal(url);
        }
    } catch (error) {
        console.error('Image validation error:', error);
        showImageErrorModal(url);
    }
}

// Test if image can be loaded
function testImageLoadable(url) {
    return new Promise((resolve) => {
        const img = new Image();

        const timeout = setTimeout(() => {
            resolve(false);
        }, 8000);

        img.onload = () => {
            clearTimeout(timeout);
            resolve(true);
        };

        img.onerror = () => {
            clearTimeout(timeout);
            // Some images block direct loading but work through API
            // Still resolve true to let user try
            resolve(true);
        };

        img.src = url;
    });
}

// Show error modal with options
function showImageErrorModal(url) {
    // Remove existing modal
    const existing = document.querySelector('.image-error-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'image-error-modal';
    modal.innerHTML = `
    < div class="modal-backdrop" ></div >
        <div class="modal-content">
            <div class="modal-header">
                <span class="modal-icon">😅</span>
                <h3>Không thể tải ảnh này</h3>
            </div>
            <p>Trang web có thể đang chặn việc lấy ảnh trực tiếp. Đây là điều phổ biến với các trang thương mại điện tử.</p>
            <div class="modal-suggestion">
                <strong>💡 Gợi ý:</strong>
                <ol>
                    <li>Lưu ảnh về máy (Chuột phải → Save image as...)</li>
                    <li>Sau đó bấm "+ Tải ảnh" để tải lên</li>
                </ol>
            </div>
            <div class="modal-actions">
                <button class="modal-btn primary" data-action="use-anyway">Vẫn thử dùng URL này</button>
                <button class="modal-btn secondary" data-action="retry">Thử URL khác</button>
                <button class="modal-btn tertiary" data-action="close">Đóng</button>
            </div>
        </div>
`;
    document.body.appendChild(modal);

    // Add styles if not exist
    if (!document.getElementById('error-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'error-modal-styles';
        styles.textContent = `
    .image - error - modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z - index: 10000;
    display: flex;
    align - items: center;
    justify - content: center;
}
            .image - error - modal.modal - backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop - filter: blur(4px);
}
            .image - error - modal.modal - content {
    position: relative;
    background: var(--card);
    border: 1px solid var(--border);
    border - radius: 20px;
    padding: 24px;
    max - width: 340px;
    width: 90 %;
    animation: modalIn 0.2s ease;
}
@keyframes modalIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
}
            .image - error - modal.modal - header {
    display: flex;
    align - items: center;
    gap: 12px;
    margin - bottom: 12px;
}
            .image - error - modal.modal - icon {
    font - size: 28px;
}
            .image - error - modal.modal - header h3 {
    color: var(--text - primary);
    font - size: 16px;
    font - weight: 600;
    margin: 0;
}
            .image - error - modal p {
    color: var(--text - secondary);
    font - size: 13px;
    line - height: 1.5;
    margin: 0 0 16px;
}
            .image - error - modal.modal - suggestion {
    background: rgba(249, 115, 22, 0.1);
    border: 1px solid rgba(249, 115, 22, 0.3);
    border - radius: 12px;
    padding: 12px 14px;
    margin - bottom: 16px;
}
            .image - error - modal.modal - suggestion strong {
    color: var(--primary - start);
    font - size: 12px;
    display: block;
    margin - bottom: 6px;
}
            .image - error - modal.modal - suggestion ol {
    color: var(--text - secondary);
    font - size: 12px;
    margin: 0;
    padding - left: 18px;
    line - height: 1.7;
}
            .image - error - modal.modal - actions {
    display: flex;
    flex - direction: column;
    gap: 8px;
}
            .image - error - modal.modal - btn {
    padding: 10px 14px;
    border: none;
    border - radius: 10px;
    font - size: 13px;
    font - weight: 500;
    cursor: pointer;
    transition: all 0.15s;
}
            .image - error - modal.modal - btn.primary {
    background: var(--primary - gradient);
    color: white;
}
            .image - error - modal.modal - btn.primary:hover {
    transform: translateY(-1px);
    box - shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
}
            .image - error - modal.modal - btn.secondary {
    background: var(--muted);
    color: var(--text - primary);
}
            .image - error - modal.modal - btn.secondary:hover {
    background: var(--input);
}
            .image - error - modal.modal - btn.tertiary {
    background: transparent;
    color: var(--text - muted);
    border: 1px solid var(--border);
}
            .image - error - modal.modal - btn.tertiary:hover {
    background: var(--muted);
    color: var(--text - secondary);
}
`;
        document.head.appendChild(styles);
    }

    // Event listeners
    modal.querySelector('[data-action="use-anyway"]').addEventListener('click', () => {
        modal.remove();
        state.clothingImage = url;
        updateUI();
        showToast(t('image_added_warning'), 'warning');
    });

    modal.querySelector('[data-action="retry"]').addEventListener('click', () => {
        modal.remove();
        const newUrl = prompt('Dán URL ảnh quần áo:\n\n💡 Mẹo: Chuột phải vào ảnh → Copy image address');
        if (newUrl && newUrl.trim() && newUrl.startsWith('http')) {
            validateAndSetClothingImage(newUrl.trim());
        }
    });

    modal.querySelector('[data-action="close"]').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
        modal.remove();
    });
}

// Add warning type to showToast
const originalShowToast = showToast;
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type} `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Warning shows longer
    const delay = (type === 'warning' || type === 'error') ? 5000 : 3000;
    setTimeout(() => toast.remove(), delay);
}

function startImageSelection() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            // Check if we can inject content script
            const url = tabs[0].url || '';

            // Can't inject on chrome:// or other protected pages
            if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
                url.startsWith('about:') || url.startsWith('edge://')) {
                showCannotSelectModal('protected');
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, { type: 'START_IMAGE_SELECTION' })
                .then(() => {
                    showToast(t('click_clothing_hint'));
                })
                .catch((error) => {
                    console.error('Image selection error:', error);
                    showCannotSelectModal('script');
                });
        }
    });
}

// Show modal when cannot select images
function showCannotSelectModal(reason) {
    // Remove existing modal
    const existing = document.querySelector('.cannot-select-modal');
    if (existing) existing.remove();

    const messages = {
        protected: {
            title: 'Không thể chọn ảnh trên trang này',
            description: 'Đây là trang hệ thống của trình duyệt. Vui lòng mở một trang web thương mại điện tử để thử đồ.'
        },
        script: {
            title: 'Không thể chọn ảnh',
            description: 'Trang web này có thể đang chặn extension. Nhưng đừng lo, bạn vẫn có thể thử đồ!'
        }
    };

    const msg = messages[reason] || messages.script;

    const modal = document.createElement('div');
    modal.className = 'cannot-select-modal';
    modal.innerHTML = `
    < div class="modal-backdrop" ></div >
        <div class="modal-content">
            <div class="modal-header">
                <span class="modal-icon">😔</span>
                <h3>${msg.title}</h3>
            </div>
            <p>${msg.description}</p>
            <div class="modal-suggestion">
                <strong>💡 Bạn có thể:</strong>
                <ul>
                    <li><strong>Dán URL ảnh</strong> - Chuột phải vào ảnh → Copy image address</li>
                    <li><strong>Lưu ảnh về máy</strong> - Rồi bấm "+ Tải ảnh" để upload</li>
                </ul>
            </div>
            <div class="modal-actions">
                <button class="modal-btn primary" data-action="paste">🔗 Dán URL ngay</button>
                <button class="modal-btn tertiary" data-action="close">Đóng</button>
            </div>
        </div>
`;
    document.body.appendChild(modal);

    // Add styles if not exist
    if (!document.getElementById('cannot-select-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'cannot-select-modal-styles';
        styles.textContent = `
    .cannot - select - modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z - index: 10000;
    display: flex;
    align - items: center;
    justify - content: center;
}
            .cannot - select - modal.modal - backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop - filter: blur(4px);
}
            .cannot - select - modal.modal - content {
    position: relative;
    background: var(--card);
    border: 1px solid var(--border);
    border - radius: 20px;
    padding: 24px;
    max - width: 340px;
    width: 90 %;
    animation: modalIn 0.2s ease;
}
            .cannot - select - modal.modal - header {
    display: flex;
    align - items: center;
    gap: 12px;
    margin - bottom: 12px;
}
            .cannot - select - modal.modal - icon {
    font - size: 28px;
}
            .cannot - select - modal.modal - header h3 {
    color: var(--text - primary);
    font - size: 16px;
    font - weight: 600;
    margin: 0;
}
            .cannot - select - modal p {
    color: var(--text - secondary);
    font - size: 13px;
    line - height: 1.5;
    margin: 0 0 16px;
}
            .cannot - select - modal.modal - suggestion {
    background: rgba(249, 115, 22, 0.1);
    border: 1px solid rgba(249, 115, 22, 0.3);
    border - radius: 12px;
    padding: 12px 14px;
    margin - bottom: 16px;
}
            .cannot - select - modal.modal - suggestion strong {
    color: var(--primary - start);
    font - size: 12px;
    display: block;
    margin - bottom: 8px;
}
            .cannot - select - modal.modal - suggestion ul {
    color: var(--text - secondary);
    font - size: 12px;
    margin: 0;
    padding - left: 18px;
    line - height: 1.8;
}
            .cannot - select - modal.modal - suggestion ul strong {
    color: var(--text - primary);
    display: inline;
}
            .cannot - select - modal.modal - actions {
    display: flex;
    flex - direction: column;
    gap: 8px;
}
            .cannot - select - modal.modal - btn {
    padding: 12px 14px;
    border: none;
    border - radius: 10px;
    font - size: 13px;
    font - weight: 500;
    cursor: pointer;
    transition: all 0.15s;
}
            .cannot - select - modal.modal - btn.primary {
    background: var(--primary - gradient);
    color: white;
}
            .cannot - select - modal.modal - btn.primary:hover {
    transform: translateY(-1px);
    box - shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
}
            .cannot - select - modal.modal - btn.tertiary {
    background: transparent;
    color: var(--text - muted);
    border: 1px solid var(--border);
}
            .cannot - select - modal.modal - btn.tertiary:hover {
    background: var(--muted);
    color: var(--text - secondary);
}
`;
        document.head.appendChild(styles);
    }

    // Event listeners
    modal.querySelector('[data-action="paste"]').addEventListener('click', () => {
        modal.remove();
        handlePasteUrl();
    });

    modal.querySelector('[data-action="close"]').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
        modal.remove();
    });
}

// ==========================================
// IMAGE VALIDATION - Kiểm tra ảnh trước khi trừ gems
// ==========================================

/**
 * Validate image URL bằng cách thử load ảnh
 * @param {string} imageUrl - URL ảnh cần kiểm tra
 * @param {number} timeout - Timeout in ms (default 10s)
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function validateImageUrl(imageUrl, timeout = 10000) {
    // Check basic URL format
    if (!imageUrl || typeof imageUrl !== 'string') {
        return { valid: false, error: 'URL ảnh không hợp lệ' };
    }

    // Check URL protocol
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
        return { valid: false, error: 'URL ảnh phải bắt đầu bằng http://, https:// hoặc data:' };
    }

    // Try to load the image
    return new Promise((resolve) => {
        const img = new Image();
        let resolved = false;

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                img.src = ''; // Cancel loading
                resolve({ valid: false, error: 'Timeout: Ảnh tải quá lâu' });
            }
        }, timeout);

        img.onload = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);

                // Check if image has valid dimensions
                if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                    resolve({ valid: false, error: 'Ảnh không có kích thước hợp lệ' });
                } else {
                    console.log(`[Fitly] Image validated: ${img.naturalWidth}x${img.naturalHeight} `);
                    resolve({ valid: true, width: img.naturalWidth, height: img.naturalHeight });
                }
            }
        };

        img.onerror = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve({ valid: false, error: 'Không thể tải ảnh - URL có thể bị hỏng hoặc bị chặn' });
            }
        };

        // Set crossOrigin to handle CORS (some images may still fail)
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
    });
}

/**
 * Validate ảnh kết quả try-on trước khi trừ gems
 * Nếu ảnh không hợp lệ, trả về false và hiển thị lỗi
 */
async function validateTryOnResult(resultImageUrl) {
    console.log('[Fitly] Validating try-on result image...');

    const validation = await validateImageUrl(resultImageUrl);

    if (!validation.valid) {
        console.error('[Fitly] Image validation failed:', validation.error);
        return {
            valid: false,
            error: `Ảnh kết quả lỗi: ${validation.error}. Gems sẽ không bị trừ.`
        };
    }

    console.log('[Fitly] Image validation passed!');
    return { valid: true };
}

// ==========================================
// TRY-ON PROCESSING (calls web app backend)
// ==========================================

async function processTryOn(event) {
    if (!state.modelImage || !state.clothingImage) {
        showToast(t('select_all_images'), 'error');
        return;
    }

    if (state.gemsBalance < GEM_COST_STANDARD) {
        showToast(t('error_insufficient_gems'), 'error');
        chrome.tabs.create({ url: 'http://localhost:3000/profile' });
        return;
    }

    const useMock = event?.shiftKey;
    if (useMock) {
        showToast(t('running_simulation'), 'info');
    }

    showLoading(true, useMock ? t('running_simulation') : t('processing'));
    updateProgress(10);

    try {
        // Simulate progress
        const progressInterval = setInterval(() => {
            const current = parseInt(elements.loadingProgressBar?.style.width || '10');
            if (current < 85) {
                updateProgress(current + Math.random() * 10);
            }
        }, 800);

        // Gọi API backend (chung với web app)
        const response = await chrome.runtime.sendMessage({
            type: 'PROCESS_TRYON',
            data: {
                person_image: state.modelImage,
                clothing_image: state.clothingImage,
                quality: 'standard',
                use_mock: useMock
            }
        });

        clearInterval(progressInterval);
        updateProgress(100);

        if (response.success) {
            // VALIDATE ẢNH TRƯỚC KHI TRỪ GEMS
            // Đây là bước quan trọng để tránh trừ gems khi ảnh bị lỗi
            updateProgress(95);
            if (elements.loadingText) elements.loadingText.textContent = t('checking_image');

            const imageValidation = await validateTryOnResult(response.result_image_url);

            if (!imageValidation.valid) {
                // Ảnh không hợp lệ - KHÔNG trừ gems
                console.error('[Fitly] Result image validation failed, requesting refund...');

                // Yêu cầu hoàn lại gems từ backend
                try {
                    const refundResponse = await chrome.runtime.sendMessage({
                        type: 'REFUND_GEMS',
                        data: {
                            reason: 'Invalid result image: ' + imageValidation.error,
                            amount: response.gems_used || GEM_COST_STANDARD,
                            tryonId: response.tryon_id
                        }
                    });

                    if (refundResponse?.success && refundResponse.newBalance !== undefined) {
                        state.gemsBalance = refundResponse.newBalance;
                    }
                } catch (refundError) {
                    console.error('[Fitly] Refund request failed:', refundError);
                }

                // Show Anime Error Overlay instead of just toast
                showErrorOverlay(true, imageValidation.error);
                updateUI();
                return;
            }

            // Ảnh hợp lệ - tiếp tục flow bình thường
            // Add result to the list and open popup
            addResult(response.result_image_url, state.clothingImage, state.modelImage);

            state.gemsBalance -= response.gems_used || GEM_COST_STANDARD;

            // Refresh user models (try-on may have added the model image)
            await loadUserModels();

            // Refresh recent clothing
            await loadRecentClothing();

            updateUI();
            showToast(t('tryon_success_popup'), 'success');
        } else {
            const errorMessage = response.error || t('error_occurred');
            console.error('Try-on failed:', errorMessage);

            // If gems were refunded, show that message
            if (errorMessage.includes('hoàn lại')) {
                // Refresh gems balance
                const balanceResponse = await chrome.runtime.sendMessage({ type: 'GET_GEMS_BALANCE' });
                if (balanceResponse.success) {
                    state.gemsBalance = balanceResponse.balance;
                    updateUI();
                }
            }
            
            showErrorOverlay(true, errorMessage);
        }
    } catch (error) {
        console.error('Try-on error:', error);
        showErrorOverlay(true, t('processing_error'));
    } finally {
        showLoading(false);
    }
}

// ==========================================
// RESULT ACTIONS (Legacy - kept for backward compatibility)
// ==========================================

// Note: These functions are now handled by the popup system
// See: downloadResultImage, shareResultImage, saveResultOutfit

// ==========================================
// MESSAGE LISTENER (từ content script)
// ==========================================

function listenForMessages() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case 'IMAGE_SELECTED':
                state.clothingImage = message.imageUrl;
                updateUI();
                showToast(t('clothing_photo_selected'), 'success');
                break;

            case 'AUTH_STATE_CHANGED':
                checkAuthState();
                break;

            // Handle popup events from content script (legacy - now handled by window listener)
            case 'POPUP_CLOSED':
                state.activePopups = state.activePopups.filter(id => id !== message.id);
                renderResultThumbnails();
                break;

            case 'POPUP_OPENED':
                if (!state.activePopups.includes(message.id)) {
                    state.activePopups.push(message.id);
                }
                renderResultThumbnails();
                break;

            case 'SAVE_RESULT_OUTFIT':
                // Handle save outfit request from content script
                saveResultOutfit(message.data);
                break;

            case 'RESULT_RENAMED':
                // Handle rename from popup on webpage
                const resultToRename = state.results.find(r => r.id === message.id);
                if (resultToRename) {
                    resultToRename.name = message.name;
                    renderResultThumbnails();
                }
                break;
        }
    });

    // Listen for result popup windows being closed
    chrome.windows.onRemoved.addListener((windowId) => {
        if (!state.resultWindows) return;

        // Find which result this window belonged to
        const resultId = Object.keys(state.resultWindows).find(
            id => state.resultWindows[id] === windowId
        );

        if (resultId) {
            const id = parseInt(resultId);
            delete state.resultWindows[id];
            state.activePopups = state.activePopups.filter(pId => pId !== id);
            renderResultThumbnails();
            console.log('[Fitly] Result popup window closed:', windowId);
        }
    });
}

// ==========================================
// GEMS PANEL
// ==========================================

function toggleGemsPanel() {
    const gemsPanel = document.getElementById('gems-panel');
    const languagePanel = document.getElementById('language-panel');

    // Close language panel if open
    languagePanel?.classList.add('hidden');

    if (gemsPanel?.classList.contains('hidden')) {
        showGemsPanel();
    } else {
        hideGemsPanel();
    }
}

function showGemsPanel() {
    const gemsPanel = document.getElementById('gems-panel');
    const gemsPanelBalance = document.getElementById('gems-panel-balance');

    if (gemsPanelBalance) {
        gemsPanelBalance.textContent = state.gemsBalance;
    }

    gemsPanel?.classList.remove('hidden');
    state.showGemsPanel = true;
}

function hideGemsPanel() {
    const gemsPanel = document.getElementById('gems-panel');
    gemsPanel?.classList.add('hidden');
    state.showGemsPanel = false;
}

async function purchaseGems(packageId) {
    hideGemsPanel();
    showToast(t('opening_checkout'), 'info');

    // Open web app profile page for payment
    // The web app will handle Stripe checkout
    chrome.tabs.create({
        url: `http://localhost:3000/profile?purchase=${packageId}`
    });
}

// ==========================================
// LANGUAGE PANEL
// ==========================================

function toggleLanguagePanel() {
    const languagePanel = document.getElementById('language-panel');
    const gemsPanel = document.getElementById('gems-panel');

    // Close gems panel if open
    gemsPanel?.classList.add('hidden');

    if (languagePanel?.classList.contains('hidden')) {
        showLanguagePanel();
    } else {
        hideLanguagePanel();
    }
}

function showLanguagePanel() {
    const languagePanel = document.getElementById('language-panel');

    // Update active state
    updateLanguageOptions();

    languagePanel?.classList.remove('hidden');
    state.showLanguagePanel = true;
}

function hideLanguagePanel() {
    const languagePanel = document.getElementById('language-panel');
    languagePanel?.classList.add('hidden');
    state.showLanguagePanel = false;
}

function updateLanguageOptions() {
    const languageOptions = document.querySelectorAll('.language-option');

    // Fallback LOCALE_INFO if i18n module not loaded
    const localeInfoFallback = LOCALE_INFO || {
        en: { native: 'English', flag: '🇺🇸' },
        vi: { native: 'Tiếng Việt', flag: '🇻🇳' },
        ja: { native: '日本語', flag: '🇯🇵' },
        ko: { native: '한국어', flag: '🇰🇷' },
        zh: { native: '中文', flag: '🇨🇳' },
        th: { native: 'ไทย', flag: '🇹🇭' },
        id: { native: 'Bahasa Indonesia', flag: '🇮🇩' },
        es: { native: 'Español', flag: '🇪🇸' },
        fr: { native: 'Français', flag: '🇫🇷' },
    };

    languageOptions.forEach(opt => {
        const lang = opt.dataset.lang;
        opt.classList.toggle('active', lang === state.locale);

        // Update display text with flag and native name from LOCALE_INFO
        const info = localeInfoFallback[lang];
        if (info) {
            const flagEl = opt.querySelector('.lang-flag');
            const nameEl = opt.querySelector('.lang-name');
            if (flagEl) flagEl.textContent = info.flag;
            if (nameEl) nameEl.textContent = info.native;
        }
    });

    // Update current language display in header
    const currentLangDisplay = document.getElementById('current-language-display');
    if (currentLangDisplay) {
        const info = localeInfoFallback[state.locale];
        if (info) {
            currentLangDisplay.textContent = `${info.flag} ${info.native}`;
        }
    }

    // Update language button in header with current flag
    const languageBtn = document.getElementById('language-btn');
    if (languageBtn) {
        const info = localeInfoFallback[state.locale];
        if (info) {
            languageBtn.textContent = info.flag;
            languageBtn.title = info.native;
        }
    }
}

async function changeLanguage(locale) {
    // Validate locale
    const validLocales = SUPPORTED_LOCALES || ['en', 'vi', 'ja', 'ko', 'zh', 'th', 'id', 'es', 'fr'];
    if (!validLocales.includes(locale)) {
        console.warn('Invalid locale:', locale);
        return;
    }

    state.locale = locale;

    // Save to storage using i18n helper or fallback
    if (saveLocalePreference) {
        await saveLocalePreference(locale);
    } else {
        await chrome.storage.local.set({ extension_locale: locale });
    }

    // Update UI
    updateLanguageOptions();
    updateUIStrings();
    hideLanguagePanel();

    // Sync to server if authenticated - this will also sync to web app
    if (state.authenticated) {
        try {
            await chrome.runtime.sendMessage({
                type: 'UPDATE_SETTINGS',
                data: { language: locale }
            });

            // Also set cookie for web app sync (if in same domain context)
            try {
                document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
            } catch (e) {
                // Cookie setting may fail in extension context
            }
        } catch (e) {
            console.log('Settings sync skipped');
        }
    }

    showToast('✅ ' + t('changed_to'), 'success');
}

// Update UI strings based on locale - COMPREHENSIVE UPDATE
function updateUIStrings() {
    // =====================================
    // SECTION HEADERS
    // =====================================

    // Your Photo section header
    const yourPhotoSectionHeaders = document.querySelectorAll('.section-header h3');
    if (yourPhotoSectionHeaders[0]) {
        const svg = yourPhotoSectionHeaders[0].querySelector('svg');
        yourPhotoSectionHeaders[0].innerHTML = '';
        if (svg) yourPhotoSectionHeaders[0].appendChild(svg);
        yourPhotoSectionHeaders[0].appendChild(document.createTextNode(' ' + t('your_photo')));
    }

    // Clothing section header
    if (yourPhotoSectionHeaders[1]) {
        const svg = yourPhotoSectionHeaders[1].querySelector('svg');
        yourPhotoSectionHeaders[1].innerHTML = '';
        if (svg) yourPhotoSectionHeaders[1].appendChild(svg);
        yourPhotoSectionHeaders[1].appendChild(document.createTextNode(' ' + t('clothing')));
    }

    // Results section header
    if (yourPhotoSectionHeaders[2]) {
        const svg = yourPhotoSectionHeaders[2].querySelector('svg');
        yourPhotoSectionHeaders[2].innerHTML = '';
        if (svg) yourPhotoSectionHeaders[2].appendChild(svg);
        yourPhotoSectionHeaders[2].appendChild(document.createTextNode(' ' + t('results')));
    }

    // =====================================
    // BUTTONS & ACTIONS
    // =====================================

    // Upload button (removed)
    // const uploadBtn = document.getElementById('upload-model-btn');
    // if (uploadBtn) uploadBtn.textContent = '+ ' + t('upload_photo');


    // Paste URL button
    const pasteUrlBtn = document.getElementById('paste-url-btn');
    if (pasteUrlBtn) pasteUrlBtn.textContent = t('paste_url');

    // =====================================
    // PLACEHOLDERS
    // =====================================

    const modelPlaceholder = document.getElementById('model-placeholder');
    if (modelPlaceholder) {
        const label = modelPlaceholder.querySelector('.empty-label');
        const instruction = modelPlaceholder.querySelector('.empty-instruction');
        // Check if translations exist, otherwise use meaningful defaults
        const addPhotoText = t('add_photo_caps') === 'add_photo_caps' ? 'THÊM ẢNH' : t('add_photo_caps');
        const hintText = t('full_body_photo_hint') === 'full_body_photo_hint' ? 'Ảnh toàn thân • Rõ nét • Max 10MB' : t('full_body_photo_hint');
        
        if (label) label.textContent = addPhotoText;
        if (instruction) instruction.textContent = hintText;
    }

    const clothingPlaceholder = document.getElementById('clothing-placeholder');
    if (clothingPlaceholder) {
        const span = clothingPlaceholder.querySelector('span');
        if (span) span.textContent = t('right_click_hint');
    }

    // =====================================
    // SAMPLE LABELS
    // =====================================

    const sampleLabels = document.querySelectorAll('.sample-label');
    sampleLabels.forEach((label, i) => {
        if (i === 0) label.textContent = t('saved_photos') + ':';
        else label.textContent = t('recent_clothing') + ':';
    });

    // =====================================
    // CLEAR BUTTONS - Use Icon
    // =====================================

    const clearBtns = document.querySelectorAll('.clear-btn');
    clearBtns.forEach(btn => {
        btn.innerHTML = '<span class="material-symbols-outlined">delete_sweep</span>';
        btn.title = t('clear_all'); // Add tooltip for accessibility
    });

    // =====================================
    // TRY-ON BUTTON (with currency)
    // =====================================

    const triesRemaining = Math.floor(state.gemsBalance / GEM_COST_STANDARD);
    if (elements.tryOnBtn) {
        if (state.modelImage && state.clothingImage && state.gemsBalance < GEM_COST_STANDARD) {
            elements.tryOnBtn.innerHTML = '💎 ' + t('need_more_gems');
        } else {
            elements.tryOnBtn.innerHTML = `✨ ${t('try_on_button')} <span class="gem-cost">(${triesRemaining} ${t('tries_remaining')})</span>`;
        }
    }

    // =====================================
    // KEYBOARD SHORTCUTS
    // =====================================

    const shortcutsHint = document.querySelector('.shortcuts-hint span');
    if (shortcutsHint) {
        shortcutsHint.innerHTML = `⌨️ ${t('shortcuts')}: <kbd>V</kbd> <kbd>T</kbd> <kbd>C</kbd> <kbd>R</kbd> <kbd>1-9</kbd>`;
    }

    // =====================================
    // GEMS PANEL
    // =====================================

    const gemsPanelHeader = document.querySelector('.gems-panel-header h3');
    if (gemsPanelHeader) gemsPanelHeader.textContent = '💎 ' + t('buy_gems');

    const gemsPanelSubtitle = document.querySelector('.gems-panel-subtitle');
    if (gemsPanelSubtitle) {
        gemsPanelSubtitle.innerHTML = `${t('balance')}: <span id="gems-panel-balance">${state.gemsBalance}</span> <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: text-bottom; color: #29b6f6;">diamond</span>`;
    }

    const gemsPanelNote = document.querySelector('.gems-panel-note');
    if (gemsPanelNote) gemsPanelNote.textContent = t('payment_note');

    // Update gem package prices based on locale
    updateGemPackagePrices();

    // =====================================
    // LANGUAGE PANEL
    // =====================================

    const languagePanelHeader = document.querySelector('.language-panel-header h3');
    if (languagePanelHeader) languagePanelHeader.textContent = `🌐 ${t('language')} / Language`;

    // =====================================
    // AUTH SECTION
    // =====================================

    const authMessage = document.querySelector('.auth-section p');
    if (authMessage) authMessage.textContent = t('login_to_try');

    const loginGoogleBtn = document.getElementById('login-google-btn');
    if (loginGoogleBtn) {
        const svg = loginGoogleBtn.querySelector('svg');
        loginGoogleBtn.innerHTML = '';
        if (svg) {
            loginGoogleBtn.appendChild(svg);
            loginGoogleBtn.appendChild(document.createTextNode(' '));
        }
        loginGoogleBtn.appendChild(document.createTextNode(t('continue_google')));
    }

    // =====================================
    // LOADING OVERLAY
    // =====================================

    const loadingTip = document.getElementById('loading-tip');
    if (loadingTip) loadingTip.textContent = '💡 ' + t('loading_tip');

    // =====================================
    // RESULTS SECTION
    // =====================================

    const resultCount = document.getElementById('result-count');
    if (resultCount) {
        resultCount.textContent = `${state.results.length} ${t('results').toLowerCase()}`;
    }

    // Update no results message
    const resultThumbnailsEmpty = document.querySelector('.result-thumbnails-empty');
    if (resultThumbnailsEmpty) {
        resultThumbnailsEmpty.textContent = t('no_results');
    }

    // =====================================
    // DEMO BANNER (if exists)
    // =====================================
    const demoBanner = document.getElementById('demo-banner');
    if (demoBanner) {
        demoBanner.textContent = '🧪 Demo Mode';
    }

    // =====================================
    // PROFILE DROPDOWN MENU
    // =====================================
    const menuWebapp = document.querySelector('#menu-webapp .menu-item-text');
    if (menuWebapp) menuWebapp.textContent = t('open_fitly_web');

    const menuWardrobe = document.querySelector('#menu-wardrobe .menu-item-text');
    if (menuWardrobe) menuWardrobe.textContent = t('my_wardrobe');

    const menuCacheSettings = document.querySelector('#menu-cache-settings .menu-item-text');
    if (menuCacheSettings) menuCacheSettings.textContent = t('cache_management');

    const menuHelp = document.querySelector('#menu-help .menu-item-text');
    if (menuHelp) menuHelp.textContent = t('help');

    const menuLogout = document.querySelector('#menu-logout .menu-item-text');
    if (menuLogout) menuLogout.textContent = t('logout');

    // =====================================
    // REPORT WRONG BUTTON
    // =====================================
    const reportBtn = document.querySelector('.report-wrong-btn');
    if (reportBtn && !reportBtn.disabled) {
        reportBtn.textContent = t('report_wrong_btn');
    }

    console.log('[i18n] UI strings updated for locale:', state.locale);
}

// Update gem package prices based on currency locale
function updateGemPackagePrices() {
    const packages = [
        { selector: '[data-package="starter"]', price: 49000 },
        { selector: '[data-package="pro"]', price: 129000 },
        { selector: '[data-package="premium"]', price: 399000 },
    ];

    packages.forEach(pkg => {
        const el = document.querySelector(pkg.selector);
        if (el) {
            const priceEl = el.querySelector('.package-price');
            if (priceEl) {
                priceEl.textContent = formatPrice(pkg.price);
            }

            // Update badge text
            const badgeEl = el.querySelector('.package-badge');
            if (badgeEl) {
                badgeEl.textContent = t('popular');
            }

            // Update package name based on locale
            const nameEl = el.querySelector('.package-name');
            if (nameEl) {
                const packageKey = pkg.selector.match(/data-package="(\w+)"/)?.[1];
                if (packageKey) {
                    nameEl.textContent = t(`${packageKey}_pack`);
                }
            }
        }
    });
}

// Load saved language preference - use i18n module
async function loadLanguagePreference() {
    try {
        if (loadLocalePreference) {
            state.locale = await loadLocalePreference();
        } else {
            // Fallback if i18n not loaded
            const data = await chrome.storage.local.get('extension_locale');
            state.locale = data.extension_locale || 'vi';
        }
        updateUIStrings();
        updateLanguageOptions();
    } catch (e) {
        console.log('Could not load language preference');
        state.locale = DEFAULT_LOCALE || 'vi';
    }
}

// ==========================================
// IMAGE CACHE HELPERS
// ==========================================

/**
 * Fallback khi ảnh không load được — tìm trong cache
 */
async function loadCachedFallback(imgElement, cachedKey) {
    if (!cachedKey || !window.imageCache) return;

    try {
        const cached = await window.imageCache.getCachedImage(cachedKey);
        if (cached) {
            imgElement.src = cached;
        } else {
            // Hiển thị placeholder khi không có ảnh
            imgElement.style.display = 'none';
            const parent = imgElement.closest('.clothing-history-item');
            if (parent) {
                parent.title = 'Ảnh không khả dụng — cần tải lại';
                parent.style.opacity = '0.5';
            }
        }
    } catch (error) {
        console.warn('[Fitly] Cache fallback failed:', error.message);
    }
}

// Expose globally cho onerror handler
window.loadCachedFallback = loadCachedFallback;

/**
 * Auto-cache ảnh local upload (data: hoặc blob: URL)
 * Gọi sau renderClothingHistory()
 */
async function cacheLocalUploadImages() {
    if (!window.imageCache) return;

    for (const item of state.recentClothing) {
        const isLocalUpload = item.sourceType === 'local_upload';
        const isDataUrl = item.imageUrl?.startsWith('data:') || item.imageUrl?.startsWith('blob:');
        const key = item.cachedKey || item.id;

        // Cache ngay nếu là local upload và có data URL
        if ((isLocalUpload || isDataUrl) && key && !item._cached) {
            const cached = await window.imageCache.cacheImage(key, item.imageUrl);
            if (cached) {
                item._cached = true;
                // Cập nhật cachedKey trong storage
                if (!item.cachedKey) {
                    item.cachedKey = key;
                    chrome.runtime.sendMessage({
                        type: 'SAVE_RECENT_CLOTHING',
                        data: { ...item, cachedKey: key }
                    }).catch(() => { });
                }
            }
        }
    }
}

// ==========================================
// PROFILE DROPDOWN MENU
// ==========================================

function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    if (!menu) return;

    const isHidden = menu.classList.contains('hidden');

    if (isHidden) {
        // Update menu content trước khi show
        updateProfileMenuContent();
        menu.classList.remove('hidden');

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closeProfileMenuOnOutsideClick);
        }, 10);
    } else {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeProfileMenuOnOutsideClick);
    }
}

function closeProfileMenuOnOutsideClick(e) {
    const menu = document.getElementById('profile-menu');
    const profileBtn = elements.profileBtn;

    if (menu && !menu.contains(e.target) && !profileBtn?.contains(e.target)) {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeProfileMenuOnOutsideClick);
    }
}

function hideProfileMenu() {
    const menu = document.getElementById('profile-menu');
    if (menu) menu.classList.add('hidden');
    document.removeEventListener('click', closeProfileMenuOnOutsideClick);
}

async function updateProfileMenuContent() {
    const avatar = document.getElementById('menu-avatar');
    const username = document.getElementById('menu-username');
    const email = document.getElementById('menu-email');
    const cacheSize = document.getElementById('menu-cache-size');
    const currentLangCode = document.getElementById('current-lang-code');

    // Avatar & User Info
    const avatarUrl = state.profile?.avatar_url;
    const displayName = state.profile?.full_name || state.user?.email || 'Guest';
    const initial = displayName.charAt(0).toUpperCase();

    // Update Avatar
    if (avatar) {
        if (state.authenticated && avatarUrl) {
            avatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: linear-gradient(135deg, #f97316, #ec4899); color: white;">${initial}</div>`;
        } else {
            avatar.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: ${state.authenticated ? 'linear-gradient(135deg, #f97316, #ec4899)' : '#eee'}; color: ${state.authenticated ? 'white' : '#999'};">
                                    ${state.authenticated ? initial : '<span class="material-symbols-outlined">person</span>'}
                                </div>`;
        }
    }

    // Update Text Info
    if (username) {
        username.textContent = state.authenticated ? (state.profile?.full_name || state.user?.email?.split('@')[0]) : t('guest');
    }
    if (email) {
        email.textContent = state.authenticated ? state.user?.email : t('not_signed_in');
    }

    // Current Language Code
    if (currentLangCode) {
        currentLangCode.textContent = state.locale.toUpperCase();
    }

    // Cache size
    if (cacheSize && window.imageCache) {
        try {
            const stats = await window.imageCache.getCacheStats();
            cacheSize.textContent = `${stats.totalSizeMB} MB`;
        } catch (e) {
            cacheSize.textContent = '0 MB';
        }
    }
}

function initProfileMenuEvents() {
    // Language
    document.getElementById('menu-language')?.addEventListener('click', () => {
        toggleLanguagePanel();
        hideProfileMenu();
    });

    // Web App
    document.getElementById('menu-webapp')?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000' });
        hideProfileMenu();
    });

    // Wardrobe
    document.getElementById('menu-wardrobe')?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000/wardrobe' });
        hideProfileMenu();
    });

    // Cache Settings
    document.getElementById('menu-cache-settings')?.addEventListener('click', async () => {
        if (!window.imageCache) return;
        const stats = await window.imageCache.getCacheStats();
        const confirmed = confirm(
            t('cache_info', { count: stats.count, size: stats.totalSizeMB })
        );
        if (confirmed) {
            await window.imageCache.clearAllCachedImages();
            showToast(t('cache_cleared'), 'success');
            updateProfileMenuContent();
        }
        hideProfileMenu();
    });

    // Help
    document.getElementById('menu-help')?.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000/help' });
        hideProfileMenu();
    });

    // Gems Shortcut
    document.getElementById('menu-credits')?.addEventListener('click', () => {
        toggleGemsPanel();
        hideProfileMenu();
    });

    // Logout
    document.getElementById('menu-logout')?.addEventListener('click', async () => {
        hideProfileMenu();
        try {
            await chrome.runtime.sendMessage({ type: 'LOGOUT' });
            state.authenticated = false;
            state.user = null;
            state.profile = null;
            state.gemsBalance = 0;
            updateUI();
            showToast(t('logged_out'), 'info');
        } catch (error) {
            showToast(t('logout_error'), 'error');
        }
    });
}

// ==========================================
// START
// ==========================================

init();
loadLanguagePreference();

// Init profile menu events after DOM ready
initProfileMenuEvents();

// Cleanup expired cache on startup
if (window.imageCache) {
    window.imageCache.cleanupExpiredCache();
}
