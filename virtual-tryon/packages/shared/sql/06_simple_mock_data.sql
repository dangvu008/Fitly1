-- =====================================================
-- SIMPLE MOCK DATA FOR FITLY
-- Chỉ mock: gems + một số ảnh outfit để hiển thị
-- Chạy sau 00_complete_setup.sql
-- =====================================================

-- =====================================================
-- 1. TẠO SAMPLE OUTFITS (public, không cần login)
-- =====================================================

CREATE TABLE IF NOT EXISTS sample_outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT DEFAULT 'casual',
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cho phép tất cả xem
ALTER TABLE sample_outfits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view sample outfits" ON sample_outfits;
CREATE POLICY "Anyone can view sample outfits"
    ON sample_outfits FOR SELECT
    USING (true);

-- Insert sample outfits để hiển thị
INSERT INTO sample_outfits (name, image_url, category, display_order) VALUES
    ('Casual Friday', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800', 'casual', 1),
    ('Summer Vibes', 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800', 'summer', 2),
    ('Street Style', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800', 'street', 3),
    ('Elegant Evening', 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800', 'formal', 4),
    ('Denim Days', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800', 'casual', 5),
    ('Smart Look', 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800', 'smart', 6),
    ('Urban Style', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800', 'urban', 7),
    ('Minimal Chic', 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=800', 'minimal', 8)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. TẠO SAMPLE CLOTHING (public, không cần login)
-- =====================================================

CREATE TABLE IF NOT EXISTS sample_clothing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sample_clothing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view sample clothing" ON sample_clothing;
CREATE POLICY "Anyone can view sample clothing"
    ON sample_clothing FOR SELECT
    USING (true);

-- Insert sample clothing
INSERT INTO sample_clothing (name, image_url, category, brand) VALUES
    ('Áo thun trắng', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'top', 'Uniqlo'),
    ('Áo sơ mi xanh', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', 'top', 'Zara'),
    ('Áo polo đen', 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400', 'top', 'Lacoste'),
    ('Quần jeans', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', 'bottom', 'Levis'),
    ('Váy hoa', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', 'dress', 'H&M'),
    ('Váy đen', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', 'dress', 'Zara'),
    ('Áo khoác denim', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400', 'outerwear', 'Levis'),
    ('Sneakers trắng', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', 'shoes', 'Nike')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. TẠO SAMPLE MODELS (public, không cần login)  
-- =====================================================

CREATE TABLE IF NOT EXISTS sample_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    image_url TEXT NOT NULL,
    gender TEXT DEFAULT 'female',
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sample_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view sample models" ON sample_models;
CREATE POLICY "Anyone can view sample models"
    ON sample_models FOR SELECT
    USING (true);

INSERT INTO sample_models (label, image_url, gender, display_order) VALUES
    ('Nữ - Casual', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800', 'female', 1),
    ('Nữ - Elegant', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800', 'female', 2),
    ('Nam - Casual', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 'male', 3),
    ('Nam - Smart', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800', 'male', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. THÊM GEMS CHO USER ĐÃ ĐĂNG KÝ (100 gems)
-- =====================================================

-- Tự động thêm 100 gems cho TẤT CẢ users hiện có
UPDATE profiles 
SET gems_balance = 100
WHERE gems_balance < 100;

-- Log việc thêm gems
DO $$
DECLARE
    updated_count INT;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % user(s) with 100 gems', updated_count;
END $$;

-- =====================================================
-- 5. FUNCTION LẤY SAMPLE DATA
-- =====================================================

CREATE OR REPLACE FUNCTION get_sample_data()
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'outfits', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', id,
                    'name', name,
                    'imageUrl', image_url,
                    'category', category
                ) ORDER BY display_order
            ), '[]'::json)
            FROM sample_outfits
        ),
        'clothing', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', id,
                    'name', name,
                    'imageUrl', image_url,
                    'category', category,
                    'brand', brand
                )
            ), '[]'::json)
            FROM sample_clothing
        ),
        'models', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', id,
                    'label', label,
                    'imageUrl', image_url,
                    'gender', gender
                ) ORDER BY display_order
            ), '[]'::json)
            FROM sample_models
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'sample_outfits' as table_name, COUNT(*) as count FROM sample_outfits
UNION ALL
SELECT 'sample_clothing', COUNT(*) FROM sample_clothing
UNION ALL
SELECT 'sample_models', COUNT(*) FROM sample_models
UNION ALL
SELECT 'profiles (with gems)', COUNT(*) FROM profiles WHERE gems_balance >= 100;

-- Test function
-- SELECT get_sample_data();

-- =====================================================
-- DONE!
-- Đã tạo:
-- - 8 sample outfits
-- - 8 sample clothing items
-- - 4 sample models
-- - 100 gems cho tất cả users
-- =====================================================
