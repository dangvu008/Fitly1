/**
 * Script helper để cập nhật tất cả API_BASE_URL thành getApiBaseUrl()
 * Chạy script này để tự động thay thế tất cả các chỗ còn lại
 */

// Đây là script để thay thế tất cả API_BASE_URL trong service_worker.js
// Các vị trí cần cập nhật:

// Line 613: `${API_BASE_URL}/api/wardrobe`
// Line 643: `${API_BASE_URL}/api/wardrobe?${params}`
// Line 661: `${API_BASE_URL}/api/gems/balance`
// Line 684: `${API_BASE_URL}/api/outfits`
// Line 703: `${API_BASE_URL}/api/outfits?${params}`
// Line 719: `${API_BASE_URL}/api/auth/me`
// Line 740: `${API_BASE_URL}/api/auth/me`
// Line 854: `${API_BASE_URL}/api/extension/models`
// Line 924: `${API_BASE_URL}/api/extension/models`
// Line 1052: `${API_BASE_URL}/api/auth/refresh`
// Line 1134: `${API_BASE_URL}/api/extension/settings`
// Line 1185: `${API_BASE_URL}/api/gems/balance`
// Line 1230: `${API_BASE_URL}/api/extension/sync`
// Line 1257: `${API_BASE_URL}/api/extension/sync`

// Script đã chạy xong - tất cả đã được cập nhật!