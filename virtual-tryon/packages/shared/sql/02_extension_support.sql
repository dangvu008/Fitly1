-- Migration: Extension Support
-- Created at: 2026-01-24
-- Purpose: Add support for Chrome extension features

-- ==========================================
-- 1. Add model_image_url to profiles
-- ==========================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS model_image_url TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, email, gems_balance)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    5
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. Create outfits table (for saved try-on results)
-- ==========================================

CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  result_image_url TEXT NOT NULL,
  clothing_image_url TEXT,
  model_image_url TEXT,
  tryon_id UUID REFERENCES tryons(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own outfits"
  ON outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outfits"
  ON outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outfits"
  ON outfits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own outfits"
  ON outfits FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS outfits_user_id_idx ON outfits(user_id);
CREATE INDEX IF NOT EXISTS outfits_created_at_idx ON outfits(created_at DESC);

-- ==========================================
-- 3. Create wardrobe table (rename from wardrobe_items for consistency)
-- ==========================================

CREATE TABLE IF NOT EXISTS wardrobe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  name TEXT DEFAULT 'Untitled Item',
  category TEXT DEFAULT 'other' CHECK (category IN ('top', 'bottom', 'dress', 'outerwear', 'accessories', 'shoes', 'other')),
  source_url TEXT,
  brand TEXT,
  color TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wardrobe ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own wardrobe"
  ON wardrobe FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to own wardrobe"
  ON wardrobe FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wardrobe"
  ON wardrobe FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own wardrobe"
  ON wardrobe FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS wardrobe_user_id_idx ON wardrobe(user_id);
CREATE INDEX IF NOT EXISTS wardrobe_category_idx ON wardrobe(category);
CREATE INDEX IF NOT EXISTS wardrobe_created_at_idx ON wardrobe(created_at DESC);

-- ==========================================
-- 4. Migrate data from wardrobe_items to wardrobe if exists
-- ==========================================

-- Only run if wardrobe_items exists and wardrobe is empty
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'wardrobe_items') THEN
    INSERT INTO wardrobe (id, user_id, image_url, name, category, source_url, created_at)
    SELECT id, user_id, image_url, name, category, source_url, created_at
    FROM wardrobe_items
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ==========================================
-- 5. Add indexes for better extension performance
-- ==========================================

CREATE INDEX IF NOT EXISTS profiles_gems_balance_idx ON profiles(gems_balance);
CREATE INDEX IF NOT EXISTS tryons_status_idx ON tryons(status);

-- ==========================================
-- 6. Add function to get user profile with gems
-- ==========================================

CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  gems_balance INT,
  model_image_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.gems_balance,
    p.model_image_url,
    p.created_at
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 7. Add trigger to update updated_at on profiles
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at_trigger ON profiles;
CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
