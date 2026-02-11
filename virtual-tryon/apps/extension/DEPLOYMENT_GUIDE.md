# 🚀 Hướng dẫn Triển khai Trang chủ với Supabase Cloud

## 📋 Tổng quan
Tài liệu này hướng dẫn cách triển khai logic fetch dữ liệu từ Supabase Cloud cho trang chủ của ứng dụng Fitly.

## 📁 Các file đã được tạo sẵn

### 1. SQL Schema ([supabase-homepage-schema.sql](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/supabase-homepage-schema.sql))
- Tạo bảng `public_outfits`, `outfit_likes`, `outfit_comments`
- Thêm sample data vào bảng `sample_outfits`
- Cấu hình RLS và triggers tự động cập nhật số lượng likes/comments

### 2. API Routes
- **[new-arrivals-api.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/new-arrivals-api.ts)**: `/api/home/new-arrivals`
- **[trending-api.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/trending-api.ts)**: `/api/home/trending`
- **[for-you-api.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/for-you-api.ts)**: `/api/home/for-you`

### 3. React Hooks
- **[useNewArrivals.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useNewArrivals.ts)**: Hook để fetch outfits mới nhất
- **[useTrendingOutfits.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useTrendingOutfits.ts)**: Hook để fetch outfits trending
- **[useForYouOutfits.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useForYouOutfits.ts)**: Hook để fetch outfits đề xuất

### 4. Homepage Component
- **[homepage-updated.tsx](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/homepage-updated.tsx)**: Trang chủ đã được cập nhật để sử dụng data từ Supabase

## 🎯 Bước 1: Cài đặt Database Schema

1. **Mở Supabase Dashboard** của bạn
2. **Vào SQL Editor**
3. **Copy và paste toàn bộ nội dung** của file [supabase-homepage-schema.sql](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/supabase-homepage-schema.sql)
4. **Chạy SQL** để tạo các bảng và sample data

## 🎯 Bước 2: Copy API Routes vào dự án

### Tạo thư mục:
```bash
cd /Users/adm/Desktop/Fitly/virtual-tryon/apps/web
mkdir -p src/app/api/home/new-arrivals
mkdir -p src/app/api/home/trending
mkdir -p src/app/api/home/for-you
```

### Copy files:
```bash
# Copy API routes
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/new-arrivals-api.ts src/app/api/home/new-arrivals/route.ts
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/trending-api.ts src/app/api/home/trending/route.ts
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/for-you-api.ts src/app/api/home/for-you/route.ts
```

## 🎯 Bước 3: Copy Hooks vào dự án

### Copy hooks:
```bash
# Copy hooks
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useNewArrivals.ts src/hooks/
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useTrendingOutfits.ts src/hooks/
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useForYouOutfits.ts src/hooks/
```

### Update hooks index:
Thêm vào file `src/hooks/index.ts`:
```typescript
export * from './useNewArrivals';
export * from './useTrendingOutfits';
export * from './useForYouOutfits';
```

## 🎯 Bước 4: Cập nhật Homepage Component

### Backup file cũ:
```bash
cp src/app/page.tsx src/app/page.tsx.backup
```

### Copy homepage mới:
```bash
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/homepage-updated.tsx src/app/page.tsx
```

## 🎯 Bước 5: Test và Verify

### 1. Khởi động lại server:
```bash
npm run dev
```

### 2. Test các API endpoints:
```bash
# Test new arrivals
curl http://localhost:3000/api/home/new-arrivals

# Test trending
curl http://localhost:3000/api/home/trending

# Test for-you
curl http://localhost:3000/api/home/for-you
```

### 3. Kiểm tra trên browser:
- Mở http://localhost:3000
- Kiểm tra các section: New Arrivals, Trending, For You
- Kiểm tra loading states và realtime updates

## 🔧 Troubleshooting

### Lỗi Database Connection
```bash
# Kiểm tra environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Lỗi API Routes
```bash
# Kiểm tra logs
npm run dev
# Hoặc check browser console
```

### Lỗi Hooks
```bash
# Kiểm tra import paths trong hooks
# Đảm bảo đúng đường dẫn: @/lib/supabase/client
```

## 📊 Features đã triển khai

✅ **New Arrivals**: Hiển thị outfits mới nhất  
✅ **Trending**: Hiển thị outfits có nhiều likes nhất  
✅ **For You**: Hiển thị outfits đề xuất (random/shuffled)  
✅ **Loading States**: Hiển thị loading spinner khi fetch data  
✅ **Error Handling**: Xử lý lỗi và fallback về mock data  
✅ **Realtime Updates**: Tự động cập nhật khi có dữ liệu mới  
✅ **Sample Data**: Có sẵn dữ liệu mẫu để test  

## 🚀 Next Steps

1. **Thêm chức năng Like/Unlike**: Cần implement API endpoints cho likes
2. **Thêm chức năng Comment**: Cần implement API endpoints cho comments  
3. **Personalization**: Có thể cải thiện "For You" bằng ML/AI
4. **Pagination**: Thêm pagination cho các sections
5. **Search & Filter**: Thêm tìm kiếm và lọc outfits

## 📞 Hỗ trợ

Nếu gặp lỗi trong quá trình triển khai:
1. Kiểm tra browser console và server logs
2. Verify database connection và schema
3. Check API endpoints bằng curl hoặc Postman
4. Test từng component một cách riêng biệt

**Chúc bạn triển khai thành công! 🎉**