/**
 * File: handle_result_actions.js
 * Purpose: Xử lý tất cả actions trên kết quả try-on (inline và popup)
 * Layer: Domain
 *
 * Input: state.results, state.currentResultId, DOM elements của inline result section
 * Output: Download/copy/save/share kết quả, quản lý popup windows, xóa kết quả
 *
 * Flow:
 * 1. addResult → lưu vào state + show inline
 * 2. handleResultDownload/Copy/Save/Share/Edit/ReportWrong → inline actions
 * 3. openResultPopup → tạo chrome popup window mới
 * 4. deleteResult / clearAllResults → xóa kết quả
 */

function addResult(imageUrl, clothingUrl, modelUrl, sourceUrl = null) {
    // Không lưu base64 data URL cho clothing/model để tránh vượt quota storage
    // Chỉ giữ remote URL (http/https) cho việc hiển thị before/after
    const safeClothingUrl = (clothingUrl && !clothingUrl.startsWith('data:')) ? clothingUrl : null;
    const safeModelUrl = (modelUrl && !modelUrl.startsWith('data:')) ? modelUrl : null;

    const result = {
        id: state.nextResultId++,
        name: null,
        imageUrl,
        clothingUrl: safeClothingUrl,
        modelUrl: safeModelUrl,
        sourceUrl: sourceUrl || state.clothingSourceUrl,
        timestamp: Date.now()
    };

    state.results.unshift(result);
    saveResults();
    state.resultImage = imageUrl;
    state.currentResultId = result.id;

    showResultInline(result);
    showSuccessOverlay(true, t('success'));
    setTimeout(() => showSuccessOverlay(false), 2000);
    updateGalleryUI();

    // Auto-save outfit → persist vào local storage (và cloud nếu authenticated)
    // Fire-and-forget: không block UI
    chrome.runtime.sendMessage({
        type: 'SAVE_OUTFIT',
        data: {
            name: t('outfit_date_name', { date: new Date().toLocaleDateString() }) || `Outfit ${new Date().toLocaleDateString()}`,
            result_image_url: imageUrl,
            clothing_image_url: safeClothingUrl,
            model_image_url: safeModelUrl,
        }
    }).then(() => {
        renderCreatedOutfitsList();
    }).catch(err => {
        console.warn('[Fitly] Auto-save outfit failed:', err.message);
    });

    return result;
}

function showResultInline(result) {
    if (!result || !result.imageUrl) return;
    const section = $('inline-result-section');
    const image = $('inline-result-image');
    const modelImage = $('inline-model-image');
    const reportBtn = $('report-wrong-btn');
    if (!section || !image) return;

    // Phục vụ cơ chế fallback (fixBrokenImage)
    image.dataset.id = result.id;
    image.onerror = function () {
        if (window.fixBrokenImage) fixBrokenImage(this);
    };

    image.src = result.imageUrl;
    image.alt = result.name || t('result_number', { index: result.id });

    // Setup Before/After slider if model image is available
    if (modelImage) {
        if (result.modelUrl && result.modelUrl !== '') {
            modelImage.src = result.modelUrl;
        } else if (state.modelImage && state.modelImage !== '') {
            modelImage.src = state.modelImage;
        }

        // Reset slider to 50%
        const slider = $('slider-range');
        const beforeWrapper = document.querySelector('.slider-image-before-wrapper');
        const handle = document.querySelector('.slider-handle');
        if (slider && beforeWrapper && handle) {
            slider.value = 50;
            const percentage = 50;
            beforeWrapper.style.width = `${percentage}%`;
            handle.style.left = `${percentage}%`;
        }
    }

    if (reportBtn) {
        reportBtn.disabled = false;
        reportBtn.textContent = t('report_wrong_btn');
    }
    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideResultInline() {
    $('inline-result-section')?.classList.add('hidden');
}

async function handleResultDownload() {
    const resultImage = $('inline-result-image');
    if (!resultImage?.src) { showToast(t('no_image_to_download'), 'error'); return; }
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
        const link = document.createElement('a');
        link.href = resultImage.src;
        link.download = `fitly-tryon-${Date.now()}.png`;
        link.click();
    }
}

async function handleResultCopy() {
    const resultImage = $('inline-result-image');
    if (!resultImage?.src) { showToast(t('no_image_to_copy'), 'error'); return; }
    try {
        const response = await fetch(resultImage.src);
        const blob = await response.blob();
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast(t('image_copied'), 'success');
    } catch (error) {
        try {
            await navigator.clipboard.writeText(resultImage.src);
            showToast(t('link_copied'), 'success');
        } catch (e) {
            showToast(t('cannot_copy'), 'error');
        }
    }
}

async function handleResultSave() {
    const resultImage = $('inline-result-image');
    if (!resultImage?.src) { showToast(t('no_image_to_save'), 'error'); return; }
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'SAVE_TO_WARDROBE',
            data: { imageUrl: resultImage.src, type: 'tryon_result' }
        });
        showToast(response?.success ? t('saved_to_wardrobe') : (response?.error || t('save_error')), response?.success ? 'success' : 'error');
    } catch (error) {
        showToast(t('error_occurred'), 'error');
    }
}

async function handleResultShare() {
    const resultImage = $('inline-result-image');
    const currentResult = state.results.find(r => r.id === state.currentResultId);
    const sourceUrl = currentResult?.sourceUrl || state.clothingSourceUrl;
    try {
        if (navigator.share) {
            await navigator.share({ title: t('share_title'), text: t('share_text'), url: sourceUrl || window.location.href });
            showToast(t('shared_success'), 'success');
        } else {
            await navigator.clipboard.writeText(sourceUrl || window.location.href);
            showToast(t('product_link_copied'), 'success');
        }
    } catch (error) {
        if (error.name !== 'AbortError') showToast(t('cannot_share'), 'error');
    }
}

async function handleUseResultAsModel() {
    const resultImage = $('inline-result-image');
    if (!resultImage?.src) { showToast(t('no_image'), 'error'); return; }
    try {
        showToast(t('saving_as_model'), 'info');
        await addUserModel(resultImage.src, 'tryon_result');
        state.modelImage = resultImage.src;
        updateUI();
        showToast(t('model_saved'), 'success');
        hideResultInline();
        elements.modelImageContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        showToast(t('error_occurred'), 'error');
    }
}

async function handleResultRegenerate() {
    const editBtn = $('result-regenerate-btn');
    if (editBtn) {
        const originalHtml = editBtn.innerHTML;
        editBtn.innerHTML = '<span class="material-symbols-outlined spin">refresh</span> Đang xử lý...';
        editBtn.disabled = true;
    }

    // We already have state.modelImage and state.clothingImage populated for the current session
    // So we just need to trigger try-on again
    if (state.modelImage && state.clothingImage) {
        hideResultInline();
        try {
            await processTryOn();
        } finally {
            if (editBtn) {
                editBtn.innerHTML = '<span class="material-symbols-outlined">refresh</span> Thử lại (Regenerate)';
                editBtn.disabled = false;
            }
        }
    } else {
        showToast(t('missing_images', { default: 'Thiếu ảnh người mẫu hoặc quần áo để thử lại' }));
        if (editBtn) {
            editBtn.innerHTML = '<span class="material-symbols-outlined">refresh</span> Thử lại (Regenerate)';
            editBtn.disabled = false;
        }
    }
}

async function handleResultEdit() {
    const editInput = $('inline-edit-input');
    const editBtn = $('inline-edit-btn');
    const undoBtn = $('inline-edit-undo-btn');
    const progressNote = $('edit-progress-note');
    const resultImage = $('inline-result-image');
    const editRequest = editInput?.value?.trim();

    if (!editRequest) { showToast(t('enter_edit_prompt'), 'error'); editInput?.focus(); return; }
    if (!resultImage?.src) { showToast(t('no_image_to_edit'), 'error'); return; }

    // Kiểm tra gems trước khi gửi request
    if (state.gemsBalance < GEM_COST_STANDARD) {
        showToast(t('not_enough_gems') || 'Không đủ gems để chỉnh sửa', 'error');
        return;
    }

    const originalBtnContent = editBtn?.innerHTML;
    const originalImageSrc = resultImage.src;

    // STEP 1: Progress timer
    let elapsed = 0;
    let timerInterval = null;
    const startTimer = () => {
        if (progressNote) progressNote.textContent = 'AI đang chỉnh sửa... 0s';
        timerInterval = setInterval(() => {
            elapsed++;
            if (progressNote) progressNote.textContent = `AI đang chỉnh sửa... ${elapsed}s`;
        }, 1000);
    };
    const stopTimer = () => {
        clearInterval(timerInterval);
        if (progressNote) progressNote.textContent = '';
    };

    // Update undo button visibility helper
    const refreshUndoBtn = () => {
        const result = state.results.find(r => r.id === state.currentResultId);
        const hasHistory = (result?.editHistory?.length || 0) > 0;
        if (undoBtn) undoBtn.classList.toggle('visible', hasHistory);
    };

    try {
        if (editBtn) { editBtn.disabled = true; editBtn.innerHTML = '<span class="edit-spinner"></span>'; }
        startTimer();
        showToast(t('editing_image') || 'Đang chỉnh sửa ảnh...', 'info');

        const response = await chrome.runtime.sendMessage({
            type: 'EDIT_IMAGE',
            data: { imageUrl: resultImage.src, editRequest }
        });

        if (response?.success && response?.resultImage) {
            // STEP 2: Push ảnh cũ vào editHistory TRƯỚC khi cập nhật
            if (state.currentResultId) {
                const result = state.results.find(r => r.id === state.currentResultId);
                if (result) {
                    if (!result.editHistory) result.editHistory = [];
                    result.editHistory.push(originalImageSrc);

                    // STEP 3: Cập nhật imageUrl và lưu vào storage
                    result.imageUrl = response.resultImage;
                    saveResults(); // fix: persist sau mỗi edit
                    renderResultThumbnails();
                }
            }

            resultImage.src = response.resultImage;
            editInput.value = '';

            // Cập nhật gems balance
            if (response.gemsRemaining !== undefined) {
                state.gemsBalance = response.gemsRemaining;
                updateUI();
            }

            refreshUndoBtn();
            showToast(t('edit_success') || '✅ Đã chỉnh sửa thành công', 'success');
        } else {
            showToast('❌ ' + (response?.error || t('edit_error')), 'error');
        }
    } catch (error) {
        showToast(t('edit_error') || 'Lỗi khi chỉnh sửa ảnh', 'error');
    } finally {
        stopTimer();
        if (editBtn) { editBtn.disabled = false; editBtn.innerHTML = originalBtnContent; }
    }
}

/**
 * handleUndoEdit — Hoàn tác bước edit cuối cùng
 * Lấy ảnh trước đó từ result.editHistory và restore lại
 */
async function handleUndoEdit() {
    const undoBtn = $('inline-edit-undo-btn');
    const resultImage = $('inline-result-image');
    if (!resultImage) return;

    const result = state.results.find(r => r.id === state.currentResultId);
    if (!result?.editHistory?.length) {
        showToast('Không có gì để hoàn tác', 'info');
        return;
    }

    // STEP 1: Pop ảnh trước từ history
    const previousImageUrl = result.editHistory.pop();
    result.imageUrl = previousImageUrl;
    resultImage.src = previousImageUrl;

    // STEP 2: Lưu lại và refresh thumbnails
    saveResults();
    renderResultThumbnails();

    // STEP 3: Ẩn nút undo nếu hết history
    const hasHistory = result.editHistory.length > 0;
    if (undoBtn) undoBtn.classList.toggle('visible', hasHistory);

    showToast('↩️ Đã hoàn tác chỉnh sửa', 'success');
}


async function handleReportWrong() {
    const reportBtn = $('report-wrong-btn');
    if (reportBtn?.disabled) return;
    try {
        if (reportBtn) { reportBtn.disabled = true; reportBtn.textContent = '⏳...'; }
        const response = await chrome.runtime.sendMessage({
            type: 'REFUND_GEMS',
            data: { reason: 'User reported wrong image', amount: GEM_COST_STANDARD }
        });
        if (response?.success) {
            state.gemsBalance = response.newBalance !== undefined ? response.newBalance : state.gemsBalance + GEM_COST_STANDARD;
            updateUI();
            showToast(t('refund_success'), 'success');
            if (reportBtn) reportBtn.textContent = t('report_done_btn');
        } else {
            showToast(response?.error || t('error_occurred'), 'error');
            if (reportBtn) { reportBtn.disabled = false; reportBtn.textContent = t('report_wrong_btn'); }
        }
    } catch (error) {
        showToast(t('error_occurred'), 'error');
        if (reportBtn) { reportBtn.disabled = false; reportBtn.textContent = t('report_wrong_btn'); }
    }
}

function deleteResult(id) {
    closeResultPopup(id);
    state.results = state.results.filter(r => r.id !== id);
    saveResults();
    updateGalleryUI();
    showToast(t('result_deleted'), 'success');
}

function clearAllResults() {
    if (!confirm(t('clear_all') + '?')) return;
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
    const displayName = result.name || t('result_number', { index: resultIndex });

    if (state.popupWindows?.has(id)) {
        chrome.windows.update(state.popupWindows.get(id), { focused: true }).catch(() => {
            state.popupWindows.delete(id);
            openResultPopup(id);
        });
        return;
    }

    const popupUrl = chrome.runtime.getURL('popup/result-popup.html') +
        `?imageUrl=${encodeURIComponent(result.imageUrl || '')}` +
        `&name=${encodeURIComponent(displayName)}` +
        `&sourceUrl=${encodeURIComponent(result.sourceUrl || '')}` +
        `&modelUrl=${encodeURIComponent(result.modelUrl || '')}` +
        `&id=${encodeURIComponent(id)}`;

    chrome.windows.create({ url: popupUrl, type: 'popup', width: 420, height: 650, focused: true })
        .then(popupWindow => {
            if (!state.popupWindows) state.popupWindows = new Map();
            state.popupWindows.set(id, popupWindow.id);
            if (!state.activePopups.includes(id)) state.activePopups.push(id);
            renderResultThumbnails();
        }).catch(() => showToast(t('cannot_open_popup'), 'error'));
}

function openProductPage(url) {
    if (!url || !url.startsWith('http')) { showToast(t('no_product_link'), 'error'); return; }
    chrome.tabs.create({ url });
    showToast(t('opening_product'), 'success');
}

async function copyResultImage(imageUrl) {
    try {
        showToast(t('copying_image'), 'info');
        const response = await fetch(imageUrl);
        let blob = await response.blob();
        if (blob.type !== 'image/png') blob = await convertImageToPng(blob);
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast(t('copied_to_clipboard'), 'success');
    } catch (error) {
        try {
            await navigator.clipboard.writeText(imageUrl);
            showToast(t('link_copied'), 'warning');
        } catch (e) {
            showToast(t('cannot_copy'), 'error');
        }
    }
}

function convertImageToPng(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            canvas.toBlob((pngBlob) => {
                URL.revokeObjectURL(img.src);
                pngBlob ? resolve(pngBlob) : reject(new Error('Failed to convert to PNG'));
            }, 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Failed to load image')); };
        img.src = URL.createObjectURL(blob);
    });
}

async function sendToActiveTab(message) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
        console.error('Failed to send to active tab:', error);
    }
}

function closeResultPopup(id) {
    if (state.popupWindows?.has(id)) {
        chrome.windows.remove(state.popupWindows.get(id)).catch(() => { });
        state.popupWindows.delete(id);
    }
    sendToActiveTab({ type: 'CLOSE_RESULT_POPUP', data: { id } }).catch(() => { });
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
            break;
        }
    }
});

async function downloadResultImage(imageUrl) {
    try {
        if (imageUrl.startsWith('data:')) {
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `fitly-tryon-${Date.now()}.png`;
            link.click();
        } else {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `fitly-tryon-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        }
        showToast(t('downloading'), 'success');
    } catch (error) {
        showToast(t('cannot_download'), 'error');
    }
}

async function shareResultImage(imageUrl) {
    if (navigator.share) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'fitly-tryon.png', { type: 'image/png' });
            await navigator.share({ title: 'Fitly Virtual Try-On', text: t('share_text'), files: [file] });
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
                name: t('outfit_date_name', { date: new Date().toLocaleDateString() }),
                result_image_url: result.imageUrl,
                clothing_image_url: result.clothingUrl,
                model_image_url: result.modelUrl
            }
        });
        if (response.success) {
            showToast(t('outfit_saved'), 'success');
            renderCreatedOutfitsList();
        } else {
            showToast(t('outfit_save_error') + ': ' + (response.error || 'Unknown'), 'error');
        }
    } catch (error) {
        showToast(t('outfit_save_error'), 'error');
    } finally {
        showLoading(false);
    }
}

async function renameResult(id) {
    const result = state.results.find(r => r.id === id);
    if (!result) return;
    const resultIndex = state.results.findIndex(r => r.id === id) + 1;
    const currentName = result.name || t('result_number', { index: resultIndex });
    const newName = prompt(t('rename_prompt'), currentName);
    if (newName !== null) {
        const trimmedName = newName.trim();
        result.name = trimmedName || null;
        renderResultThumbnails();
        if (state.activePopups.includes(id)) {
            sendToActiveTab({ type: 'UPDATE_POPUP_NAME', data: { id, name: trimmedName || t('result_number', { index: resultIndex }) } });
        }
        showToast(trimmedName ? t('renamed_to', { name: trimmedName }) : t('name_cleared'), 'success');
    }
}

// ============================================================================
// OUTFIT HISTORY PERSISTENCE
// ============================================================================

function saveHiddenOutfitIds() {
    try {
        localStorage.setItem('fitly_hidden_outfit_ids', JSON.stringify(state.hiddenOutfitIds || []));
    } catch (e) { /* storage full — silently ignore */ }
}

function loadHiddenOutfitIds() {
    try {
        const raw = localStorage.getItem('fitly_hidden_outfit_ids');
        state.hiddenOutfitIds = raw ? JSON.parse(raw) : [];
    } catch (e) {
        state.hiddenOutfitIds = [];
    }
}

// ============================================================================
// OUTFIT HISTORY ACTIONS
// ============================================================================

/**
 * Hide an outfit from the "Outfit vừa tạo" list without deleting it.
 * @param {string} id - Outfit ID
 */
function hideOutfit(id) {
    if (!state.hiddenOutfitIds) state.hiddenOutfitIds = [];
    if (!state.hiddenOutfitIds.includes(id)) {
        state.hiddenOutfitIds.push(id);
        saveHiddenOutfitIds();
    }
    renderCreatedOutfitsList();
    showToast(t('outfit_hidden') || 'Đã ẩn outfit', 'success');
}

/**
 * Remix an outfit — load clothing image back into try-on state.
 * @param {{ id: string, result_image_url: string, clothing_image_url: string, name: string }} outfit
 */
function remixOutfit(outfit) {
    const clothingUrl = outfit.clothing_image_url;
    if (!clothingUrl) {
        showToast(t('remix_no_clothing') || 'Không tìm thấy ảnh quần áo của outfit này', 'warning');
        return;
    }

    // STEP 1: Set clothing image in state
    state.clothingImage = clothingUrl;
    state.clothingSourceUrl = null;

    // STEP 2: Reset selected items and add this as the first item
    state.selectedItems = [{
        id: `remix_${outfit.id}`,
        imageUrl: clothingUrl,
        category: 'top',
        name: outfit.name || 'Remixed'
    }];

    // STEP 3: Update UI - clothing image display
    const clothingImg = document.getElementById('clothing-image');
    const clothingPlaceholder = document.getElementById('clothing-placeholder');
    if (clothingImg) {
        clothingImg.src = clothingUrl;
        clothingImg.classList.remove('hidden');
    }
    if (clothingPlaceholder) clothingPlaceholder.classList.add('hidden');

    // STEP 4: Update selected bubbles & try-on button
    if (window.renderSelectedBubbles) renderSelectedBubbles();
    if (window.updateTryOnButton) updateTryOnButton();

    // STEP 5: Scroll into mix-match section smoothly
    const mixSection = document.querySelector('.mix-match-wrapper');
    if (mixSection) mixSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    showToast(t('outfit_remixed') || `Đã tải lại outfit "${outfit.name || 'Outfit'}" để phối lại`, 'success');
}

/**
 * Toggle showing hidden outfits in the list.
 */
function toggleShowHiddenOutfits() {
    state.showHiddenOutfits = !state.showHiddenOutfits;
    renderCreatedOutfitsList();
}

// ============================================================================
// RENDER
// ============================================================================

async function renderCreatedOutfitsList() {
    const listContainer = document.getElementById('created-outfits-list');
    const section = document.getElementById('created-outfits-list-section');
    if (!listContainer || !section) return;

    // Load persisted hidden IDs on first render
    if (!state.hiddenOutfitIds) loadHiddenOutfitIds();

    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_OUTFITS', data: { limit: 20 } });

        if (response?.success && response.outfits?.length > 0) {
            // STEP 1: Separate hidden / visible outfits
            const allOutfits = response.outfits;
            const hiddenIds = state.hiddenOutfitIds || [];
            const visibleOutfits = state.showHiddenOutfits
                ? allOutfits
                : allOutfits.filter(o => !hiddenIds.includes(String(o.id)));
            const hiddenCount = allOutfits.filter(o => hiddenIds.includes(String(o.id))).length;

            // STEP 2: Update toggle button visibility in header
            const toggleHiddenBtn = document.getElementById('toggle-hidden-outfits-btn');
            if (toggleHiddenBtn) {
                if (hiddenCount > 0) {
                    toggleHiddenBtn.classList.remove('hidden');
                    toggleHiddenBtn.textContent = state.showHiddenOutfits
                        ? (t('hide_hidden') || 'Ẩn đi')
                        : `${t('show_hidden') || 'Hiện ẩn'} (${hiddenCount})`;
                } else {
                    toggleHiddenBtn.classList.add('hidden');
                    state.showHiddenOutfits = false;
                }
            }

            if (visibleOutfits.length === 0 && !state.showHiddenOutfits) {
                // All visible outfits are hidden — still show section with empty state
                section.classList.remove('hidden');
                listContainer.innerHTML = `<div class="outfits-empty-state">
                    <span class="material-symbols-outlined" style="font-size:28px;color:#ccc;">visibility_off</span>
                    <p style="font-size:12px;color:#aaa;margin:4px 0 0">${t('all_outfits_hidden') || 'Tất cả outfit đã bị ẩn'}</p>
                </div>`;
                return;
            }

            section.classList.remove('hidden');
            listContainer.innerHTML = '';

            visibleOutfits.forEach(outfit => {
                const isHidden = hiddenIds.includes(String(outfit.id));

                // STEP 3: Build card element
                const card = document.createElement('div');
                card.className = `horizontal-outfit-card${isHidden ? ' outfit-is-hidden' : ''}`;
                card.dataset.id = outfit.id;

                // Image
                const img = document.createElement('img');
                img.src = outfit.result_image_url;
                img.alt = outfit.name || 'Outfit';
                img.loading = 'lazy';
                img.onerror = function () {
                    if (window.fixBrokenImage) fixBrokenImage(this);
                };

                // Name
                const nameEl = document.createElement('div');
                nameEl.className = 'outfit-card-name';
                nameEl.textContent = outfit.name || 'Outfit';

                // Timestamp
                const timeEl = document.createElement('div');
                timeEl.className = 'outfit-card-time';
                const ts = outfit.created_at ? new Date(outfit.created_at) : null;
                timeEl.textContent = ts ? getTimeAgo(ts.getTime()) : '';

                // Action overlay (hide + remix buttons)
                const actionsEl = document.createElement('div');
                actionsEl.className = 'outfit-card-actions';

                // Source badge (AI vs Web)
                const badgeEl = document.createElement('div');
                const isExternal = outfit.source_type === 'external';
                badgeEl.className = `outfit-source-badge ${isExternal ? 'outfit-source-badge--web' : 'outfit-source-badge--ai'}`;
                badgeEl.textContent = isExternal ? 'Web' : 'AI';

                // Remix button
                const remixBtn = document.createElement('button');
                remixBtn.className = 'outfit-remix-btn';
                remixBtn.title = t('remix_outfit') || 'Phối lại';
                remixBtn.innerHTML = '<span class="material-symbols-outlined">shuffle</span>';
                remixBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    remixOutfit(outfit);
                });

                // Hide/Unhide button
                const hideBtn = document.createElement('button');
                hideBtn.className = 'outfit-hide-btn';
                if (isHidden) {
                    hideBtn.title = t('unhide_outfit') || 'Hiện lại';
                    hideBtn.innerHTML = '<span class="material-symbols-outlined">visibility</span>';
                    hideBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        state.hiddenOutfitIds = (state.hiddenOutfitIds || []).filter(id => id !== String(outfit.id));
                        saveHiddenOutfitIds();
                        renderCreatedOutfitsList();
                        showToast(t('outfit_unhidden') || 'Đã hiện lại outfit', 'success');
                    });
                } else {
                    hideBtn.title = t('hide_outfit') || 'Ẩn outfit';
                    hideBtn.innerHTML = '<span class="material-symbols-outlined">visibility_off</span>';
                    hideBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Animate card out then hide
                        card.classList.add('outfit-hiding');
                        setTimeout(() => hideOutfit(String(outfit.id)), 300);
                    });
                }

                actionsEl.appendChild(remixBtn);
                actionsEl.appendChild(hideBtn);

                // Click card to view inline
                card.addEventListener('click', () => {
                    showResultInline({ imageUrl: outfit.result_image_url, id: outfit.id, name: outfit.name });
                });

                card.appendChild(img);
                card.appendChild(badgeEl);
                card.appendChild(actionsEl);
                card.appendChild(nameEl);
                card.appendChild(timeEl);
                listContainer.appendChild(card);
            });

        } else {
            section.classList.add('hidden');
        }
    } catch (error) {
        console.error('[renderCreatedOutfitsList] Error:', error);
    }
}

// Expose ra window
window.addResult = addResult;
window.showResultInline = showResultInline;
window.hideResultInline = hideResultInline;
window.handleResultDownload = handleResultDownload;
window.handleResultCopy = handleResultCopy;
window.handleResultSave = handleResultSave;
window.handleResultShare = handleResultShare;
window.handleUseResultAsModel = handleUseResultAsModel;
window.handleResultEdit = handleResultEdit;
window.handleReportWrong = handleReportWrong;
window.deleteResult = deleteResult;
window.clearAllResults = clearAllResults;
window.openResultPopup = openResultPopup;
window.closeResultPopup = closeResultPopup;
window.openProductPage = openProductPage;
window.copyResultImage = copyResultImage;
window.sendToActiveTab = sendToActiveTab;
window.downloadResultImage = downloadResultImage;
window.shareResultImage = shareResultImage;
window.saveResultOutfit = saveResultOutfit;
window.renameResult = renameResult;
window.renderCreatedOutfitsList = renderCreatedOutfitsList;
window.hideOutfit = hideOutfit;
window.remixOutfit = remixOutfit;
window.toggleShowHiddenOutfits = toggleShowHiddenOutfits;
window.loadHiddenOutfitIds = loadHiddenOutfitIds;
window.handleUndoEdit = handleUndoEdit;
window.handleResultRegenerate = handleResultRegenerate;
