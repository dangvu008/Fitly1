-- =====================================================
-- SEED MOCK DATA FOR FITLY TESTING
-- Run this AFTER 00_complete_setup.sql
-- Created: 2026-01-27
-- =====================================================
-- 
-- LƯU Ý: File này chỉ dùng để test, KHÔNG chạy trên production!
-- Cần có ít nhất 1 user trong auth.users trước khi chạy
--
-- Cách sử dụng:
-- 1. Đăng ký 1 tài khoản test qua app
-- 2. Copy user_id từ auth.users
-- 3. Thay 'YOUR_USER_ID_HERE' bằng user_id thực
-- 4. Chạy script này trong Supabase SQL Editor
-- =====================================================

-- Set user_id variable (THAY ĐỔI GIÁ TRỊ NÀY!)
-- Ví dụ: DO $$ DECLARE test_user_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; ...
DO $$ 
DECLARE 
    test_user_id UUID := 'YOUR_USER_ID_HERE'::UUID; -- ← THAY ĐỔI!
BEGIN

-- =====================================================
-- 1. UPDATE PROFILE với gems để test
-- =====================================================
UPDATE profiles 
SET 
    gems_balance = 100,
    full_name = 'Test User',
    display_name = 'Tester'
WHERE id = test_user_id;

-- =====================================================
-- 2. INSERT USER MODELS (ảnh người dùng để thử đồ)
-- =====================================================
INSERT INTO user_models (id, user_id, image_url, label, source, is_default) VALUES
    ('user-model-001', test_user_id, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800', 'Ảnh chính', 'upload', TRUE),
    ('user-model-002', test_user_id, 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800', 'Ảnh formal', 'upload', FALSE),
    ('user-model-003', test_user_id, 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800', 'Ảnh casual', 'camera', FALSE)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. INSERT WARDROBE ITEMS
-- =====================================================
INSERT INTO wardrobe (id, user_id, image_url, name, category, brand, color, source_url, tags) VALUES
    (uuid_generate_v4(), test_user_id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Áo thun trắng basic', 'top', 'Uniqlo', 'white', 'https://www.uniqlo.com', ARRAY['casual', 'basic']),
    (uuid_generate_v4(), test_user_id, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', 'Áo sơ mi xanh', 'top', 'Zara', 'blue', 'https://www.zara.com', ARRAY['formal', 'work']),
    (uuid_generate_v4(), test_user_id, 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400', 'Áo polo đen', 'top', 'Lacoste', 'black', NULL, ARRAY['casual', 'smart']),
    (uuid_generate_v4(), test_user_id, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', 'Quần jeans xanh', 'bottom', 'Levis', 'blue', 'https://www.levis.com', ARRAY['casual', 'denim']),
    (uuid_generate_v4(), test_user_id, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400', 'Quần kaki be', 'bottom', 'Dockers', 'beige', NULL, ARRAY['work', 'smart']),
    (uuid_generate_v4(), test_user_id, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', 'Váy hoa nhí', 'dress', 'H&M', 'floral', 'https://www.hm.com', ARRAY['summer', 'romantic']),
    (uuid_generate_v4(), test_user_id, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', 'Váy liền đen', 'dress', 'Zara', 'black', NULL, ARRAY['party', 'elegant']),
    (uuid_generate_v4(), test_user_id, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400', 'Áo khoác denim', 'outerwear', 'Levis', 'blue', NULL, ARRAY['casual', 'spring']),
    (uuid_generate_v4(), test_user_id, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', 'Sneakers trắng', 'shoes', 'Nike', 'white', NULL, ARRAY['casual', 'sport']),
    (uuid_generate_v4(), test_user_id, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400', 'Kính râm aviator', 'accessories', 'Ray-Ban', 'gold', NULL, ARRAY['summer', 'travel']);

-- =====================================================
-- 4. INSERT TRY-ON HISTORY
-- =====================================================
INSERT INTO tryons (id, user_id, person_image_url, clothing_image_url, result_image_url, gems_used, status, provider_used, created_at) VALUES
    (uuid_generate_v4(), test_user_id, 
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
        1, 'completed', 'nanoBanana',
        NOW() - INTERVAL '30 minutes'),
    (uuid_generate_v4(), test_user_id,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400',
        'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
        1, 'completed', 'nanoBanana',
        NOW() - INTERVAL '2 hours'),
    (uuid_generate_v4(), test_user_id,
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800',
        1, 'completed', 'qwenEdit',
        NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), test_user_id,
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
        'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800',
        2, 'completed', 'nanoBanana',
        NOW() - INTERVAL '2 days'),
    (uuid_generate_v4(), test_user_id,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
        NULL,
        1, 'failed', 'nanoBanana',
        NOW() - INTERVAL '3 days'),
    (uuid_generate_v4(), test_user_id,
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800',
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800',
        1, 'completed', 'nanoBanana',
        NOW() - INTERVAL '5 days');

-- =====================================================
-- 5. INSERT OUTFITS (saved try-on results)
-- =====================================================
-- Lấy try-on IDs vừa tạo
WITH recent_tryons AS (
    SELECT id, result_image_url, clothing_image_url, person_image_url, created_at
    FROM tryons 
    WHERE user_id = test_user_id AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT 4
)
INSERT INTO outfits (user_id, name, result_image_url, clothing_image_url, model_image_url, tryon_id, tags, is_favorite)
SELECT 
    test_user_id,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY created_at DESC) = 1 THEN 'Casual Friday'
        WHEN ROW_NUMBER() OVER (ORDER BY created_at DESC) = 2 THEN 'Summer Date'
        WHEN ROW_NUMBER() OVER (ORDER BY created_at DESC) = 3 THEN 'Street Style'
        ELSE 'Autumn Layers'
    END,
    result_image_url,
    clothing_image_url,
    person_image_url,
    id,
    CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY created_at DESC) = 1 THEN ARRAY['casual', 'work']
        WHEN ROW_NUMBER() OVER (ORDER BY created_at DESC) = 2 THEN ARRAY['summer', 'date']
        WHEN ROW_NUMBER() OVER (ORDER BY created_at DESC) = 3 THEN ARRAY['street', 'urban']
        ELSE ARRAY['autumn', 'layered']
    END,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) <= 2 -- First 2 are favorites
FROM recent_tryons;

-- =====================================================
-- 6. INSERT CLOTHING HISTORY
-- =====================================================
INSERT INTO clothing_history (id, user_id, image_url, source_url, try_count, is_saved, last_used_at) VALUES
    ('history-001', test_user_id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'https://www.uniqlo.com', 5, TRUE, NOW() - INTERVAL '30 minutes'),
    ('history-002', test_user_id, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', 'https://www.hm.com', 3, TRUE, NOW() - INTERVAL '2 hours'),
    ('history-003', test_user_id, 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400', 'https://www.lacoste.com', 2, FALSE, NOW() - INTERVAL '1 day'),
    ('history-004', test_user_id, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400', 'https://www.levis.com', 1, FALSE, NOW() - INTERVAL '2 days'),
    ('history-005', test_user_id, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', 'https://www.levis.com', 4, TRUE, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. INSERT GEM TRANSACTIONS
-- =====================================================
INSERT INTO gem_transactions (user_id, amount, type, description, stripe_payment_id, created_at) VALUES
    (test_user_id, 100, 'purchase', 'Mua gói Pro 150 gems', 'pi_mock_001', NOW() - INTERVAL '30 days'),
    (test_user_id, -1, 'used', 'Virtual try-on', NULL, NOW() - INTERVAL '30 minutes'),
    (test_user_id, -1, 'used', 'Virtual try-on', NULL, NOW() - INTERVAL '2 hours'),
    (test_user_id, -1, 'used', 'Virtual try-on', NULL, NOW() - INTERVAL '1 day'),
    (test_user_id, -2, 'used', 'Virtual try-on HD', NULL, NOW() - INTERVAL '2 days'),
    (test_user_id, 1, 'refund', 'AI processing failed - hoàn gems', NULL, NOW() - INTERVAL '3 days'),
    (test_user_id, -1, 'used', 'Virtual try-on', NULL, NOW() - INTERVAL '5 days'),
    (test_user_id, 3, 'bonus', 'Welcome bonus', NULL, NOW() - INTERVAL '60 days');

-- =====================================================
-- 8. INSERT EXTENSION SETTINGS
-- =====================================================
INSERT INTO extension_settings (user_id, default_model_id, auto_try_on, quality_preference, theme, language, notifications_enabled)
VALUES (test_user_id, 'user-model-001', FALSE, 'standard', 'dark', 'vi', TRUE)
ON CONFLICT (user_id) DO UPDATE SET
    default_model_id = 'user-model-001',
    theme = 'dark',
    language = 'vi';

RAISE NOTICE 'Mock data inserted successfully for user: %', test_user_id;

END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Chạy các query sau để kiểm tra data đã được insert

-- Kiểm tra profiles
-- SELECT id, full_name, gems_balance FROM profiles LIMIT 5;

-- Kiểm tra user_models
-- SELECT * FROM user_models LIMIT 10;

-- Kiểm tra wardrobe
-- SELECT name, category, brand FROM wardrobe LIMIT 10;

-- Kiểm tra tryons
-- SELECT status, COUNT(*) FROM tryons GROUP BY status;

-- Kiểm tra outfits
-- SELECT name, is_favorite FROM outfits LIMIT 10;

-- Kiểm tra gem_transactions
-- SELECT type, SUM(amount) FROM gem_transactions GROUP BY type;
