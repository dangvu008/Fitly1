/**
 * File: image_cache_db.js
 * Purpose: IndexedDB module để cache ảnh quần áo/phụ kiện locally
 * Layer: Infrastructure
 *
 * Data Contract:
 * - Input: image key (string), image URL hoặc data URL
 * - Output: base64 data URL string hoặc null
 *
 * Flow:
 * 1. Mở/tạo IndexedDB 'fitly_image_cache'
 * 2. Store 'images' chứa { key, data, cachedAt, sizeBytes }
 * 3. cacheImage() fetch → blob → base64 → lưu IDB
 * 4. getCachedImage() trả về base64 hoặc null
 * 5. Auto cleanup ảnh > 30 ngày
 */

const IMAGE_CACHE_DB_NAME = 'fitly_image_cache';
const IMAGE_CACHE_STORE = 'images';
const IMAGE_CACHE_VERSION = 1;
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

let _dbInstance = null;

/**
 * Mở hoặc tạo IndexedDB instance
 */
function openCacheDB() {
    if (_dbInstance) return Promise.resolve(_dbInstance);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IMAGE_CACHE_DB_NAME, IMAGE_CACHE_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(IMAGE_CACHE_STORE)) {
                const store = db.createObjectStore(IMAGE_CACHE_STORE, { keyPath: 'key' });
                store.createIndex('cachedAt', 'cachedAt', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            _dbInstance = event.target.result;
            resolve(_dbInstance);
        };

        request.onerror = (event) => {
            console.error('[Fitly Cache] DB open error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Chuyển image URL thành base64 data URL
 * Hỗ trợ: HTTP URLs, data: URLs, blob: URLs
 */
async function imageUrlToBase64(imageUrl) {
    // Đã là data URL → trả về ngay
    if (imageUrl.startsWith('data:')) {
        return imageUrl;
    }

    try {
        const response = await fetch(imageUrl, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn('[Fitly Cache] Cannot fetch image:', imageUrl, error.message);
        return null;
    }
}

/**
 * Cache ảnh vào IndexedDB
 * @param {string} key - Unique key (VD: 'clothing-123456')
 * @param {string} imageUrl - URL hoặc data URL của ảnh
 * @returns {string|null} base64 data URL nếu thành công
 */
async function cacheImage(key, imageUrl) {
    try {
        const base64 = await imageUrlToBase64(imageUrl);
        if (!base64) return null;

        const db = await openCacheDB();
        const tx = db.transaction(IMAGE_CACHE_STORE, 'readwrite');
        const store = tx.objectStore(IMAGE_CACHE_STORE);

        const record = {
            key: key,
            data: base64,
            originalUrl: imageUrl,
            cachedAt: Date.now(),
            sizeBytes: base64.length,
        };

        await new Promise((resolve, reject) => {
            const request = store.put(record);
            request.onsuccess = resolve;
            request.onerror = reject;
        });

        console.log('[Fitly Cache] Cached image:', key, `(${Math.round(base64.length / 1024)}KB)`);
        return base64;
    } catch (error) {
        console.warn('[Fitly Cache] Cache failed for:', key, error.message);
        return null;
    }
}

/**
 * Lấy ảnh đã cache từ IndexedDB
 * @param {string} key - Unique key
 * @returns {string|null} base64 data URL hoặc null
 */
async function getCachedImage(key) {
    try {
        const db = await openCacheDB();
        const tx = db.transaction(IMAGE_CACHE_STORE, 'readonly');
        const store = tx.objectStore(IMAGE_CACHE_STORE);

        return new Promise((resolve) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const record = request.result;
                if (!record) {
                    resolve(null);
                    return;
                }

                // Check hết hạn
                if (Date.now() - record.cachedAt > MAX_CACHE_AGE_MS) {
                    removeCachedImage(key); // Xóa ảnh hết hạn
                    resolve(null);
                    return;
                }

                resolve(record.data);
            };
            request.onerror = () => resolve(null);
        });
    } catch (error) {
        console.warn('[Fitly Cache] Get failed for:', key, error.message);
        return null;
    }
}

/**
 * Xóa ảnh khỏi cache
 */
async function removeCachedImage(key) {
    try {
        const db = await openCacheDB();
        const tx = db.transaction(IMAGE_CACHE_STORE, 'readwrite');
        tx.objectStore(IMAGE_CACHE_STORE).delete(key);
    } catch (error) {
        console.warn('[Fitly Cache] Remove failed:', key, error.message);
    }
}

/**
 * Xóa toàn bộ cache
 */
async function clearAllCachedImages() {
    try {
        const db = await openCacheDB();
        const tx = db.transaction(IMAGE_CACHE_STORE, 'readwrite');
        tx.objectStore(IMAGE_CACHE_STORE).clear();
        console.log('[Fitly Cache] All images cleared');
    } catch (error) {
        console.warn('[Fitly Cache] Clear failed:', error.message);
    }
}

/**
 * Dọn dẹp cache cũ (hết hạn)
 */
async function cleanupExpiredCache() {
    try {
        const db = await openCacheDB();
        const tx = db.transaction(IMAGE_CACHE_STORE, 'readwrite');
        const store = tx.objectStore(IMAGE_CACHE_STORE);
        const index = store.index('cachedAt');
        const cutoff = Date.now() - MAX_CACHE_AGE_MS;

        const request = index.openCursor(IDBKeyRange.upperBound(cutoff));
        let removedCount = 0;

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                removedCount++;
                cursor.continue();
            } else if (removedCount > 0) {
                console.log('[Fitly Cache] Cleaned up', removedCount, 'expired images');
            }
        };
    } catch (error) {
        console.warn('[Fitly Cache] Cleanup failed:', error.message);
    }
}

/**
 * Lấy thống kê cache
 */
async function getCacheStats() {
    try {
        const db = await openCacheDB();
        const tx = db.transaction(IMAGE_CACHE_STORE, 'readonly');
        const store = tx.objectStore(IMAGE_CACHE_STORE);

        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const records = request.result || [];
                const totalSize = records.reduce((sum, r) => sum + (r.sizeBytes || 0), 0);
                resolve({
                    count: records.length,
                    totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
                });
            };
            request.onerror = () => resolve({ count: 0, totalSizeMB: 0 });
        });
    } catch (error) {
        return { count: 0, totalSizeMB: 0 };
    }
}

// Expose globally
window.imageCache = {
    cacheImage,
    getCachedImage,
    removeCachedImage,
    clearAllCachedImages,
    cleanupExpiredCache,
    getCacheStats,
};
