-- =====================================================
-- COMPLETE DATABASE SETUP FOR FITLY
-- Run this ONCE in Supabase SQL Editor
-- Created: 2026-01-25
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  model_image_url TEXT,
  gems_balance INT DEFAULT 3 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for re-run safety)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, email, gems_balance)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    3
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. TRY-ONS (history of try-on attempts)
-- =====================================================
CREATE TABLE IF NOT EXISTS tryons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  person_image_url TEXT NOT NULL,
  clothing_image_url TEXT NOT NULL,
  result_image_url TEXT,
  gems_used INT DEFAULT 1 NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  provider_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE tryons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own tryons" ON tryons;
DROP POLICY IF EXISTS "Users can insert own tryons" ON tryons;
DROP POLICY IF EXISTS "Users can update own tryons" ON tryons;

-- Policies
CREATE POLICY "Users can view own tryons"
  ON tryons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tryons"
  ON tryons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tryons"
  ON tryons FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS tryons_user_id_idx ON tryons(user_id);
CREATE INDEX IF NOT EXISTS tryons_created_at_idx ON tryons(created_at DESC);
CREATE INDEX IF NOT EXISTS tryons_status_idx ON tryons(status);

-- =====================================================
-- 3. GEM TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS gem_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'used', 'refund', 'bonus')),
  description TEXT,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE gem_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON gem_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON gem_transactions;

CREATE POLICY "Users can view own transactions"
  ON gem_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON gem_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS gem_transactions_user_id_idx ON gem_transactions(user_id);

-- =====================================================
-- 4. GEM PACKAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS gem_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  gems INT NOT NULL,
  price_vnd INT NOT NULL,
  stripe_price_id TEXT,
  is_popular BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE gem_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active packages" ON gem_packages;
CREATE POLICY "Anyone can view active packages"
  ON gem_packages FOR SELECT
  USING (is_active = TRUE);

-- Insert default packages (ignore if exists)
INSERT INTO gem_packages (name, gems, price_vnd, is_popular) VALUES
  ('Starter', 50, 49000, FALSE),
  ('Pro', 150, 129000, TRUE),
  ('Premium', 500, 399000, FALSE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. WARDROBE
-- =====================================================
CREATE TABLE IF NOT EXISTS wardrobe (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

ALTER TABLE wardrobe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wardrobe" ON wardrobe;
DROP POLICY IF EXISTS "Users can insert to own wardrobe" ON wardrobe;
DROP POLICY IF EXISTS "Users can update own wardrobe" ON wardrobe;
DROP POLICY IF EXISTS "Users can delete from own wardrobe" ON wardrobe;

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

CREATE INDEX IF NOT EXISTS wardrobe_user_id_idx ON wardrobe(user_id);
CREATE INDEX IF NOT EXISTS wardrobe_category_idx ON wardrobe(category);

-- =====================================================
-- 6. OUTFITS (saved try-on results)
-- =====================================================
CREATE TABLE IF NOT EXISTS outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  result_image_url TEXT NOT NULL,
  clothing_image_url TEXT,
  model_image_url TEXT,
  tryon_id UUID REFERENCES tryons(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own outfits" ON outfits;
DROP POLICY IF EXISTS "Users can insert own outfits" ON outfits;
DROP POLICY IF EXISTS "Users can update own outfits" ON outfits;
DROP POLICY IF EXISTS "Users can delete own outfits" ON outfits;

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

CREATE INDEX IF NOT EXISTS outfits_user_id_idx ON outfits(user_id);
CREATE INDEX IF NOT EXISTS outfits_created_at_idx ON outfits(created_at DESC);

-- =====================================================
-- 7. USER MODELS (ảnh của người dùng để thử đồ)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_models (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  label TEXT DEFAULT 'My Photo',
  source TEXT DEFAULT 'upload',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own models" ON user_models;
DROP POLICY IF EXISTS "Users can insert own models" ON user_models;
DROP POLICY IF EXISTS "Users can update own models" ON user_models;
DROP POLICY IF EXISTS "Users can delete own models" ON user_models;

CREATE POLICY "Users can view own models"
  ON user_models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own models"
  ON user_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own models"
  ON user_models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own models"
  ON user_models FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_models_user_id_idx ON user_models(user_id);

-- =====================================================
-- 8. CLOTHING HISTORY (lịch sử quần áo đã thử)
-- =====================================================
CREATE TABLE IF NOT EXISTS clothing_history (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  source_url TEXT,
  try_count INTEGER DEFAULT 1,
  is_saved BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clothing_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own clothing history" ON clothing_history;

CREATE POLICY "Users can manage own clothing history"
  ON clothing_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS clothing_history_user_id_idx ON clothing_history(user_id);
CREATE INDEX IF NOT EXISTS clothing_history_last_used_idx ON clothing_history(last_used_at DESC);

-- =====================================================
-- 9. EXTENSION SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS extension_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  default_model_id TEXT,
  auto_try_on BOOLEAN DEFAULT FALSE,
  quality_preference TEXT DEFAULT 'standard' CHECK (quality_preference IN ('standard', 'hd')),
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'vi',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE extension_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own settings" ON extension_settings;

CREATE POLICY "Users can manage own settings"
  ON extension_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Deduct gems
CREATE OR REPLACE FUNCTION deduct_gems(p_user_id UUID, p_amount INT, p_description TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INT;
BEGIN
  SELECT gems_balance INTO current_balance FROM profiles WHERE id = p_user_id;
  
  IF current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  UPDATE profiles SET gems_balance = gems_balance - p_amount, updated_at = NOW()
  WHERE id = p_user_id;
  
  INSERT INTO gem_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'used', p_description);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add gems
CREATE OR REPLACE FUNCTION add_gems(p_user_id UUID, p_amount INT, p_type TEXT, p_description TEXT, p_stripe_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles SET gems_balance = gems_balance + p_amount, updated_at = NOW()
  WHERE id = p_user_id;
  
  INSERT INTO gem_transactions (user_id, amount, type, description, stripe_payment_id)
  VALUES (p_user_id, p_amount, p_type, p_description, p_stripe_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refund gems
CREATE OR REPLACE FUNCTION refund_gems(p_user_id UUID, p_amount INT, p_reason TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN add_gems(p_user_id, p_amount, 'refund', p_reason, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set single default model
CREATE OR REPLACE FUNCTION set_single_default_model()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE user_models 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_models_single_default_trigger ON user_models;
CREATE TRIGGER user_models_single_default_trigger
  BEFORE INSERT OR UPDATE ON user_models
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION set_single_default_model();

-- Update updated_at trigger
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

-- =====================================================
-- 11. GET EXTENSION DATA FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION get_extension_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (
      SELECT json_build_object(
        'id', id,
        'email', email,
        'full_name', full_name,
        'gems_balance', gems_balance,
        'model_image_url', model_image_url
      )
      FROM profiles WHERE id = p_user_id
    ),
    'userModels', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', id,
          'url', image_url,
          'label', label,
          'source', source,
          'isDefault', is_default,
          'createdAt', created_at
        ) ORDER BY created_at DESC
      ), '[]'::json)
      FROM user_models WHERE user_id = p_user_id
    ),
    'clothingHistory', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', id,
          'imageUrl', image_url,
          'sourceUrl', source_url,
          'tryCount', try_count,
          'saved', is_saved,
          'timestamp', last_used_at
        ) ORDER BY last_used_at DESC
      ), '[]'::json)
      FROM clothing_history WHERE user_id = p_user_id
    ),
    'settings', (
      SELECT json_build_object(
        'defaultModelId', default_model_id,
        'autoTryOn', auto_try_on,
        'qualityPreference', quality_preference,
        'theme', theme
      )
      FROM extension_settings WHERE user_id = p_user_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. TRYON EDITS (Text-based image editing)
-- =====================================================

CREATE TABLE IF NOT EXISTS tryon_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    original_tryon_id UUID REFERENCES tryons(id),
    
    -- Edit details
    edit_prompt TEXT NOT NULL,
    result_image_url TEXT,
    
    -- Cost
    gems_used INTEGER DEFAULT 1,
    
    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tryon_edits_user ON tryon_edits(user_id);
CREATE INDEX IF NOT EXISTS idx_tryon_edits_original ON tryon_edits(original_tryon_id);

-- RLS
ALTER TABLE tryon_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own edits"
ON tryon_edits FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own edits"
ON tryon_edits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- DONE! 
-- =====================================================
-- 12. AUDIT LOGS (Security logging)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs(resource_type, resource_id);

-- RLS - Only admins can view audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Insert policy - system can always insert
CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Select policy - only admins can view
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'is_admin' = 'true'
    )
);

-- Function to log actions
CREATE OR REPLACE FUNCTION log_audit(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_details, p_ip_address, p_user_agent)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENABLE REALTIME FOR KEY TABLES
-- =====================================================
-- Note: In Supabase Dashboard, go to Database > Replication
-- and enable the following tables for realtime:
-- - tryons
-- - profiles
-- - gem_transactions

-- Alternative: Enable via SQL (requires superuser)
-- ALTER PUBLICATION supabase_realtime ADD TABLE tryons;
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
-- ALTER PUBLICATION supabase_realtime ADD TABLE gem_transactions;

-- =====================================================
-- All tables created:
-- - profiles
-- - tryons
-- - gem_transactions
-- - gem_packages
-- - wardrobe
-- - outfits
-- - user_models
-- - clothing_history
-- - extension_settings
-- - tryon_edits
-- =====================================================
