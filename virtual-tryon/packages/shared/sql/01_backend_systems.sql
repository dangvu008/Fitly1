-- Migration: Backend Systems (Admin, Reports, Preferences)
-- Created at: 2026-01-19

-- ==========================================
-- 1. Provider Management (Admin Dashboard)
-- ==========================================

CREATE TABLE IF NOT EXISTS provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT UNIQUE NOT NULL, -- 'nanoBanana', 'qwen', etc.
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  api_endpoint TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert defaults if not exists
INSERT INTO provider_config (provider_id, display_name, is_active, priority) 
VALUES
  ('nanoBanana', 'Nano Banana (Gemini 2.5)', true, 10),
  ('qwen', 'Qwen Image Edit Plus', false, 5),
  ('gemini', 'Google Gemini Direct', false, 1),
  ('idm-vton', 'IDM-VTON', false, 8)
ON CONFLICT (provider_id) DO NOTHING;

-- Policies
ALTER TABLE provider_config ENABLE ROW LEVEL SECURITY;

-- Only admins can view/edit (simplified policy for now)
CREATE POLICY "Admins can view provider config" 
ON provider_config FOR SELECT 
TO authenticated 
USING (true); -- TODO: restrict to admin role

CREATE POLICY "Admins can update provider config" 
ON provider_config FOR UPDATE 
TO authenticated 
USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'));

-- ==========================================
-- 2. Report & Review System (Manual Review)
-- ==========================================

CREATE TABLE IF NOT EXISTS tryon_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  tryon_result_id TEXT NOT NULL,
  
  -- Report details
  reason TEXT NOT NULL,
  description TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  
  -- Refund info
  gems_to_refund INTEGER DEFAULT 2,
  refunded BOOLEAN DEFAULT false,
  
  -- Review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Images for review (snapshot)
  person_image_url TEXT,
  clothing_image_url TEXT,
  result_image_url TEXT,
  
  -- Meta
  provider_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON tryon_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_user ON tryon_reports(user_id);

-- Policies
ALTER TABLE tryon_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" 
ON tryon_reports FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reports" 
ON tryon_reports FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports" 
ON tryon_reports FOR SELECT 
TO authenticated 
USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'));

CREATE POLICY "Admins can update reports" 
ON tryon_reports FOR UPDATE 
TO authenticated 
USING (auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true'));

-- ==========================================
-- 3. User Preferences & Outfit Filtering
-- ==========================================

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  
  -- Basic
  gender TEXT DEFAULT 'unisex', -- male, female, unisex
  
  -- Style preferences (multi-select)
  preferred_styles TEXT[] DEFAULT '{}', -- casual, formal, streetwear, etc.
  
  -- Modesty (for religious/cultural reasons)
  modesty_level TEXT DEFAULT 'any', -- any, moderate, high
  
  -- Hide content
  hide_categories TEXT[] DEFAULT '{}', -- swimwear, revealing, etc.
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" 
ON user_preferences FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- Outfit Tags Table (Manual Tagging)
CREATE TABLE IF NOT EXISTS outfit_tags (
  outfit_id UUID PRIMARY KEY, -- References existing outfits table
  
  -- Target audience
  gender_target TEXT DEFAULT 'unisex',
  
  -- Style
  style TEXT, -- casual, formal, streetwear, sporty, etc.
  
  -- Modesty flags
  is_revealing BOOLEAN DEFAULT false,
  is_swimwear BOOLEAN DEFAULT false,
  
  -- Categories
  categories TEXT[], -- top, bottom, dress, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies
ALTER TABLE outfit_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view outfit tags" 
ON outfit_tags FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Admins/Uploaders can manage tags" 
ON outfit_tags FOR ALL 
TO authenticated 
USING (true); -- TODO: tighten security
