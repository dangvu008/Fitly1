# 🚀 Hướng dẫn áp dụng UI hiển thị kết quả thử đồ (tham khảo từ FitlyExt)

## Mục tiêu
- Áp dụng UI hiển thị kết quả thử đồ như FitlyExt: ảnh kết quả + các hành động (Copy, Tải xuống, Chia sẻ, Mua ngay, Lưu vào tủ đồ) và phần **Sửa ảnh** nhanh bằng prompt.

## Files đã chuẩn bị
- Result Popup nâng cấp: [/apps/extension/result-popup-enhanced.tsx](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/result-popup-enhanced.tsx)
- API đã có sẵn trong web:
  - Lưu tủ đồ: [/apps/web/src/app/api/wardrobe/route.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/web/src/app/api/wardrobe/route.ts)
  - Sửa ảnh: [/apps/web/src/app/api/tryon/edit/route.ts](file:///Users/adm/Desktop/Fitly/virtual-tryon/apps/web/src/app/api/tryon/edit/route.ts)

## Cách copy vào dự án web

```bash
# Sao chép file popup nâng cấp
cp /Users/adm/Desktop/Fitly/virtual-tryon/apps/extension/result-popup-enhanced.tsx \
   /Users/adm/Desktop/Fitly/virtual-tryon/apps/web/src/app/result/popup/page.tsx
```

## Kiểm thử
1. Từ extension, chạy thử đồ để mở popup kết quả (`/result/popup?...`)
2. Kiểm tra các hành động:
   - Copy ảnh, Tải xuống, Chia sẻ
   - Mua ngay (nếu có `sourceUrl`)
   - Lưu vào tủ đồ (yêu cầu user đăng nhập)
3. Dùng phần **Sửa ảnh**: chọn gợi ý hoặc nhập prompt rồi bấm “Sửa ảnh”

## Ghi chú
- `tryonId` không bắt buộc; API sửa ảnh hỗ trợ `resultImageUrl` trực tiếp
- Nếu muốn “Sử dụng làm ảnh mẫu” cho lần thử tiếp theo:
  - Cần cầu nối message từ popup → extension; có thể triển khai qua `chrome.runtime.sendMessage` trong content script (tùy chọn)

## Kết quả mong đợi
- Popup kết quả mang UI tương tự FitlyExt: rõ ràng, đầy đủ hành động, có phần sửa ảnh nhanh.

**Xong!** UI hiển thị kết quả đã được tham khảo và áp dụng. 🎉
