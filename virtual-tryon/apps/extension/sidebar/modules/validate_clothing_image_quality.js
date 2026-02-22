/**
 * File: validate_clothing_image_quality.js
 * Purpose: Kiểm tra chất lượng ảnh quần áo 2 tầng trước khi thử đồ
 * Layer: Application (Validation)
 *
 * Input: imageUrl (string) hoặc items[] (array of selected items)
 * Output: { warnings: string[], score: number } hoặc { proceed: boolean }
 *
 * Flow:
 * 1. quickValidateClothingImage → Canvas-based checks khi chọn item (Tier 1)
 * 2. deepValidateBeforeTryOn → Aggregate check trước khi bấm Try-On (Tier 2)
 * 3. showImageQualityWarning → Hiện banner cảnh báo (dismissible)
 *
 * Edge Cases: CORS blocked images, data: URLs, blob: URLs
 * Security: Không log sensitive image data
 */

// STEP 1: Dismissed warnings tracking — avoid repeating for same URL
if (!state._dismissedQualityWarnings) {
    state._dismissedQualityWarnings = new Set();
}

// ==========================================
// TIER 1: QUICK CLIENT-SIDE VALIDATION
// ==========================================

/**
 * quickValidateClothingImage - Kiểm tra nhanh chất lượng ảnh khi user chọn item
 *
 * Input:  imageUrl (string) — URL hoặc data: URI của ảnh
 * Output: { warnings: string[], passed: boolean }
 *
 * Flow:
 * 1. Load ảnh vào Image element → lấy naturalWidth/Height
 * 2. Check resolution, aspect ratio, kích thước
 * 3. Nếu có thể → vẽ vào Canvas để check blur (Laplacian variance)
 * 4. Trả về danh sách warnings
 */
async function quickValidateClothingImage(imageUrl) {
    // STEP 1: Skip nếu user đã dismiss warning cho URL này
    if (state._dismissedQualityWarnings.has(imageUrl)) {
        return { warnings: [], passed: true };
    }

    const warnings = [];

    try {
        // STEP 2: Load ảnh để lấy dimensions
        const imgInfo = await loadImageForValidation(imageUrl);
        if (!imgInfo) {
            // Không load được — có thể CORS block, skip validation
            return { warnings: [], passed: true };
        }

        const { width, height, img } = imgInfo;

        // STEP 3: Check resolution — quá nhỏ
        if (width < 100 || height < 100) {
            warnings.push({
                type: 'too_small',
                severity: 'high',
                message: t('quality_warning.too_small') || '⚠️ Ảnh quá nhỏ — có thể là thumbnail hoặc icon'
            });
        } else if (width < 250 && height < 250) {
            warnings.push({
                type: 'low_resolution',
                severity: 'medium',
                message: t('quality_warning.low_resolution') || '⚠️ Ảnh độ phân giải thấp — kết quả có thể không tốt'
            });
        }

        // STEP 4: Check aspect ratio bất thường (banner, header, strip)
        const ratio = width / height;
        if (ratio > 4 || ratio < 0.25) {
            warnings.push({
                type: 'unusual_ratio',
                severity: 'medium',
                message: t('quality_warning.unusual_ratio') || '⚠️ Tỷ lệ ảnh bất thường — có thể là banner, không phải ảnh sản phẩm'
            });
        }

        // STEP 5: Check ảnh vuông nhỏ (icon/logo)
        if (Math.abs(ratio - 1) < 0.15 && width < 200 && height < 200) {
            warnings.push({
                type: 'likely_icon',
                severity: 'high',
                message: t('quality_warning.likely_icon') || '⚠️ Có thể là icon hoặc logo, không phải ảnh sản phẩm'
            });
        }

        // STEP 6: Canvas-based blur + partial garment detection
        // Thử trực tiếp trước, nếu CORS block → dùng fetchImageViaBackground bypass
        let analysisResult = null;
        try {
            analysisResult = analyzeImageSharpness(img, width, height);
        } catch (canvasErr) {
            // Canvas bị tainted bởi CORS → thử bypass qua background fetch
            if (window.fetchImageViaBackground && imageUrl.startsWith('http')) {
                try {
                    const dataUrl = await fetchImageViaBackground(imageUrl);
                    if (dataUrl) {
                        const bgImg = await loadImageForValidation(dataUrl);
                        if (bgImg) {
                            analysisResult = analyzeImageSharpness(bgImg.img, bgImg.width, bgImg.height);
                        }
                    }
                } catch (_bgErr) {
                    // Background fetch also failed → skip analysis
                }
            }
        }

        if (analysisResult) {
            if (analysisResult.isBlurry) {
                warnings.push({
                    type: 'blurry',
                    severity: 'medium',
                    message: t('quality_warning.blurry') || '⚠️ Ảnh bị mờ — chất lượng thử đồ có thể giảm'
                });
            }
            if (analysisResult.isPartialGarment) {
                warnings.push({
                    type: 'partial_garment',
                    severity: 'high',
                    message: t('quality_warning.partial_garment') || '⚠️ Ảnh có vẻ chỉ là chi tiết sản phẩm (zoom sát), không phải toàn bộ quần áo'
                });
            }
        }
    } catch (error) {
        console.warn('[Fitly Quality] Validation error (non-blocking):', error.message);
        return { warnings: [], passed: true };
    }

    // STEP 7: Show warning nếu có
    if (warnings.length > 0) {
        showImageQualityWarning(warnings, imageUrl);
    }

    return {
        warnings,
        passed: warnings.filter(w => w.severity === 'high').length === 0
    };
}

// ==========================================
// TIER 2: DEEP VALIDATION BEFORE TRY-ON
// ==========================================

/**
 * deepValidateBeforeTryOn - Kiểm tra kỹ tất cả items trước khi try-on
 *
 * Input:  items[] — state.selectedItems
 * Output: { proceed: boolean, warnings: object[] }
 *
 * Flow:
 * 1. Re-check từng item bằng quickValidate
 * 2. Nếu có warnings severity HIGH → hiện confirmation dialog
 * 3. User chọn Tiếp tục hoặc Hủy
 */
async function deepValidateBeforeTryOn(items) {
    if (!items || items.length === 0) {
        return { proceed: true, warnings: [] };
    }

    const allWarnings = [];

    // STEP 1: Validate từng item
    for (const item of items) {
        // Skip items đã được dismiss
        if (state._dismissedQualityWarnings.has(item.imageUrl)) continue;

        try {
            const imgInfo = await loadImageForValidation(item.imageUrl);
            if (!imgInfo) continue;

            const { width, height, img } = imgInfo;
            const itemWarnings = [];

            // Re-run checks (same as Tier 1 nhưng không show toast)
            if (width < 100 || height < 100) {
                itemWarnings.push({
                    type: 'too_small',
                    severity: 'high',
                    message: `"${item.name || 'Item'}" — ảnh quá nhỏ (${width}×${height}px)`
                });
            } else if (width < 250 && height < 250) {
                itemWarnings.push({
                    type: 'low_resolution',
                    severity: 'medium',
                    message: `"${item.name || 'Item'}" — độ phân giải thấp (${width}×${height}px)`
                });
            }

            const ratio = width / height;
            if (ratio > 4 || ratio < 0.25) {
                itemWarnings.push({
                    type: 'unusual_ratio',
                    severity: 'medium',
                    message: `"${item.name || 'Item'}" — tỷ lệ ảnh bất thường`
                });
            }

            // Canvas analysis with CORS bypass
            let deepAnalysis = null;
            try {
                deepAnalysis = analyzeImageSharpness(img, width, height);
            } catch (_corsErr) {
                if (window.fetchImageViaBackground && item.imageUrl.startsWith('http')) {
                    try {
                        const dataUrl = await fetchImageViaBackground(item.imageUrl);
                        if (dataUrl) {
                            const bgImg = await loadImageForValidation(dataUrl);
                            if (bgImg) deepAnalysis = analyzeImageSharpness(bgImg.img, bgImg.width, bgImg.height);
                        }
                    } catch (_) { /* skip */ }
                }
            }
            if (deepAnalysis) {
                if (deepAnalysis.isBlurry) {
                    itemWarnings.push({
                        type: 'blurry',
                        severity: 'medium',
                        message: `"${item.name || 'Item'}" — ảnh bị mờ`
                    });
                }
                if (deepAnalysis.isPartialGarment) {
                    itemWarnings.push({
                        type: 'partial_garment',
                        severity: 'high',
                        message: `"${item.name || 'Item'}" — có vẻ chỉ là chi tiết sản phẩm, không phải toàn bộ quần áo`
                    });
                }
            }

            if (itemWarnings.length > 0) {
                allWarnings.push({ item, warnings: itemWarnings });
            }
        } catch (e) {
            // Skip validation errors — non-blocking
        }
    }

    // STEP 2: Nếu không có warnings → proceed
    if (allWarnings.length === 0) {
        return { proceed: true, warnings: [] };
    }

    // STEP 3: Có warnings → hiện dialog xác nhận
    const hasHighSeverity = allWarnings.some(w =>
        w.warnings.some(ww => ww.severity === 'high')
    );

    // Nếu chỉ có medium warnings → vẫn proceed nhưng show toast
    if (!hasHighSeverity) {
        const summaryMsg = allWarnings.flatMap(w => w.warnings.map(ww => ww.message)).join('\n');
        showToast('⚠️ ' + (t('quality_warning.minor_issues') || 'Một số ảnh có chất lượng không tối ưu'), 'warning');
        return { proceed: true, warnings: allWarnings };
    }

    // High severity → dialog
    return new Promise((resolve) => {
        showTryOnQualityDialog(allWarnings, resolve);
    });
}

// ==========================================
// IMAGE ANALYSIS UTILITIES
// ==========================================

/**
 * loadImageForValidation - Load ảnh vào Image element để lấy dimensions
 * Trả về null nếu không load được (timeout 5s)
 */
function loadImageForValidation(imageUrl) {
    return new Promise((resolve) => {
        if (!imageUrl) { resolve(null); return; }

        const img = new Image();
        const timeoutId = setTimeout(() => {
            img.src = '';
            resolve(null);
        }, 5000);

        // Cho phép vẽ canvas nếu server hỗ trợ CORS
        if (imageUrl.startsWith('http')) {
            img.crossOrigin = 'anonymous';
        }

        img.onload = () => {
            clearTimeout(timeoutId);
            resolve({
                img,
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };

        img.onerror = () => {
            clearTimeout(timeoutId);
            // Retry không có crossOrigin (nhiều server chặn CORS)
            if (img.crossOrigin && imageUrl.startsWith('http')) {
                const img2 = new Image();
                const timeout2 = setTimeout(() => resolve(null), 3000);
                img2.onload = () => {
                    clearTimeout(timeout2);
                    resolve({
                        img: img2,
                        width: img2.naturalWidth,
                        height: img2.naturalHeight
                    });
                };
                img2.onerror = () => { clearTimeout(timeout2); resolve(null); };
                img2.src = imageUrl;
            } else {
                resolve(null);
            }
        };

        img.src = imageUrl;
    });
}

/**
 * analyzeImageSharpness - Phân tích độ nét và tính chất ảnh bằng Canvas
 *
 * Sử dụng Laplacian variance để đo sharpness:
 * - Variance thấp → ảnh mờ hoặc ít chi tiết
 * - Kết hợp với edge density để phát hiện gần cảnh (zoom sát)
 *
 * Input: img (Image element đã load), width, height
 * Output: { isBlurry: boolean, isPartialGarment: boolean, variance: number }
 */
function analyzeImageSharpness(img, width, height) {
    // STEP 1: Scale ảnh xuống để xử lý nhanh (max 200px chiều dài nhất)
    const maxDim = 200;
    const scale = Math.min(maxDim / width, maxDim / height, 1);
    const sw = Math.round(width * scale);
    const sh = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, sw, sh);

    // STEP 2: Lấy grayscale pixel data
    const imageData = ctx.getImageData(0, 0, sw, sh);
    const pixels = imageData.data;
    const gray = new Float32Array(sw * sh);

    for (let i = 0; i < sw * sh; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // STEP 3: Laplacian filter (3x3 kernel: [0,1,0; 1,-4,1; 0,1,0])
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    let edgeCount = 0;
    const edgeThreshold = 30;

    for (let y = 1; y < sh - 1; y++) {
        for (let x = 1; x < sw - 1; x++) {
            const idx = y * sw + x;
            const lap = gray[idx - sw] + gray[idx + sw] + gray[idx - 1] + gray[idx + 1] - 4 * gray[idx];
            sum += lap;
            sumSq += lap * lap;
            count++;
            if (Math.abs(lap) > edgeThreshold) edgeCount++;
        }
    }

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);
    const edgeDensity = edgeCount / count;

    // STEP 4: Color uniformity analysis
    // Ảnh zoom sát vải thường có std deviation màu rất thấp (đồng màu)
    const colorStats = analyzeColorUniformity(pixels, sw * sh);

    // STEP 5: Phân tích kết quả
    // Blur threshold: variance < 80 → mờ (tuned empirically)
    const isBlurry = variance < 80 && width >= 200 && height >= 200;

    // Partial garment detection — multi-signal approach:
    // Signal 1: Low edge density (ít cạnh phân tán = plain fabric hoặc zoom sát)
    // Signal 2: Low color std deviation (đồng màu = zoom vào 1 vùng vải)
    // Signal 3: Low entropy (ít thông tin visual = ảnh đơn điệu)
    const isLargeEnough = width * height > 90000; // > 300x300
    const hasLowEdgeDensity = edgeDensity < 0.08; // Nâng từ 0.05 → 0.08
    const hasLowColorVariance = colorStats.stdDev < 25;
    const hasLowEntropy = colorStats.entropy < 5.5;

    // Kết hợp signals: cần ≥ 2 signals + isLargeEnough
    const partialSignals = [hasLowEdgeDensity, hasLowColorVariance, hasLowEntropy].filter(Boolean).length;
    const isPartialGarment = isLargeEnough && partialSignals >= 2 && variance < 300;

    return {
        isBlurry, isPartialGarment,
        variance: Math.round(variance), edgeDensity,
        colorStdDev: Math.round(colorStats.stdDev),
        entropy: Math.round(colorStats.entropy * 100) / 100,
        partialSignals
    };
}

/**
 * analyzeColorUniformity - Tính std deviation và entropy của pixel colors
 *
 * Ảnh zoom sát vải: std deviation thấp (< 25), entropy thấp (< 5.5)
 * Ảnh full garment: std deviation cao hơn (viền, pattern, nền), entropy cao hơn
 *
 * Input: pixels (Uint8ClampedArray RGBA), pixelCount
 * Output: { stdDev: number, entropy: number }
 */
function analyzeColorUniformity(pixels, pixelCount) {
    // STEP 1: Tính mean RGB
    let sumR = 0, sumG = 0, sumB = 0;
    for (let i = 0; i < pixelCount; i++) {
        sumR += pixels[i * 4];
        sumG += pixels[i * 4 + 1];
        sumB += pixels[i * 4 + 2];
    }
    const meanR = sumR / pixelCount;
    const meanG = sumG / pixelCount;
    const meanB = sumB / pixelCount;

    // STEP 2: Tính std deviation (combined across RGB channels)
    let sumSqDiff = 0;
    for (let i = 0; i < pixelCount; i++) {
        const dr = pixels[i * 4] - meanR;
        const dg = pixels[i * 4 + 1] - meanG;
        const db = pixels[i * 4 + 2] - meanB;
        sumSqDiff += (dr * dr + dg * dg + db * db) / 3;
    }
    const stdDev = Math.sqrt(sumSqDiff / pixelCount);

    // STEP 3: Tính entropy (Shannon entropy trên grayscale histogram)
    // Histogram 64 bins (quantize 256 → 64 để giảm noise)
    const bins = 64;
    const histogram = new Uint32Array(bins);
    for (let i = 0; i < pixelCount; i++) {
        const gray = Math.round(0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2]);
        const bin = Math.min(Math.floor(gray / (256 / bins)), bins - 1);
        histogram[bin]++;
    }

    let entropy = 0;
    for (let i = 0; i < bins; i++) {
        if (histogram[i] > 0) {
            const p = histogram[i] / pixelCount;
            entropy -= p * Math.log2(p);
        }
    }

    return { stdDev, entropy };
}

// ==========================================
// UI: WARNING BANNER
// ==========================================

/**
 * showImageQualityWarning - Hiện banner cảnh báo chất lượng ảnh (dismissible)
 *
 * Input: warnings[] — mảng { type, severity, message }
 *        imageUrl — URL ảnh để tracking dismiss
 */
function showImageQualityWarning(warnings, imageUrl) {
    // Remove existing warning banner
    const existing = document.querySelector('.image-quality-warning');
    if (existing) existing.remove();

    const highWarnings = warnings.filter(w => w.severity === 'high');
    const medWarnings = warnings.filter(w => w.severity === 'medium');
    const isHigh = highWarnings.length > 0;

    const banner = document.createElement('div');
    banner.className = `image-quality-warning ${isHigh ? 'severity-high' : 'severity-medium'}`;

    const messagesHtml = warnings.map(w => `<span class="qw-item">${w.message}</span>`).join('');

    banner.innerHTML = `
        <div class="qw-content">
            <span class="qw-icon">${isHigh ? '⚠️' : '💡'}</span>
            <div class="qw-messages">${messagesHtml}</div>
        </div>
        <div class="qw-actions">
            <button class="qw-dismiss-btn" title="${t('quality_warning.false_positive') || 'Lọc sai? Bỏ qua'}">
                ${t('quality_warning.ignore') || 'Bỏ qua'}
            </button>
            <button class="qw-close-btn" title="${t('close') || 'Đóng'}">×</button>
        </div>
    `;

    // Event: dismiss (mark URL as false positive)
    banner.querySelector('.qw-dismiss-btn').addEventListener('click', () => {
        state._dismissedQualityWarnings.add(imageUrl);
        banner.remove();
        showToast(t('quality_warning.dismissed') || '✓ Đã bỏ qua cảnh báo cho ảnh này', 'info');
    });

    // Event: close (just hide, no tracking)
    banner.querySelector('.qw-close-btn').addEventListener('click', () => {
        banner.remove();
    });

    // Auto-hide after 8 seconds for medium warnings
    if (!isHigh) {
        setTimeout(() => banner.remove(), 8000);
    }

    // Insert banner below clothing image container
    const clothingContainer = document.getElementById('clothing-image-container');
    if (clothingContainer && clothingContainer.parentElement) {
        clothingContainer.parentElement.insertBefore(banner, clothingContainer.nextSibling);
    } else {
        document.body.appendChild(banner);
    }
}

// ==========================================
// UI: TRY-ON QUALITY CONFIRM DIALOG
// ==========================================

/**
 * showTryOnQualityDialog - Dialog xác nhận trước try-on khi có vấn đề quality
 *
 * Input: allWarnings[] — grouped by item
 *        resolve(callback) — resolve Promise với { proceed: boolean }
 */
function showTryOnQualityDialog(allWarnings, resolve) {
    const existing = document.querySelector('.tryon-quality-dialog');
    if (existing) existing.remove();

    const warningListHtml = allWarnings.flatMap(w =>
        w.warnings.map(ww =>
            `<li class="tqd-warning-item ${ww.severity}">
                <span class="tqd-severity-dot"></span>
                ${ww.message}
            </li>`
        )
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'tryon-quality-dialog';
    overlay.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content tqd-content">
            <div class="tqd-header">
                <span class="tqd-icon">⚠️</span>
                <h3>${t('quality_warning.dialog_title') || 'Ảnh có thể ảnh hưởng kết quả'}</h3>
            </div>
            <p class="tqd-subtitle">${t('quality_warning.dialog_subtitle') || 'Một số ảnh đã chọn có vấn đề chất lượng. Kết quả try-on có thể không chính xác.'}</p>
            <ul class="tqd-warning-list">${warningListHtml}</ul>
            <div class="tqd-actions">
                <button class="modal-btn primary" data-action="proceed">
                    ${t('quality_warning.proceed_anyway') || '✨ Vẫn thử đồ'}
                </button>
                <button class="modal-btn secondary" data-action="cancel">
                    ${t('quality_warning.change_items') || '↩ Chọn ảnh khác'}
                </button>
                <button class="modal-btn tertiary" data-action="dismiss-all">
                    ${t('quality_warning.dismiss_all') || '🚫 Không hiện cảnh báo cho các ảnh này'}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('[data-action="proceed"]').addEventListener('click', () => {
        overlay.remove();
        resolve({ proceed: true, warnings: allWarnings });
    });

    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        overlay.remove();
        resolve({ proceed: false, warnings: allWarnings });
    });

    overlay.querySelector('[data-action="dismiss-all"]').addEventListener('click', () => {
        // Dismiss tất cả URLs
        allWarnings.forEach(w => {
            state._dismissedQualityWarnings.add(w.item.imageUrl);
        });
        overlay.remove();
        showToast(t('quality_warning.all_dismissed') || '✓ Đã bỏ qua cảnh báo cho tất cả các ảnh', 'info');
        resolve({ proceed: true, warnings: allWarnings });
    });

    overlay.querySelector('.modal-backdrop').addEventListener('click', () => {
        overlay.remove();
        resolve({ proceed: false, warnings: allWarnings });
    });
}

// ==========================================
// EXPOSE TO WINDOW
// ==========================================
window.quickValidateClothingImage = quickValidateClothingImage;
window.deepValidateBeforeTryOn = deepValidateBeforeTryOn;
window.showImageQualityWarning = showImageQualityWarning;
window.showTryOnQualityDialog = showTryOnQualityDialog;
