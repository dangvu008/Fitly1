# 🚀 Hướng dẫn Triển khai Trang chủ với Supabase Cloud - Complete Version

## 📋 Tổng quan
Tài liệu này hướng dẫn cách triển khai **trang chủ hoàn chỉnh** với Supabase Cloud bao gồm: **Like, Save, Comments, Realtime Updates**.

## 🎯 What's New - Complete Features

### ✅ **Realtime Like/Unlike**
- Like/unlike outfits với animations
- Realtime updates cho số lượng likes
- Optimistic updates để UI responsive

### ✅ **Save/Unsave to Wardrobe** 
- Lưu outfits vào wardrobe cá nhân
- Realtime sync với saved status
- Optimistic updates

### ✅ **Comments System**
- Thêm/xóa comments cho outfits
- Hiển thị comments count
- User avatars và timestamps

### ✅ **Enhanced UI/UX**
- Loading states cho tất cả sections
- Hover effects và animations
- Refresh button để làm mới content
- Share và view count features

## 📁 Các file đã được tạo sẵn

### 1. SQL Schema ([supabase-homepage-schema.sql](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/supabase-homepage-schema.sql))
- Tạo bảng `public_outfits`, `outfit_likes`, `outfit_comments`
- Thêm sample data vào bảng `sample_outfits`
- Cấu hình RLS policies và triggers tự động

### 2. API Routes
- **[new-arrivals-api.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/new-arrivals-api.ts)**: `/api/home/new-arrivals`
- **[trending-api.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/trending-api.ts)**: `/api/home/trending`
- **[for-you-api.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/for-you-api.ts)**: `/api/home/for-you`
- **[outfit-likes-api.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/outfit-likes-api.ts)**: `/api/outfits/[id]/like`
- **[outfit-save-api.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/outfit-save-api.ts)**: `/api/outfits/[id]/save`
- **[outfit-comments-api.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/outfit-comments-api.ts)**: `/api/outfits/[id]/comments`

### 3. React Components & Hooks
- **[useNewArrivals.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useNewArrivals.ts)**: Hook để fetch outfits mới nhất
- **[useTrendingOutfits.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useTrendingOutfits.ts)**: Hook để fetch outfits trending
- **[useForYouOutfits.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useForYouOutfits.ts)**: Hook để fetch outfits đề xuất
- **[LikeButton.tsx](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/LikeButton.tsx)**: Component like với realtime updates

### 4. Homepage Component
- **[homepage-complete.tsx](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/homepage-complete.tsx)**: Trang chủ hoàn chỉnh với tất cả features

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
mkdir -p src/app/api/outfits/[id]/like
mkdir -p src/app/api/outfits/[id]/save
mkdir -p src/app/api/outfits/[id]/comments
```

### Copy API routes:
```bash
# Home API routes
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/new-arrivals-api.ts src/app/api/home/new-arrivals/route.ts
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/trending-api.ts src/app/api/home/trending/route.ts
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/for-you-api.ts src/app/api/home/for-you/route.ts

# Outfit interaction APIs
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/outfit-likes-api.ts src/app/api/outfits/[id]/like/route.ts
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/outfit-save-api.ts src/app/api/outfits/[id]/save/route.ts
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/outfit-comments-api.ts src/app/api/outfits/[id]/comments/route.ts
```

## 🎯 Bước 3: Copy Hooks và Components vào dự án

### Copy hooks:
```bash
# Copy hooks
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useNewArrivals.ts src/hooks/
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useTrendingOutfits.ts src/hooks/
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useForYouOutfits.ts src/hooks/
```

### Copy components:
```bash
# Copy components
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/LikeButton.tsx src/components/ui/
```

### Update hooks index:
Thêm vào file `src/hooks/index.ts`:
```typescript
export * from './useNewArrivals';
export * from './useTrendingOutfits';
export * from './useForYouOutfits';
```

### Update components index:
Thêm vào file `src/components/ui/index.ts`:
```typescript
export * from './LikeButton';
```

## 🎯 Bước 4: Cập nhật Homepage Component

### Backup file cũ:
```bash
cp src/app/page.tsx src/app/page.tsx.backup
```

### Copy homepage mới:
```bash
cp /Users/adm/Desktop/Fitlyv1/virtual-tryon/apps/extension/homepage-complete.tsx src/app/page.tsx
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

# Test like functionality (cần authentication)
curl -X POST http://localhost:3000/api/outfits/[outfit-id]/like
```

### 3. Kiểm tra trên browser:
- Mở http://localhost:3000
- Kiểm tra các section: New Arrivals, Trending, For You
- **Test like/unlike**: Click vào heart icon
- **Test save/unsave**: Click vào bookmark icon
- **Test refresh**: Click nút "Làm mới gợi ý"
- **Kiểm tra loading states** và realtime updates

## 🔧 Advanced Features Testing

### Realtime Like Updates
1. Mở 2 browser tabs cùng trang chủ
2. Like một outfit ở tab 1
3. Verify số likes tự động update ở tab 2

### Save to Wardrobe
1. Click bookmark icon để save outfit
2. Kiểm tra trong wardrobe section (nếu có)
3. Unsave và verify outfit biến mất khỏi saved items

### Comments System
1. Click vào comment count
2. Thêm comment mới
3. Verify comment count tăng lên
4. Xóa comment và verify count giảm xuống

## 🐛 Troubleshooting

### Lỗi Database Connection
```bash
# Kiểm tra environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test connection trong browser console
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const { data, error } = await supabase.from('sample_outfits').select('*')
```

### Lỗi Realtime Updates
```bash
# Check browser console cho realtime errors
# Verify Supabase realtime settings trong dashboard
# Check RLS policies cho realtime tables
```

### Lỗi Authentication
```bash
# Test auth endpoints
curl http://localhost:3000/api/auth/me
# Verify user đã login trước khi test like/save
```

## 📊 Performance Optimization Tips

### 1. Image Optimization
```typescript
// Use Next.js Image component cho better performance
import Image from 'next/image';

// Thay thế img tags với Image component
<Image
  src={item.imageUrl}
  alt={item.name}
  width={300}
  height={400}
  className="object-cover"
  priority={idx < 4} // Load first 4 images with priority
/>
```

### 2. Caching Strategies
```typescript
// Add cache headers cho API responses
export async function GET(request: NextRequest) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  });
}
```

### 3. Pagination
```typescript
// Implement pagination cho large datasets
const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
const offset = parseInt(searchParams.get('offset') || '0');
```

## 🚀 Next Steps & Enhancements

### 1. Search & Filter
- Thêm search functionality
- Filter theo category, price range, colors

### 2. User Profiles
- Hiển thị profile của người đăng outfit
- Follow/unfollow users

### 3. Advanced Recommendations
- AI-powered recommendations
- Collaborative filtering

### 4. Social Features
- Share outfits lên social media
- Comments threading
- Notifications

### 5. Analytics
- View analytics cho outfit creators
- Trending algorithms

## 📞 Support & Resources

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Common Issues
1. **Realtime not working**: Check RLS policies và subscription syntax
2. **Images not loading**: Verify image URLs và CORS settings
3. **Authentication errors**: Check auth flow và token management

**Chúc bạn triển khai thành công! 🎉** 

Trang chủ của bạn giờ đã có đầy đủ tính năng social với realtime updates! 🚀