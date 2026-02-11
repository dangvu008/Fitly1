# 🧹 Hướng dẫn dọn cảnh báo dev (8 logs)

## Các cảnh báo hiện tại
1. ⚠️ "middleware" file convention is deprecated → dùng proxy
2. ⚠️ metadataBase property not set → thiếu base URL cho OG/Twitter
3. 404 /@vite/client → Next.js không dùng Vite, có thể bỏ qua
4. 401 /api/extension/settings → gọi khi chưa login

## Cách khắc phục

### 1. Chuyển middleware sang proxy (Next.js 16)
**File:** `next.config.ts`
```ts
const nextConfig: NextConfig = {
  experimental: {
    proxy: true, // Bật proxy thay vì middleware cũ
  },
  metadataBase: new URL('http://localhost:3000'), // Tránh cảnh báo OG
};
```

**File:** `src/proxy.ts` (tạo mới)
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 2. Ẩn 401 extension settings
**File:** `src/components/auth/ExtensionAuthBridge.tsx`
```tsx
export function ExtensionAuthBridge() {
  const { isAuthenticated } = useAuthContext();
  const [settingsFetched, setSettingsFetched] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || settingsFetched) return;
    
    fetch('/api/extension/settings')
      .then(res => res.json())
      .then(data => {
        console.log('Extension settings loaded');
        setSettingsFetched(true);
      })
      .catch(err => {
        // Không hiện lỗi, chỉ log
        console.warn('Extension settings not loaded');
      });
  }, [isAuthenticated, settingsFetched]);

  return null;
}
```

### 3. Xử lý 404 /@vite/client
- Đây là log dev vô hại, có thể bỏ qua
- Nếu muốn bỏ hoàn toàn, thêm filter trong dev tools

## Kiểm tra kết quả
Sau khi áp dụng:
```bash
npm run dev
```

- Không còn cảnh báo "middleware deprecated"
- Không còn cảnh báo "metadataBase"
- 401 extension settings chỉ xuất hiện khi chưa login (bình thường)
- 404 /@vite_client có thể bỏ qua

## Lưu ý
- Các cảnh báo này không ảnh hưởng đến chức năng
- Chỉ làm sạch console để dễ debug
- Production build sẽ không có các log này

## Files đã chuẩn bị
- [proxy.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/proxy.ts)
- [next.config.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/next.config.ts) 
- [ExtensionAuthBridgeEnhanced.tsx](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/ExtensionAuthBridgeEnhanced.tsx)

Copy các file này vào dự án web để áp dụng!