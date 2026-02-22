-- =====================================================
-- Migration: Rename Stripe ID columns to Vendor-Agnostic IDs
-- Date: 2026-02-20
-- Purpose: Chuẩn bị hỗ trợ Lemon Squeezy hoặc nhiều cổng thanh toán
-- =====================================================

-- 1. Bảng gem_transactions
ALTER TABLE gem_transactions 
RENAME COLUMN stripe_payment_id TO gateway_transaction_id;

-- 2. Bảng gem_packages
ALTER TABLE gem_packages 
RENAME COLUMN stripe_price_id TO gateway_price_id;

-- 3. Cập nhật comment (nếu có)
COMMENT ON COLUMN gem_transactions.gateway_transaction_id IS 'ID giao dịch từ cổng thanh toán (Stripe/Lemon Squeezy)';
COMMENT ON COLUMN gem_packages.gateway_price_id IS 'ID sản phẩm/giá từ cổng thanh toán (Stripe Price ID/Lemon Squeezy Variant ID)';
