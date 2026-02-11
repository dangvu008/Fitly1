-- =====================================================
-- Storage Buckets Setup for Virtual Try-On
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create storage bucket for try-on results
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tryon-results',
    'tryon-results',
    true,  -- Public bucket for easy access
    5242880,  -- 5MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for user model images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-models',
    'user-models',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for clothing history
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'clothing-history',
    'clothing-history',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies - Allow authenticated users to upload
-- =====================================================

-- Policy for tryon-results bucket
CREATE POLICY "Give users access to own tryon results"
ON storage.objects FOR ALL
USING (
    bucket_id = 'tryon-results' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for user-models bucket  
CREATE POLICY "Give users access to own models"
ON storage.objects FOR ALL
USING (
    bucket_id = 'user-models' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for clothing-history bucket
CREATE POLICY "Give users access to own clothing"
ON storage.objects FOR ALL
USING (
    bucket_id = 'clothing-history' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read for all buckets (images are public)
CREATE POLICY "Public read access for tryon results"
ON storage.objects FOR SELECT
USING (bucket_id = 'tryon-results');

CREATE POLICY "Public read access for user models"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-models');

CREATE POLICY "Public read access for clothing"
ON storage.objects FOR SELECT
USING (bucket_id = 'clothing-history');
