Dựa trên sự xác nhận của bạn, tôi sẽ tiến hành triển khai logic cho trang chủ kết nối với Supabase Cloud. 

## **Các bước thực hiện:**

### **1. Chuẩn bị Cơ sở dữ liệu (Supabase SQL)**
- Tạo các bảng: `public_outfits`, `outfit_likes`, `outfit_comments`.
- Cấu hình Row Level Security (RLS) để cho phép đọc công khai và ghi theo user.
- Thiết lập Triggers tự động cập nhật số lượng likes/comments.
- Chèn dữ liệu mẫu (Sample Data) vào bảng `sample_outfits`.

### **2. Triển khai API Routes (Next.js)**
- **`/api/home/new-arrivals`**: Lấy danh sách outfits mới nhất.
- **`/api/home/trending`**: Lấy các outfits có nhiều lượt tương tác nhất.
- **`/api/home/for-you`**: Gợi ý outfits ngẫu nhiên hoặc theo sở thích.

### **3. Xây dựng Hooks (Client-side)**
- **`useNewArrivals`**: Quản lý state và fetch dữ liệu outfits mới.
- **`useTrendingOutfits`**: Quản lý state và fetch dữ liệu trending.
- **`useForYouOutfits`**: Quản lý state và fetch dữ liệu đề xuất.
- Tích hợp **Realtime** để cập nhật số lượng like/comment ngay lập tức.

### **4. Cập nhật Giao diện Trang chủ**
- Thay thế mock data tĩnh bằng dữ liệu từ các hooks mới.
- Thêm trạng thái Loading (Skeleton/Spinner) cho từng section.
- Đảm bảo cơ chế fallback (hiển thị mock data nếu Supabase chưa có dữ liệu).

### **Lưu ý về Quyền hạn:**
Vì hiện tại tôi đang làm việc trong thư mục `apps/extension`, tôi sẽ chuẩn bị sẵn tất cả các file code và script cần thiết. Sau đó, bạn có thể chạy script hoặc copy chúng vào thư mục `apps/web` tương ứng.

Bạn có đồng ý với kế hoạch này không? Nếu có, tôi sẽ bắt đầu chuẩn bị các file ngay lập tức.