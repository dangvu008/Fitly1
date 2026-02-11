/**
 * File: mockData.js
 * Purpose: Mock data để test extension không cần đăng nhập
 * Updated: 2026-01-27 - Thêm nhiều data mẫu hơn cho testing
 */

// =====================================================
// MOCK USER DATA
// =====================================================

export const MOCK_USER = {
    id: 'mock-user-001',
    email: 'demo@fitly.app',
};

export const MOCK_PROFILE = {
    id: 'mock-user-001',
    email: 'demo@fitly.app',
    full_name: 'Nguyễn Văn Demo',
    display_name: 'Demo User',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    gems_balance: 50,
    model_image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
    created_at: new Date().toISOString(),
};

// =====================================================
// SAMPLE MODEL IMAGES (người mẫu để thử đồ)
// =====================================================

export const SAMPLE_MODEL_IMAGES = [
    {
        id: 'model-female-1',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
        label: 'Nữ - Casual',
        gender: 'female',
        isDefault: true,
    },
    {
        id: 'model-female-2',
        url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
        label: 'Nữ - Elegant',
        gender: 'female',
        isDefault: false,
    },
    {
        id: 'model-female-3',
        url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
        label: 'Nữ - Street Style',
        gender: 'female',
        isDefault: false,
    },
    {
        id: 'model-male-1',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        label: 'Nam - Casual',
        gender: 'male',
        isDefault: false,
    },
    {
        id: 'model-male-2',
        url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800',
        label: 'Nam - Smart Casual',
        gender: 'male',
        isDefault: false,
    },
];

// =====================================================
// SAMPLE CLOTHING IMAGES (quần áo mẫu theo category)
// =====================================================

export const SAMPLE_CLOTHING = {
    top: [
        { id: 'top-1', url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', label: 'Áo thun trắng basic', brand: 'Uniqlo', color: 'white' },
        { id: 'top-2', url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', label: 'Áo sơ mi xanh', brand: 'Zara', color: 'blue' },
        { id: 'top-3', url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400', label: 'Áo polo đen', brand: 'Lacoste', color: 'black' },
        { id: 'top-4', url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', label: 'Áo hoodie xám', brand: 'Nike', color: 'gray' },
        { id: 'top-5', url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400', label: 'Áo crop top hồng', brand: 'H&M', color: 'pink' },
        { id: 'top-6', url: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400', label: 'Áo blouse trắng', brand: 'Mango', color: 'white' },
    ],
    bottom: [
        { id: 'bottom-1', url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', label: 'Quần jeans xanh', brand: "Levi's", color: 'blue' },
        { id: 'bottom-2', url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400', label: 'Quần kaki be', brand: 'Dockers', color: 'beige' },
        { id: 'bottom-3', url: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400', label: 'Quần short trắng', brand: 'H&M', color: 'white' },
        { id: 'bottom-4', url: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400', label: 'Quần jogger đen', brand: 'Adidas', color: 'black' },
    ],
    dress: [
        { id: 'dress-1', url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', label: 'Váy hoa nhí', brand: 'H&M', color: 'floral' },
        { id: 'dress-2', url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', label: 'Váy liền đen', brand: 'Zara', color: 'black' },
        { id: 'dress-3', url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400', label: 'Váy maxi trắng', brand: 'Mango', color: 'white' },
    ],
    outerwear: [
        { id: 'outerwear-1', url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400', label: 'Áo khoác denim', brand: "Levi's", color: 'blue' },
        { id: 'outerwear-2', url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400', label: 'Cardigan len', brand: 'Uniqlo', color: 'cream' },
        { id: 'outerwear-3', url: 'https://images.unsplash.com/photo-1559551409-dadc959f76b8?w=400', label: 'Bomber jacket', brand: 'Nike', color: 'green' },
    ],
    shoes: [
        { id: 'shoes-1', url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', label: 'Sneakers trắng', brand: 'Nike', color: 'white' },
        { id: 'shoes-2', url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400', label: 'Giày cao gót đen', brand: 'Steve Madden', color: 'black' },
        { id: 'shoes-3', url: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400', label: 'Sandal đế xuồng', brand: 'Charles & Keith', color: 'tan' },
    ],
    accessories: [
        { id: 'acc-1', url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', label: 'Kính râm aviator', brand: 'Ray-Ban', color: 'gold' },
        { id: 'acc-2', url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', label: 'Túi xách mini', brand: 'Coach', color: 'brown' },
        { id: 'acc-3', url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400', label: 'Mũ bucket', brand: 'Adidas', color: 'black' },
    ],
};

// Flat list tất cả clothing (backward compatible)
export const SAMPLE_CLOTHING_IMAGES = [
    ...SAMPLE_CLOTHING.top.map(item => ({ ...item, category: 'top' })),
    ...SAMPLE_CLOTHING.bottom.map(item => ({ ...item, category: 'bottom' })),
    ...SAMPLE_CLOTHING.dress.map(item => ({ ...item, category: 'dress' })),
    ...SAMPLE_CLOTHING.outerwear.map(item => ({ ...item, category: 'outerwear' })),
    ...SAMPLE_CLOTHING.shoes.map(item => ({ ...item, category: 'shoes' })),
    ...SAMPLE_CLOTHING.accessories.map(item => ({ ...item, category: 'accessories' })),
];

// =====================================================
// MOCK WARDROBE
// =====================================================

export const MOCK_WARDROBE = [
    {
        id: 'wardrobe-001',
        user_id: 'mock-user-001',
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        name: 'Áo thun trắng basic',
        category: 'top',
        brand: 'Uniqlo',
        color: 'white',
        tags: ['casual', 'basic'],
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
        id: 'wardrobe-002',
        user_id: 'mock-user-001',
        image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
        name: 'Quần jeans xanh',
        category: 'bottom',
        brand: "Levi's",
        color: 'blue',
        tags: ['casual', 'denim'],
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
        id: 'wardrobe-003',
        user_id: 'mock-user-001',
        image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
        name: 'Áo khoác denim',
        category: 'outerwear',
        brand: "Levi's",
        color: 'blue',
        tags: ['casual', 'spring'],
        created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    },
    {
        id: 'wardrobe-004',
        user_id: 'mock-user-001',
        image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400',
        name: 'Váy hoa nhí',
        category: 'dress',
        brand: 'H&M',
        color: 'floral',
        tags: ['summer', 'romantic'],
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
    {
        id: 'wardrobe-005',
        user_id: 'mock-user-001',
        image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
        name: 'Sneakers trắng',
        category: 'shoes',
        brand: 'Nike',
        color: 'white',
        tags: ['casual', 'sport'],
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
    {
        id: 'wardrobe-006',
        user_id: 'mock-user-001',
        image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400',
        name: 'Kính râm aviator',
        category: 'accessories',
        brand: 'Ray-Ban',
        color: 'gold',
        tags: ['summer', 'travel'],
        created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
    },
];

// =====================================================
// MOCK OUTFITS (saved try-on results)
// =====================================================

export const MOCK_OUTFITS = [
    {
        id: 'outfit-001',
        user_id: 'mock-user-001',
        name: 'Casual Friday',
        result_image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
        clothing_image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        model_image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
        is_favorite: true,
        tags: ['casual', 'work'],
        created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 'outfit-002',
        user_id: 'mock-user-001',
        name: 'Summer Date',
        result_image_url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
        clothing_image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400',
        model_image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
        is_favorite: true,
        tags: ['summer', 'date'],
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
        id: 'outfit-003',
        user_id: 'mock-user-001',
        name: 'Street Style',
        result_image_url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800',
        clothing_image_url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
        model_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        is_favorite: false,
        tags: ['street', 'urban'],
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
        id: 'outfit-004',
        user_id: 'mock-user-001',
        name: 'Autumn Layers',
        result_image_url: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800',
        clothing_image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
        model_image_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
        is_favorite: false,
        tags: ['autumn', 'layered'],
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
];

// =====================================================
// MOCK TRY-ON HISTORY
// =====================================================

export const MOCK_TRYONS = [
    {
        id: 'tryon-001',
        user_id: 'mock-user-001',
        person_image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
        clothing_image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        result_image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
        gems_used: 1,
        status: 'completed',
        provider_used: 'nanoBanana',
        created_at: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
    },
    {
        id: 'tryon-002',
        user_id: 'mock-user-001',
        person_image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
        clothing_image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400',
        result_image_url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
        gems_used: 1,
        status: 'completed',
        provider_used: 'nanoBanana',
        created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    },
    {
        id: 'tryon-003',
        user_id: 'mock-user-001',
        person_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        clothing_image_url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
        result_image_url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800',
        gems_used: 1,
        status: 'completed',
        provider_used: 'qwenEdit',
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
        id: 'tryon-004',
        user_id: 'mock-user-001',
        person_image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
        clothing_image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
        result_image_url: null,
        gems_used: 1,
        status: 'failed',
        error_message: 'AI không thể xử lý ảnh',
        provider_used: 'nanoBanana',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    },
];

// =====================================================
// MOCK RECENT CLOTHING (from extension usage)
// =====================================================

export const MOCK_RECENT_CLOTHING = [
    {
        id: 'recent-1',
        imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        sourceUrl: 'https://www.uniqlo.com',
        timestamp: Date.now() - 3600000,
        tryCount: 5,
    },
    {
        id: 'recent-2',
        imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
        sourceUrl: 'https://www.levis.com',
        timestamp: Date.now() - 7200000,
        tryCount: 3,
    },
    {
        id: 'recent-3',
        imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400',
        sourceUrl: 'https://www.hm.com',
        timestamp: Date.now() - 10800000,
        tryCount: 2,
    },
    {
        id: 'recent-4',
        imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
        sourceUrl: 'https://www.levis.com',
        timestamp: Date.now() - 86400000,
        tryCount: 1,
    },
];

// =====================================================
// MOCK TRY-ON RESULTS (for random selection)
// =====================================================

// Các ảnh kết quả try-on mẫu để random khi demo
// Ảnh full body người mặc quần áo để giả lập kết quả AI try-on
export const MOCK_TRYON_RESULTS = [
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

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generate mock try-on result
 * @param {string} personImage - URL ảnh người
 * @param {string} clothingImage - URL ảnh quần áo
 * @returns {object} { success, imageUrl, provider }
 */
export function generateMockTryOnResult(personImage, clothingImage) {
    // 90% success rate
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
        const randomIndex = Math.floor(Math.random() * MOCK_TRYON_RESULTS.length);
        return {
            success: true,
            imageUrl: MOCK_TRYON_RESULTS[randomIndex],
            provider: Math.random() > 0.3 ? 'nanoBanana' : 'qwenEdit',
        };
    }
    
    return {
        success: false,
        imageUrl: null,
        provider: 'nanoBanana',
        error: 'AI không thể xử lý ảnh. Vui lòng thử lại.',
    };
}

/**
 * Simulate processing delay
 * @param {number} minMs - Min delay
 * @param {number} maxMs - Max delay
 * @returns {Promise}
 */
export function simulateProcessingDelay(minMs = 2000, maxMs = 5000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Get clothing by category
 * @param {string} category - Category name
 * @returns {array}
 */
export function getClothingByCategory(category) {
    return SAMPLE_CLOTHING[category] || [];
}

/**
 * Get random clothing items
 * @param {number} count - Number of items
 * @returns {array}
 */
export function getRandomClothing(count = 6) {
    const shuffled = [...SAMPLE_CLOTHING_IMAGES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

/**
 * Get time ago string (Vietnamese)
 * @param {string|number} timestamp - Timestamp or ISO string
 * @returns {string}
 */
export function getTimeAgo(timestamp) {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
    return `${Math.floor(days / 30)} tháng trước`;
}

// Demo mode flag
export const DEMO_MODE = true;
