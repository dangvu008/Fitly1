## Kế hoạch khởi động server:

1. **Kiểm tra dependencies**: Chạy `npm install` để đảm bảo tất cả dependencies đã được cài đặt
2. **Khởi động server**: Chạy `npm run dev` để khởi động Next.js server tại cổng 3000
3. **Kiểm tra trạng thái**: Server sẽ chạy tại http://localhost:3000 với endpoint /api/health để extension kiểm tra

## Sau khi server chạy:
- Extension sẽ kiểm tra server qua /api/health
- Nếu server chạy: Mở popup nhỏ gọn (400x600px) cho đăng nhập
- Nếu server không chạy: Mở tab thường với thông báo lỗi

Server cần chạy để extension hoạt động đúng với tính năng đăng nhập.