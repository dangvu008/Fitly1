-- Migration: Extension Sync Support
-- Created at: 2026-01-25
-- Purpose: Add tables for extension data synchronization

-- ==========================================
-- 1. User Models (ảnh của người dùng để thử đồ)
-- ==========================================

CREATE TABLE IF NOT EXISTS user_models (
  id TEXT PRIMARY KEY, -- Use TEXT for client-generated IDs
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  label TEXT DEFAULT 'My Photo',
  source TEXT DEFAULT 'upload', -- 'upload', 'tryon', 'drag-drop', 'sample'
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_models ENABLE ROW LEVEL SECURITY;

-- Policies
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

-- Indexes
CREATE INDEX IF NOT EXISTS user_models_user_id_idx ON user_models(user_id);
CREATE INDEX IF NOT EXISTS user_models_created_at_idx ON user_models(created_at DESC);

-- ==========================================
-- 2. Clothing History (lịch sử quần áo đã thử)
-- ==========================================

CREATE TABLE IF NOT EXISTS clothing_history (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  source_url TEXT, -- URL của trang sản phẩm
  try_count INTEGER DEFAULT 1,
  is_saved BOOLEAN DEFAULT false, -- Đã lưu vào wardrobe chưa
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clothing_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own clothing history"
  ON clothing_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS clothing_history_user_id_idx ON clothing_history(user_id);
CREATE INDEX IF NOT EXISTS clothing_history_last_used_idx ON clothing_history(last_used_at DESC);

-- ==========================================
-- 3. Extension Settings
-- ==========================================

CREATE TABLE IF NOT EXISTS extension_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  default_model_id TEXT,
  auto_try_on BOOLEAN DEFAULT false,
  quality_preference TEXT DEFAULT 'standard' CHECK (quality_preference IN ('standard', 'hd')),
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'vi',
  notifications_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE extension_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own settings"
  ON extension_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. Sync Logs (for debugging and conflict resolution)
-- ==========================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sync_type TEXT NOT NULL, -- 'full', 'partial', 'models', 'history', 'settings'
  sync_direction TEXT NOT NULL, -- 'upload', 'download'
  items_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs"
  ON sync_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS sync_logs_user_id_idx ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS sync_logs_created_at_idx ON sync_logs(created_at DESC);

-- ==========================================
-- 5. Add trigger to update is_default when setting new default model
-- ==========================================

CREATE OR REPLACE FUNCTION set_single_default_model()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE user_models 
    SET is_default = false 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_models_single_default_trigger ON user_models;
CREATE TRIGGER user_models_single_default_trigger
  BEFORE INSERT OR UPDATE ON user_models
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION set_single_default_model();

-- ==========================================
-- 6. Function to get extension data for a user
-- ==========================================

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
