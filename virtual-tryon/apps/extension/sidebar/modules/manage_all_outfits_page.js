/**
 * File: manage_all_outfits_page.js
 * Purpose: Quản lý màn hình "All Outfits" (Select Looks) — grid 2 cột, filter, select, compare, lookbook
 * Layer: Presentation
 *
 * Input: state.results (local try-on), GET_OUTFITS (saved outfits), state.hiddenOutfitIds
 * Output: DOM updates cho all-outfits-section
 *
 * Flow:
 * 1. openAllOutfits() → show section, load + merge data, render grid
 * 2. filterAllOutfits(tab) → All / Favorites / Deleted
 * 3. toggleOutfitSelect(id) → select/deselect outfit, update bottom bar
 * 4. Compare / Lookbook integration
 * 5. Search outfits by name
 */

// ==========================================
// STATE
// ==========================================
let allOutfitsData = []; // Merged list of all outfits
let allOutfitsActiveTab = 'all';
let allOutfitsSelectedIds = [];
let allOutfitsFavoriteIds = [];
let allOutfitsSearchQuery = '';
let allOutfitsSearchVisible = false;

// ==========================================
// PERSISTENCE — Favorites
// ==========================================

function loadFavoriteOutfitIds() {
    try {
        const raw = localStorage.getItem('fitly_favorite_outfit_ids');
        allOutfitsFavoriteIds = raw ? JSON.parse(raw) : [];
    } catch (_e) {
        allOutfitsFavoriteIds = [];
    }
}

function saveFavoriteOutfitIds() {
    try {
        localStorage.setItem('fitly_favorite_outfit_ids', JSON.stringify(allOutfitsFavoriteIds));
    } catch (_e) { /* storage full */ }
}

function toggleFavorite(id) {
    const strId = String(id);
    const idx = allOutfitsFavoriteIds.indexOf(strId);
    if (idx === -1) {
        allOutfitsFavoriteIds.push(strId);
    } else {
        allOutfitsFavoriteIds.splice(idx, 1);
    }
    saveFavoriteOutfitIds();
    renderAllOutfitsGrid();
}

// ==========================================
// OPEN / CLOSE
// ==========================================

async function openAllOutfits() {
    const section = document.getElementById('all-outfits-section');
    if (!section) return;

    // STEP 1: Load favorites + hidden IDs
    loadFavoriteOutfitIds();
    if (!state.hiddenOutfitIds) {
        if (window.loadHiddenOutfitIds) loadHiddenOutfitIds();
    }

    // STEP 2: Hide main content, show all outfits section
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.classList.add('hidden');
    document.getElementById('inline-result-section')?.classList.add('hidden');
    document.getElementById('created-outfits-list-section')?.classList.add('hidden');
    section.classList.remove('hidden');

    // STEP 3: Reset state
    allOutfitsActiveTab = 'all';
    allOutfitsSelectedIds = [];
    allOutfitsSearchQuery = '';
    allOutfitsSearchVisible = false;

    // STEP 4: Update tab UI
    updateAllOutfitsTabs();

    // STEP 5: Load data
    await loadAllOutfitsData();

    // STEP 6: Render
    renderAllOutfitsGrid();
    updateAllOutfitsBottomBar();
}

function closeAllOutfits() {
    const section = document.getElementById('all-outfits-section');
    if (section) section.classList.add('hidden');

    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.classList.remove('hidden');

    allOutfitsSelectedIds = [];
}

// ==========================================
// DATA LOADING
// ==========================================

async function loadAllOutfitsData() {
    allOutfitsData = [];

    // STEP 1: Load saved outfits from background
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_OUTFITS', data: { limit: 100 } });
        if (response?.success && response.outfits?.length > 0) {
            response.outfits.forEach(outfit => {
                allOutfitsData.push({
                    id: String(outfit.id),
                    name: outfit.name || 'Outfit',
                    imageUrl: outfit.result_image_url,
                    clothingUrl: outfit.clothing_image_url,
                    modelUrl: outfit.model_image_url,
                    timestamp: outfit.created_at ? new Date(outfit.created_at).getTime() : Date.now(),
                    matchPercentage: outfit.match_percentage || Math.floor(Math.random() * 20 + 78),
                    tags: outfit.tags || [],
                    source: outfit.source_type || 'ai',
                    isHidden: (state.hiddenOutfitIds || []).includes(String(outfit.id)),
                });
            });
        }
    } catch (err) {
        console.warn('[AllOutfits] Failed to load saved outfits:', err);
    }

    // STEP 2: Merge local try-on results if not already in saved
    if (state.results && state.results.length > 0) {
        const existingIds = new Set(allOutfitsData.map(o => o.id));
        state.results.forEach(result => {
            const rid = String(result.id);
            if (!existingIds.has(rid)) {
                allOutfitsData.push({
                    id: rid,
                    name: result.name || t('gallery.outfit_name', { id: result.id }) || `Outfit #${result.id}`,
                    imageUrl: result.imageUrl,
                    clothingUrl: result.clothingUrl,
                    modelUrl: result.modelUrl,
                    timestamp: result.timestamp || Date.now(),
                    matchPercentage: result.matchPercentage || Math.floor(Math.random() * 20 + 78),
                    tags: result.tag ? [result.tag] : [],
                    source: 'local',
                    isHidden: false,
                });
            }
        });
    }

    // STEP 3: Sort by timestamp desc
    allOutfitsData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

// ==========================================
// FILTERING
// ==========================================

function getFilteredOutfits() {
    let filtered = [...allOutfitsData];

    // STEP 1: Tab filter
    switch (allOutfitsActiveTab) {
        case 'favorites':
            filtered = filtered.filter(o => allOutfitsFavoriteIds.includes(o.id));
            break;
        case 'deleted':
            filtered = filtered.filter(o => o.isHidden);
            break;
        default: // 'all'
            filtered = filtered.filter(o => !o.isHidden);
            break;
    }

    // STEP 2: Search filter
    if (allOutfitsSearchQuery.trim()) {
        const q = allOutfitsSearchQuery.toLowerCase().trim();
        filtered = filtered.filter(o =>
            (o.name || '').toLowerCase().includes(q) ||
            (o.tags || []).some(tag => tag.toLowerCase().includes(q))
        );
    }

    return filtered;
}

function switchAllOutfitsTab(tab) {
    allOutfitsActiveTab = tab;
    allOutfitsSelectedIds = [];
    updateAllOutfitsTabs();
    renderAllOutfitsGrid();
    updateAllOutfitsBottomBar();
}

function updateAllOutfitsTabs() {
    const tabs = document.querySelectorAll('#all-outfits-section .ao-tab');
    tabs.forEach(tabEl => {
        const tabName = tabEl.dataset.tab;
        tabEl.classList.toggle('active', tabName === allOutfitsActiveTab);
    });
}

// ==========================================
// RENDER GRID
// ==========================================

function renderAllOutfitsGrid() {
    const grid = document.getElementById('all-outfits-grid');
    if (!grid) return;

    const filtered = getFilteredOutfits();

    if (filtered.length === 0) {
        const emptyMsg = allOutfitsActiveTab === 'favorites'
            ? (t('all_outfits.empty_favorites') || 'Chưa có outfit yêu thích')
            : allOutfitsActiveTab === 'deleted'
                ? (t('all_outfits.empty_deleted') || 'Không có outfit đã ẩn')
                : (t('all_outfits.empty') || 'Chưa có outfit nào');

        grid.innerHTML = `
            <div class="ao-empty-state">
                <span class="material-symbols-outlined">checkroom</span>
                <p>${emptyMsg}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(outfit => renderAllOutfitCard(outfit)).join('');

    // STEP 2: Attach event listeners
    grid.querySelectorAll('.ao-card').forEach(card => {
        const id = card.dataset.id;

        // Select checkbox
        card.querySelector('.ao-card-check')?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleOutfitSelect(id);
        });

        // Favorite button
        card.querySelector('.ao-fav-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(id);
        });

        // Click card → view detail
        card.addEventListener('click', () => {
            const outfit = allOutfitsData.find(o => o.id === id);
            if (outfit && window.showResultInline) {
                closeAllOutfits();
                showResultInline({ imageUrl: outfit.imageUrl, id: outfit.id, name: outfit.name });
            }
        });

        // Fix broken images
        const img = card.querySelector('.ao-card-img');
        if (img) {
            img.addEventListener('error', function () {
                if (this.dataset.fixed) return;
                this.dataset.fixed = 'true';
                if (window.fixBrokenImage) fixBrokenImage(this);
            }, { once: true });
        }
    });
}

function renderAllOutfitCard(outfit) {
    const isSelected = allOutfitsSelectedIds.includes(outfit.id);
    const isFav = allOutfitsFavoriteIds.includes(outfit.id);
    const matchPct = outfit.matchPercentage || 0;

    // Generate style tags
    const styleTags = generateStyleTags(outfit);
    const tagsHtml = styleTags.length > 0
        ? styleTags.map(tag => `<span class="ao-style-tag">${escapeHtml(tag)}</span>`).join('')
        : '';

    // Color swatch for match percentage — derive from match
    const swatchColor = matchPct >= 90 ? '#C4646A' : matchPct >= 80 ? '#D4A47C' : '#A0A0A0';

    return `
        <div class="ao-card ${isSelected ? 'ao-card--selected' : ''}" data-id="${outfit.id}">
            <div class="ao-card-image-wrap">
                <img src="${outfit.imageUrl}" alt="${escapeHtml(outfit.name)}" class="ao-card-img" loading="lazy"
                     referrerpolicy="no-referrer" crossorigin="anonymous">
                <div class="ao-match-badge">${matchPct}% Match</div>
                <div class="ao-card-check ${isSelected ? 'checked' : ''}">
                    <span class="material-symbols-outlined">${isSelected ? 'check_circle' : 'radio_button_unchecked'}</span>
                </div>
                <button class="ao-fav-btn ${isFav ? 'ao-fav-btn--active' : ''}" title="${isFav ? 'Unfavorite' : 'Favorite'}">
                    <span class="material-symbols-outlined">${isFav ? 'favorite' : 'favorite_border'}</span>
                </button>
            </div>
            <div class="ao-card-info">
                <h4 class="ao-card-name">${escapeHtml(outfit.name)}</h4>
                ${tagsHtml ? `<div class="ao-card-tags">${tagsHtml}</div>` : ''}
            </div>
        </div>
    `;
}

function generateStyleTags(outfit) {
    // Generate descriptive style tags based on outfit data
    const tags = [];
    if (outfit.tags && outfit.tags.length > 0) {
        return outfit.tags.slice(0, 3);
    }
    // Fallback: generate from name
    const name = (outfit.name || '').toLowerCase();
    if (name.includes('casual') || name.includes('everyday')) tags.push('Casual');
    if (name.includes('office') || name.includes('work')) tags.push('Professional');
    if (name.includes('gala') || name.includes('evening') || name.includes('formal')) tags.push('Formal');
    if (name.includes('street') || name.includes('city')) tags.push('Street');
    if (name.includes('chic')) tags.push('Minimalist');
    if (name.includes('boho')) tags.push('Boho');

    if (tags.length === 0) {
        // Generate from source
        if (outfit.source === 'ai') tags.push('AI Generated');
        if (outfit.source === 'external') tags.push('Web Import');
    }

    return tags.slice(0, 3);
}

// ==========================================
// SELECTION
// ==========================================

function toggleOutfitSelect(id) {
    const idx = allOutfitsSelectedIds.indexOf(id);
    if (idx === -1) {
        if (allOutfitsSelectedIds.length >= 4) {
            allOutfitsSelectedIds.shift();
        }
        allOutfitsSelectedIds.push(id);
    } else {
        allOutfitsSelectedIds.splice(idx, 1);
    }
    renderAllOutfitsGrid();
    updateAllOutfitsBottomBar();
}

// ==========================================
// BOTTOM BAR
// ==========================================

function updateAllOutfitsBottomBar() {
    const compareBtn = document.getElementById('ao-compare-btn');
    const lookbookBtn = document.getElementById('ao-lookbook-btn');
    const count = allOutfitsSelectedIds.length;

    if (compareBtn) {
        compareBtn.disabled = count < 2;
        compareBtn.innerHTML = `<span class="material-symbols-outlined">compare</span> ${t('all_outfits.compare') || 'Compare'}`;
    }
    if (lookbookBtn) {
        lookbookBtn.innerHTML = `<span class="material-symbols-outlined">auto_stories</span> ${t('all_outfits.lookbook') || 'Lookbook'}`;
    }
}

// ==========================================
// SEARCH
// ==========================================

function toggleAllOutfitsSearch() {
    allOutfitsSearchVisible = !allOutfitsSearchVisible;
    const searchWrap = document.getElementById('ao-search-wrap');
    const searchInput = document.getElementById('ao-search-input');

    if (searchWrap) {
        searchWrap.classList.toggle('hidden', !allOutfitsSearchVisible);
    }
    if (allOutfitsSearchVisible && searchInput) {
        searchInput.focus();
    } else {
        allOutfitsSearchQuery = '';
        if (searchInput) searchInput.value = '';
        renderAllOutfitsGrid();
    }
}

// ==========================================
// ACTIONS — Compare / Lookbook
// ==========================================

function handleAllOutfitsCompare() {
    if (allOutfitsSelectedIds.length < 2) {
        showToast(t('all_outfits.select_two') || 'Chọn ít nhất 2 outfit để so sánh', 'warning');
        return;
    }

    // Map selected IDs to state.results format for compare view
    const selectedOutfits = allOutfitsSelectedIds
        .map(id => allOutfitsData.find(o => o.id === id))
        .filter(Boolean);

    // Ensure results exist in state.results for compare view to access
    selectedOutfits.forEach(outfit => {
        const existsInResults = state.results.find(r => String(r.id) === outfit.id);
        if (!existsInResults) {
            state.results.push({
                id: parseInt(outfit.id) || outfit.id,
                name: outfit.name,
                imageUrl: outfit.imageUrl,
                timestamp: outfit.timestamp,
                matchPercentage: outfit.matchPercentage,
            });
        }
    });

    // Set current result for compare start
    state.currentResultId = parseInt(selectedOutfits[0].id) || selectedOutfits[0].id;

    closeAllOutfits();
    if (window.openCompareView) openCompareView();
}

function handleAllOutfitsLookbook() {
    const selectedOutfits = allOutfitsSelectedIds
        .map(id => allOutfitsData.find(o => o.id === id))
        .filter(Boolean);

    if (selectedOutfits.length === 0) {
        // Use first visible outfit
        const filtered = getFilteredOutfits();
        if (filtered.length > 0) selectedOutfits.push(filtered[0]);
    }

    if (selectedOutfits.length === 0) {
        showToast(t('all_outfits.no_outfit_for_lookbook') || 'Không có outfit nào để tạo Lookbook', 'warning');
        return;
    }

    // Ensure results exist in state.results for lookbook
    selectedOutfits.forEach(outfit => {
        const existsInResults = state.results.find(r => String(r.id) === outfit.id);
        if (!existsInResults) {
            state.results.push({
                id: parseInt(outfit.id) || outfit.id,
                name: outfit.name,
                imageUrl: outfit.imageUrl,
                timestamp: outfit.timestamp,
                matchPercentage: outfit.matchPercentage,
            });
        }
    });

    state.selectedResultIds = selectedOutfits.map(o => parseInt(o.id) || o.id);

    closeAllOutfits();
    if (window.openShareLookbook) openShareLookbook();
}

// ==========================================
// EVENT SETUP
// ==========================================

function setupAllOutfitsEvents() {
    // Close button
    document.getElementById('ao-close-btn')?.addEventListener('click', closeAllOutfits);

    // Search toggle
    document.getElementById('ao-search-btn')?.addEventListener('click', toggleAllOutfitsSearch);

    // Search input
    const searchInput = document.getElementById('ao-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            allOutfitsSearchQuery = e.target.value;
            renderAllOutfitsGrid();
        });
    }

    // Tabs
    document.querySelectorAll('#all-outfits-section .ao-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchAllOutfitsTab(tab.dataset.tab);
        });
    });

    // Compare button
    document.getElementById('ao-compare-btn')?.addEventListener('click', handleAllOutfitsCompare);

    // Lookbook button
    document.getElementById('ao-lookbook-btn')?.addEventListener('click', handleAllOutfitsLookbook);
}

// ==========================================
// INIT
// ==========================================
setupAllOutfitsEvents();

// ==========================================
// EXPOSE
// ==========================================
window.openAllOutfits = openAllOutfits;
window.closeAllOutfits = closeAllOutfits;
window.toggleOutfitSelect = toggleOutfitSelect;
window.switchAllOutfitsTab = switchAllOutfitsTab;
window.toggleAllOutfitsSearch = toggleAllOutfitsSearch;
window.handleAllOutfitsCompare = handleAllOutfitsCompare;
window.handleAllOutfitsLookbook = handleAllOutfitsLookbook;
