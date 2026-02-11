/**
 * File: mock-tryon-generator.js
 * Purpose: Giả lập kết quả thử đồ từ extension để test mà không cần AI thật
 * 
 * Features:
 * - Tạo kết quả thử đồ giả với hình ảnh mẫu
 * - Lưu vào lịch sử với data giả
 * - Test UI mà không cần server AI
 * - Dùng cho development và demo
 */

/**
 * Tạo kết quả thử đồ giả cho testing
 */
function generateMockTryOnResult(userImageUrl, clothingImageUrl, userId = 'demo-user') {
    // Danh sách hình ảnh kết quả mẫu
    const mockResults = [
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=600&fit=crop',
        'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=400&h=600&fit=crop',
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=600&fit=crop',
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=600&fit=crop',
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop',
        'https://images.unsplash.com/photo-1506629905607-d405b8a30db1?w=400&h=600&fit=crop'
    ];

    // Chọn ngẫu nhiên một kết quả
    const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
    
    // Tạo data giả
    const mockData = {
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        user_image_url: userImageUrl,
        clothing_image_url: clothingImageUrl,
        result_image_url: randomResult,
        status: 'completed',
        confidence_score: Math.random() * 0.3 + 0.7, // 0.7 - 1.0
        processing_time: Math.floor(Math.random() * 3000) + 2000, // 2-5 giây
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_favorite: false,
        clothing_info: {
            name: 'Áo thun basic',
            category: 'top',
            color: 'trắng',
            brand: 'Demo Brand'
        }
    };

    return mockData;
}

/**
 * Tạo kết quả thử đồ giả với delay để giả vờ processing
 */
async function generateMockTryOnWithDelay(userImageUrl, clothingImageUrl, userId = 'demo-user', delay = 3000) {
    console.log('[MockTryOn] Starting mock try-on process...');
    
    // Giả vờ processing
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const result = generateMockTryOnResult(userImageUrl, clothingImageUrl, userId);
    
    console.log('[MockTryOn] Mock try-on completed:', result.id);
    return result;
}

/**
 * Thêm kết quả giả vào lịch sử extension
 */
async function saveMockTryOnToHistory(mockResult) {
    try {
        // Lấy lịch sử hiện tại
        const { history = [] } = await chrome.storage.local.get('history');
        
        // Thêm kết quả mới vào đầu
        const newHistory = [mockResult, ...history].slice(0, 50); // Giới hạn 50 items
        
        // Lưu lại
        await chrome.storage.local.set({ history: newHistory });
        
        // Cập nhật UI nếu cần
        chrome.runtime.sendMessage({ 
            type: 'HISTORY_UPDATED', 
            history: newHistory 
        }).catch(() => {});
        
        console.log('[MockTryOn] Saved to history:', mockResult.id);
        return true;
        
    } catch (error) {
        console.error('[MockTryOn] Error saving to history:', error);
        return false;
    }
}

/**
 * Tạo mock try-on từ extension popup/sidebar
 */
async function mockTryOnFromExtension(userImageUrl, clothingImageUrl) {
    console.log('[MockTryOn] Starting mock try-on from extension...');
    
    try {
        // Hiển thị loading
        showLoadingState();
        
        // Tạo kết quả giả
        const result = await generateMockTryOnWithDelay(
            userImageUrl, 
            clothingImageUrl, 
            'extension-user'
        );
        
        // Lưu vào lịch sử
        await saveMockTryOnToHistory(result);
        
        // Hiển thị kết quả
        showTryOnResult(result);
        
        return result;
        
    } catch (error) {
        console.error('[MockTryOn] Error in mock try-on:', error);
        showErrorState('Không thể tạo kết quả thử đồ. Vui lòng thử lại.');
        throw error;
    }
}

/**
 * Hiển thị trạng thái loading
 */
function showLoadingState() {
    // Cập nhật UI để hiển thị loading
    const loadingHtml = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang xử lý ảnh thử đồ...</p>
            <p class="small">AI đang phân tích và tạo kết quả</p>
        </div>
    `;
    
    // Cập nhật UI trong popup/sidebar
    document.getElementById('result-container').innerHTML = loadingHtml;
}

/**
 * Hiển thị kết quả thử đồ
 */
function showTryOnResult(result) {
    const resultHtml = `
        <div class="tryon-result">
            <div class="result-header">
                <h3>Kết quả thử đồ</h3>
                <span class="confidence">${Math.round(result.confidence_score * 100)}%</span>
            </div>
            <div class="result-image">
                <img src="${result.result_image_url}" alt="Kết quả thử đồ" />
            </div>
            <div class="clothing-info">
                <p><strong>${result.clothing_info.name}</strong></p>
                <p>${result.clothing_info.color} • ${result.clothing_info.category}</p>
            </div>
            <div class="result-actions">
                <button onclick="saveToWardrobe('${result.id}')" class="save-btn">
                    💾 Lưu vào tủ đồ
                </button>
                <button onclick="shareResult('${result.id}')" class="share-btn">
                    📤 Chia sẻ
                </button>
            </div>
            <div class="processing-time">
                Thời gian xử lý: ${(result.processing_time / 1000).toFixed(1)}s
            </div>
        </div>
    `;
    
    document.getElementById('result-container').innerHTML = resultHtml;
}

/**
 * Hiển thị lỗi
 */
function showErrorState(errorMessage) {
    const errorHtml = `
        <div class="error-state">
            <div class="error-icon">❌</div>
            <p>${errorMessage}</p>
            <button onclick="retryMockTryOn()" class="retry-btn">
                Thử lại
            </button>
        </div>
    `;
    
    document.getElementById('result-container').innerHTML = errorHtml;
}

/**
 * Lưu vào tủ đồ (mock)
 */
async function saveToWardrobe(resultId) {
    console.log('[MockTryOn] Saving to wardrobe:', resultId);
    
    // Giả vờ lưu vào tủ đồ
    await new Promise(resolve => setTimeout(resolve, 500));
    
    alert('✅ Đã lưu vào tủ đồ!');
}

/**
 * Chia sẻ kết quả (mock)
 */
async function shareResult(resultId) {
    console.log('[MockTryOn] Sharing result:', resultId);
    
    // Copy link hoặc mở share dialog
    const shareUrl = `${window.location.origin}/share/${resultId}`;
    
    if (navigator.share) {
        await navigator.share({
            title: 'Kết quả thử đồ của tôi',
            text: 'Xem kết quả thử đồ AI của tôi!',
            url: shareUrl
        });
    } else {
        // Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('📋 Đã copy link chia sẻ!');
    }
}

/**
 * Thử lại mock try-on
 */
async function retryMockTryOn() {
    // Lấy lại thông tin ảnh từ state
    const lastTryOn = await chrome.storage.local.get(['last_user_image', 'last_clothing_image']);
    
    if (lastTryOn.last_user_image && lastTryOn.last_clothing_image) {
        await mockTryOnFromExtension(
            lastTryOn.last_user_image,
            lastTryOn.last_clothing_image
        );
    } else {
        alert('Không tìm thấy ảnh để thử lại. Vui lòng chọn ảnh mới.');
    }
}

/**
 * Export functions để sử dụng trong extension
 */
window.MockTryOn = {
    generateMockTryOnResult,
    generateMockTryOnWithDelay,
    saveMockTryOnToHistory,
    mockTryOnFromExtension,
    showLoadingState,
    showTryOnResult,
    showErrorState
};

console.log('[MockTryOn] Mock try-on generator loaded successfully!');