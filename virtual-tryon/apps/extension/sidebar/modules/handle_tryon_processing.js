/**
 * File: handle_tryon_processing.js
 * Purpose: Xử lý luồng try-on - validate ảnh, gọi backend, cập nhật gems
 * Layer: Application
 *
 * Input: state.modelImage, state.selectedItems, state.gemsBalance
 * Output: Kết quả try-on thêm vào state.results, gems balance giảm
 *
 * Flow:
 * 1. processTryOn → validate inputs → gọi PROCESS_TRYON
 * 2. validateTryOnResult → check ảnh hợp lệ trước khi trừ gems
 * 3. validateImageUrl → load test image với timeout
 * 4. Nếu ảnh lỗi → refund gems tự động
 */

async function validateImageUrl(imageUrl, timeout = 10000) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return { valid: false, error: 'URL ảnh không hợp lệ' };
    }
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
        return { valid: false, error: 'URL ảnh phải bắt đầu bằng http://, https:// hoặc data:' };
    }

    return new Promise((resolve) => {
        const img = new Image();
        let resolved = false;

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                img.src = '';
                resolve({ valid: false, error: 'Timeout: Ảnh tải quá lâu' });
            }
        }, timeout);

        img.onload = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                    resolve({ valid: false, error: 'Ảnh không có kích thước hợp lệ' });
                } else {
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

        // NOTE: KHÔNG set img.crossOrigin = 'anonymous' — sẽ break validation
        // nếu server không gửi CORS header đúng (vd: Replicate URLs)
        img.src = imageUrl;
    });
}

async function validateTryOnResult(resultImageUrl) {
    const validation = await validateImageUrl(resultImageUrl);
    if (!validation.valid) {
        return { valid: false, error: `Ảnh kết quả lỗi: ${validation.error}. Gems sẽ không bị trừ.` };
    }
    return { valid: true };
}

async function processTryOn(event) {
    if (!state.modelImage || state.selectedItems.length === 0) {
        showToast(t('select_model_and_item'), 'error');
        return;
    }

    if (state.gemsBalance < GEM_COST_STANDARD) {
        showToast(t('error_insufficient_gems'), 'error');
        chrome.tabs.create({ url: 'http://localhost:3000/profile' });
        return;
    }

    // Xác nhận trước khi thử đồ (tiêu gem)
    const itemCount = state.selectedItems.length;
    const confirmed = await showConfirmDialog({
        type: 'tryon',
        icon: '✨',
        title: t('tryon_confirm_title') || 'Thử đồ ngay?',
        message: itemCount > 1
            ? (t('tryon_confirm_multi') || `Thử ${itemCount} món đồ cùng lúc nhé!`)
            : (t('tryon_confirm_single') || 'Bắt đầu thử đồ với AI Fitly!'),
        confirmText: t('tryon_confirm_btn') || '✨ Thử ngay',
        cancelText: t('close') || 'Để sau',
        gemCost: GEM_COST_STANDARD,
    });
    if (!confirmed) return;

    const useMock = event?.shiftKey;
    showLoading(true, useMock ? t('running_simulation') : t('processing'));
    updateProgress(10);

    state.tryonProcessing = true;
    try {
        // Tier 2: Deep quality validation before spending gems
        if (window.deepValidateBeforeTryOn) {
            const qualityCheck = await deepValidateBeforeTryOn(state.selectedItems);
            if (!qualityCheck.proceed) {
                showLoading(false);
                return;
            }
        }

        const progressInterval = setInterval(() => {
            const current = parseInt(elements.loadingProgressBar?.style.width || '10');
            if (current < 85) updateProgress(current + Math.random() * 10);
        }, 800);

        const clothingImagesPayload = state.selectedItems.map(item => ({
            image: item.imageUrl,
            category: item.category || 'top',
            name: item.name || 'Item',
            image_type: item.imageType || 'flat-lay'
        }));

        const response = await chrome.runtime.sendMessage({
            type: 'PROCESS_TRYON',
            data: {
                person_image: state.modelImage,
                clothing_images: clothingImagesPayload,
                clothing_image: state.clothingImage,
                source_url: state.clothingSourceUrl,
                quality: 'standard',
                use_mock: useMock
            }
        });

        clearInterval(progressInterval);
        updateProgress(100);

        if (response.success) {
            updateProgress(95);
            if (elements.loadingText) elements.loadingText.textContent = t('checking_image');

            const imageValidation = await validateTryOnResult(response.result_image_url);

            if (!imageValidation.valid) {
                console.error('[Fitly] Result image validation failed, requesting refund...');
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
                showErrorOverlay(true, imageValidation.error);
                updateUI();
                return;
            }

            const firstClothingUrl = state.selectedItems?.[0]?.imageUrl || state.clothingImage;
            addResult(response.result_image_url, firstClothingUrl, state.modelImage);
            state.gemsBalance -= response.gems_used || GEM_COST_STANDARD;
            await loadUserModels();
            await loadRecentClothing();
            updateUI();
        } else {
            const errorMessage = response.error || t('error_occurred');
            const errorCode = response.errorCode;

            // Xử lý error dựa trên errorCode thay vì keyword matching
            // Chỉ logout khi errorCode === 'AUTH_EXPIRED' (token thực sự hết hạn và refresh fail)
            
            if (errorCode === 'TIMEOUT') {
                // Timeout — Edge Function mất quá lâu, KHÔNG logout
                const timeoutMsg = 'Xử lý ảnh quá lâu. Vui lòng thử lại sau.';
                showToast(timeoutMsg, 'warning');
                showErrorOverlay(true, errorMessage || timeoutMsg);
                return;
            }

            if (errorCode === 'NETWORK_ERROR') {
                // Network error — mất kết nối, KHÔNG logout
                const networkMsg = 'Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.';
                showToast(networkMsg, 'warning');
                showErrorOverlay(true, errorMessage || networkMsg);
                return;
            }

            if (errorCode === 'AUTH_EXPIRED') {
                // Auth expired — token hết hạn và refresh cũng fail → logout user
                showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
                try {
                    const logoutResp = await chrome.runtime.sendMessage({ type: 'LOGOUT' });
                    if (logoutResp?.success) {
                        state.authenticated = false;
                        state.user = null;
                        state.profile = null;
                        state.gemsBalance = 0;
                        if (window.showAuthSection) showAuthSection();
                        updateUI();
                    }
                } catch (_e) { 
                    console.error('[Fitly] Logout failed:', _e);
                }
                return;
            }

            // Other errors — show error overlay, KHÔNG logout
            // Nếu có refund, backend sẽ tự động xử lý và trả về balance mới
            if (response.refunded && response.newBalance !== undefined) {
                state.gemsBalance = response.newBalance;
                updateUI();
            }
            
            showErrorOverlay(true, errorMessage);
        }
    } catch (error) {
        console.error('Try-on error:', error);
        showErrorOverlay(true, t('processing_error'));
    } finally {
        state.tryonProcessing = false;
        showLoading(false);
    }
}

// Expose ra window
window.validateImageUrl = validateImageUrl;
window.validateTryOnResult = validateTryOnResult;
window.processTryOn = processTryOn;
