/**
 * File: CommentsIntegrationGuide.md
 * Purpose: Hướng dẫn tích hợp CommentsPanel vào homepage để bật bình luận thật
 * 
 * Bước 1: Copy các file đã chuẩn bị vào dự án web
 * Bước 2: Cập nhật exports
 * Bước 3: Gắn CommentsPanel vào homepage
 * Bước 4: Test và verify
 */

## Bước 1: Copy các file vào dự án web

```bash
cd /Users/adm/Desktop/Fitly/virtual-tryon/apps/web

# Copy hook useComments
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/useComments.ts src/hooks/useComments.ts

# Copy CommentsPanel UI
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/CommentsPanel.tsx src/components/ui/CommentsPanel.tsx

# Copy API comments (nếu chưa có)
mkdir -p src/app/api/outfits/[id]/comments
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/outfit-comments-api.ts src/app/api/outfits/[id]/comments/route.ts
```

## Bước 2: Cập nhật exports

### Thêm vào src/hooks/index.ts:
```typescript
export * from './useComments';
```

### Thêm vào src/components/ui/index.ts:
```typescript
export { default as CommentsPanel } from './CommentsPanel';
```

## Bước 3: Gắn CommentsPanel vào homepage

### Mở src/app/page.tsx và thêm:

```tsx
'use client';
import { useState } from 'react';
import { CommentsPanel } from '@/components/ui';

export default function HomePage() {
  // ... existing code ...
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);

  // Khi render outfit cards, thay thế nút bình luận:
  
  // Thay thế đoạn này:
  // <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
  //   <MessageCircle className="w-3.5 h-3.5" />
  //   {item.comments}
  // </span>
  
  // Thành:
  <button
    onClick={() => setOpenCommentsFor(item.id)}
    className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] hover:text-orange-500 transition-colors"
  >
    <MessageCircle className="w-3.5 h-3.5" />
    {item.comments}
  </button>

  // ở cuối component, thêm:
  {openCommentsFor && (
    <CommentsPanel
      outfitId={openCommentsFor}
      onClose={() => setOpenCommentsFor(null)}
    />
  )}
}
```

### Hoặc cập nhật GridCard component:

```tsx
// Trong GridCard component
function GridCard({ item }: { item: OutfitItem }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <>
      <div className="rounded-xl overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all duration-200 group">
        {/* ... existing card content ... */}
        
        {/* Update comments button */}
        <button
          onClick={() => setShowComments(true)}
          className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] hover:text-orange-500 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {item.comments}
        </button>
      </div>

      {showComments && (
        <CommentsPanel
          outfitId={item.id}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  );
}
```

## Bước 4: Test và verify

### 1. Khởi động lại server:
```bash
npm run dev
```

### 2. Test comments:
- Click vào số bình luận (ví dụ: "34") trên outfit
- CommentsPanel sẽ mở ra
- Gửi bình luận mới
- Kiểm tra realtime updates

### 3. Kiểm tra dữ liệu:
- Nếu chưa có dữ liệu thật, chạy SQL schema:
```sql
-- Chạy file supabase-homepage-schema.sql đã chuẩn bị
```

- Seed vài bình luận test:
```sql
INSERT INTO outfit_comments (outfit_id, user_id, content) 
VALUES ('your-outfit-id', 'your-user-id', 'Bình luận test');
```

## Lưu ý quan trọng

### 1. Authentication:
- CommentsPanel yêu cầu user đăng nhập để gửi bình luận
- Đảm bảo user đã login trước khi test

### 2. Realtime updates:
- Comments tự động refresh khi có bình luận mới
- Dùng Supabase realtime subscription

### 3. Error handling:
- Nếu gặp lỗi, kiểm tra browser console
- Verify API endpoint đang chạy: http://localhost:3000/api/outfits/[id]/comments

### 4. Mobile responsive:
- CommentsPanel đã được thiết kế cho mobile
- Test trên điện thoại để đảm bảo UX tốt

## Troubleshooting

### Lỗi "401 Unauthorized"
- User chưa đăng nhập
- Kiểm tra auth state trước khi mở CommentsPanel

### Lỗi "Outfit not found"
- Outfit ID không tồn tại
- Verify outfit đã được tạo trong bảng public_outfits

### Comments không hiển thị
- Kiểm tra browser console cho errors
- Verify API response format
- Test API trực tiếp bằng curl hoặc Postman

## Kết quả mong đợi

✅ **Click vào số bình luận** → Mở CommentsPanel
✅ **Gửi bình luận mới** → Realtime update
✅ **Hiển thị danh sách comments** → Với user avatar và timestamp
✅ **Mobile responsive** → Hoạt động tốt trên điện thoại

## Next steps

- Thêm emoji picker cho comments
- Support replies/threads
- Add comment reactions (like heart)
- Implement comment moderation

**Chúc bạn tích hợp thành công! 🎉**