---
description: Add or update features in existing application. Used for iterative development.
---

---
description: Add or update features in existing application. Reads current state, detects conflicts, applies changes safely with security scan.
---

# /enhance - Update Application

$ARGUMENTS

---

## Pre-Flight: Auto-Discovery

```
1. Đọc CODEBASE.md   → Dependencies, module map, file relationships
2. Đọc ARCHITECTURE.md → Tech stack, architectural decisions, forbidden patterns
3. Đọc MEMORY.md / UI_SYSTEM.md → Nếu task liên quan UI
4. Kiểm tra MCP: filesystem-mcp, terminal-mcp, supabase-mcp (nếu có DB changes)
5. Chạy session_manager.py → Load project state hiện tại
```

---

## Workflow

### 1. Phân tích Trạng thái Hiện tại

```
- Feature request là gì?
- Files nào sẽ bị ảnh hưởng? (dùng CODEBASE.md)
- Có conflict với kiến trúc hiện tại không?
- Có dependency mới nào cần install không?
```

**Conflict Detection — kiểm tra trước:**
```
❗ User yêu cầu Firebase khi project đang dùng Supabase → CẢNH BÁO
❗ User yêu cầu Redux khi đang dùng Zustand → CẢNH BÁO
❗ Feature mới vi phạm Architectural Layering (§6⑤) → TỪCHỐI + giải thích
❗ Package có CVE chưa fix → CẢNH BÁO + đề xuất alternative
```

---

### 2. Lập Kế hoạch Thay đổi

Với thay đổi ảnh hưởng ≥ 3 files, trình bày plan cho user trước:

```
📋 Để thêm [tính năng]:
- Tạo mới: [N files]
- Cập nhật: [M files]
- Install: [packages nếu có]
- Ước tính: ~[X phút]

⚠️ Lưu ý: [conflict/breaking change nếu có]

Xác nhận? (Y/N)
```

> ⛔ Thay đổi lớn phải được xác nhận trước.

---

### 3. Thực thi

```
1. Install dependencies nếu cần (npm/pip)
2. Gọi agents phù hợp theo domain (xem §4 antigravity-rules)
3. Áp dụng thay đổi — tuân thủ §6 (Context-First Code)
4. Cập nhật tests liên quan
5. Cập nhật CODEBASE.md nếu có module mới
```

**Atomic changes:** Mỗi file thay đổi là một đơn vị độc lập — không sửa nửa chừng.

---

### 4. Security Scan Sau Thay đổi

```bash
python ~/.claude/skills/vulnerability-scanner/scripts/security_scan.py .
```

Checklist bắt buộc sau mỗi enhance:
- [ ] Không hardcode secret/API key mới
- [ ] Input validation cho feature mới
- [ ] Không tạo circular dependency mới
- [ ] File mới có AI Context Header (§6④)
- [ ] Test file đi kèm nếu là logic quan trọng

---

### 5. Preview Update

```bash
# Hot reload nếu dev server đang chạy
# Hoặc restart nếu cần
python ~/.claude/scripts/auto_preview.py restart
```

---

## Output khi hoàn thành

```markdown
## ✅ Enhanced: [Tên tính năng]

### Thay đổi
- Tạo mới: [files]
- Cập nhật: [files]
- Packages: [nếu có]

### Security Scan
✅ Không có vấn đề bảo mật mới

### Bước tiếp theo
- `/test` để viết/chạy tests
- `/preview` để kiểm tra UI
```

---

## Usage Examples

```
/enhance add dark mode
/enhance build admin panel
/enhance integrate Stripe payment
/enhance add search with filters
/enhance make responsive for mobile
/enhance add email notifications
```

---

## Quy tắc An toàn

- Xác nhận trước khi thay đổi lớn
- Cảnh báo khi có conflict với stack hiện tại
- Commit từng nhóm thay đổi liên quan với nhau
- Không refactor ngoài scope của feature được yêu cầu