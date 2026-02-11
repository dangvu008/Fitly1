-- Extended schema for homepage public outfits
-- Add this to your Supabase SQL editor

-- =====================================================
-- PUBLIC OUTFITS (outfits công khai để hiển thị trên homepage)
-- =====================================================
CREATE TABLE IF NOT EXISTS public_outfits (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    image_url TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public_outfits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view public outfits"
    ON public_outfits FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can insert own public outfits"
    ON public_outfits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own public outfits"
    ON public_outfits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own public outfits"
    ON public_outfits FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS public_outfits_created_at_idx ON public_outfits(created_at DESC);
CREATE INDEX IF NOT EXISTS public_outfits_likes_count_idx ON public_outfits(likes_count DESC);
CREATE INDEX IF NOT EXISTS public_outfits_user_id_idx ON public_outfits(user_id);
CREATE INDEX IF NOT EXISTS public_outfits_is_public_idx ON public_outfits(is_public);

-- =====================================================
-- OUTFIT LIKES (tracking likes cho outfits)
-- =====================================================
CREATE TABLE IF NOT EXISTS outfit_likes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    outfit_id UUID REFERENCES public_outfits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(outfit_id, user_id)
);

-- Enable RLS
ALTER TABLE outfit_likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view likes"
    ON outfit_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can like outfits"
    ON outfit_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike outfits"
    ON outfit_likes FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS outfit_likes_outfit_id_idx ON outfit_likes(outfit_id);
CREATE INDEX IF NOT EXISTS outfit_likes_user_id_idx ON outfit_likes(user_id);

-- =====================================================
-- OUTFIT COMMENTS (comments cho outfits)
-- =====================================================
CREATE TABLE IF NOT EXISTS outfit_comments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    outfit_id UUID REFERENCES public_outfits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE outfit_comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view comments"
    ON outfit_comments FOR SELECT
    USING (true);

CREATE POLICY "Users can comment on outfits"
    ON outfit_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
    ON outfit_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON outfit_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS outfit_comments_outfit_id_idx ON outfit_comments(outfit_id);
CREATE INDEX IF NOT EXISTS outfit_comments_user_id_idx ON outfit_comments(user_id);
CREATE INDEX IF NOT EXISTS outfit_comments_created_at_idx ON outfit_comments(created_at DESC);

-- =====================================================
-- SAMPLE OUTFITS (sample data cho testing)
-- =====================================================
CREATE TABLE IF NOT EXISTS sample_outfits (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    category VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (public readable)
ALTER TABLE sample_outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sample outfits"
    ON sample_outfits FOR SELECT
    USING (is_active = true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS sample_outfits_display_order_idx ON sample_outfits(display_order);
CREATE INDEX IF NOT EXISTS sample_outfits_category_idx ON sample_outfits(category);
CREATE INDEX IF NOT EXISTS sample_outfits_is_active_idx ON sample_outfits(is_active);

-- Insert sample data
INSERT INTO sample_outfits (name, image_url, category, display_order) VALUES
    ('Áo thun trắng basic', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'top', 1),
    ('Áo sơ mi xanh nhạt', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', 'top', 2),
    ('Áo polo đen', 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400', 'top', 3),
    ('Áo hoodie xám', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', 'top', 4),
    ('Áo crop top hồng', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400', 'top', 5),
    ('Áo blouse trắng', 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400', 'top', 6),
    ('Quần jeans xanh đậm', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', 'bottom', 7),
    ('Quần kaki be', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400', 'bottom', 8),
    ('Quần short denim', 'https://images.unsplash.com/photo-1506629905607-d405b7a30db1?w=400', 'bottom', 9),
    ('Chân váy xếp ly', 'https://images.unsplash.com/photo-1583496661160-fb5886a13d27?w=400', 'bottom', 10),
    ('Đầm dài hoa nhí', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', 'dress', 11),
    ('Đầm công sở đen', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', 'dress', 12);

-- Function to update likes count when like is added/removed
CREATE OR REPLACE FUNCTION update_outfit_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public_outfits 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.outfit_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public_outfits 
        SET likes_count = GREATEST(likes_count - 1, 0) 
        WHERE id = OLD.outfit_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for likes count
DROP TRIGGER IF EXISTS update_outfit_likes_count_trigger ON outfit_likes;
CREATE TRIGGER update_outfit_likes_count_trigger
    AFTER INSERT OR DELETE ON outfit_likes
    FOR EACH ROW EXECUTE FUNCTION update_outfit_likes_count();

-- Function to update comments count when comment is added/removed
CREATE OR REPLACE FUNCTION update_outfit_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public_outfits 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.outfit_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public_outfits 
        SET comments_count = GREATEST(comments_count - 1, 0) 
        WHERE id = OLD.outfit_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comments count
DROP TRIGGER IF EXISTS update_outfit_comments_count_trigger ON outfit_comments;
CREATE TRIGGER update_outfit_comments_count_trigger
    AFTER INSERT OR DELETE ON outfit_comments
    FOR EACH ROW EXECUTE FUNCTION update_outfit_comments_count();