---
description: Debugging command. Activates DEBUG mode for systematic problem investigation.
---

# /debug - Systematic Problem Investigation
$ARGUMENTS
---
## Purpose
This command activates DEBUG mode for systematic investigation of issues, errors, or unexpected behavior.
---
## Behavior
When `/debug` is triggered:
1. **Gather information**
   - Error message
   - Reproduction steps
   - Expected vs actual behavior
   - Recent changes
2. **Form hypotheses**
   - List possible causes
   - Order by likelihood
3. **Investigate systematically**
   - Test each hypothesis
   - Check logs, data flow
   - Use elimination method
4. **Fix and prevent**
   - Apply fix
   - Explain root cause
   - Add prevention measures
---
## Output Format
```markdown
## 🔍 Debug: [Issue]
### 1. Symptom
[What's happening]
### 2. Information Gathered
- Error: `[error message]`
- File: `[filepath]`
- Line: [line number]
### 3. Hypotheses
1. ❓ [Most likely cause]
2. ❓ [Second possibility]
3. ❓ [Less likely cause]
### 4. Investigation
**Testing hypothesis 1:**
[What I checked] → [Result]
**Testing hypothesis 2:**
[What I checked] → [Result]

**📋 Checklist theo loại view:**

🖥️ Frontend (React/Vue/SwiftUI):
- [ ] Null/undefined check trước khi render
- [ ] Async timing — data load xong chưa trước khi render?
- [ ] Re-render loop — dependency array trong useEffect/computed có sai không?
- [ ] Event handler — missing preventDefault/stopPropagation?
- [ ] Key trong list — missing hoặc duplicate key?
- [ ] CSS conflict — z-index, overflow hidden, position?

🗄️ Database View (SQL):
- [ ] JOIN conditions — có bị cartesian product không?
- [ ] NULL handling — cần COALESCE/NULLIF không?
- [ ] GROUP BY — đủ columns chưa?
- [ ] Permissions — user có quyền SELECT trên base tables không?
- [ ] Circular dependency giữa các views?

⚙️ Backend API/Controller:
- [ ] Auth token — có hết hạn không?
- [ ] Serializer — field nào bị thiếu/sai format không?
- [ ] N+1 query — lazy load trong loop không?
- [ ] HTTP status code — có trả sai code không?
- [ ] CORS headers — đúng chưa?

🌐 Fullstack:
- [ ] Environment variables — dev vs production khác nhau không?
- [ ] Build optimization side effects?
- [ ] CORS + HTTPS config?

### 5. ⛔ ROOT CAUSE CHECKPOINT
⚠️ KHÔNG được chuyển sang Fix nếu chưa xác nhận đủ 3 điều sau:

🎯 **Root cause là**: [Mô tả chính xác nguyên nhân gốc rễ]
📍 **Vị trí chính xác**: [file:line — không được để trống]
💥 **Cơ chế gây lỗi**: [Giải thích tại sao nó dẫn đến triệu chứng trên]

### 6. Fix
```[language]
// Before
[broken code]
// After
[fixed code]
```

**⚠️ Side Effect Scan (bắt buộc sau mỗi fix):**
- [ ] Fix này ảnh hưởng đến component/function nào khác?
- [ ] Có breaking change với interface/API không?
- [ ] Mental trace: Input → [code đã sửa] → Output có đúng không?
- [ ] Chạy lại flow từ đầu — lỗi gốc đã biến mất chưa?

### 7. 🛡️ Prevention
[ ] Đã thêm validation để chặn dữ liệu rỗng/sai type.
[ ] Đã cập nhật _agent_context/integrations.md nếu liên quan đến API.
[ ] Đã chạy test_runner.py → Kết quả: PASS.
```
---
## Examples
```
/debug login not working
/debug API returns 500
/debug form doesn't submit
/debug data not saving
```
---
## Key Principles
- **Ask before assuming** - get full error context
- **Test hypotheses** - don't guess randomly
- **Explain why** - not just what to fix
- **Prevent recurrence** - add tests, validation

---

## Quy Trình Truy Vết & Xử Lý Gốc Rễ (Systematic Debugging)
Lệnh: /debug {vấn đề_hoặc_mã_lỗi}
Vai trò: Kích hoạt debugger agent để thực hiện điều tra đa lớp, ưu tiên bảo tồn ngữ cảnh.

### 🛠️ LUỒNG THỰC THI (ENHANCED BEHAVIOR)
Khi nhận lệnh /debug, Agent sẽ thực hiện theo 5 bước "thép" sau:

#### 1. 🕵️ Kiểm tra Ngữ cảnh (Context Audit)
Hành động: Đọc ngay _agent_context/architecture.md và integrations.md để xem hệ thống đang kết nối với gì (Supabase, API...).
Truy vết: Kiểm tra các commit hoặc thay đổi gần nhất trong file _agent_context/progress.md.
**Socratic Gate**: Hỏi người dùng:
- "Lỗi này xuất hiện sau khi thay đổi file nào?"
- "Có thông báo lỗi từ Console/Terminal không?"
- "Lỗi xảy ra ở môi trường nào? (dev / staging / production)"
- "Lỗi có xảy ra mọi lúc hay chỉ thỉnh thoảng?"

#### 2. 🧬 Chẩn đoán & Giả thuyết (Diagnostic & Hypotheses)
Lập luận: Liệt kê ít nhất 3 giả thuyết từ "Phổ biến nhất" đến "Ngoại lệ".
Phân loại: Lỗi do **Logic**, **Sync (đồng bộ)**, hay **Environment (Môi trường)**.

Chạy checklist theo đúng loại view đang debug (xem checklist ở Output Format bên trên).

#### 3. 🧪 Thực nghiệm Loại trừ (Systematic Investigation)
Hành động: Sử dụng MCP Terminal để chạy các lệnh inspect hoặc logs.
Atomic Test: Thử nghiệm sửa đổi trên phạm vi nhỏ (isolated) trước khi áp dụng vào file chính.

#### 4. ⛔ Root Cause Checkpoint (KHÔNG BỎ QUA)
Trước khi viết bất kỳ dòng fix nào, phải tuyên bố rõ ràng:
```
🎯 Root cause là: [...]
📍 Vị trí chính xác: [file:line]
💥 Cơ chế gây lỗi: [tại sao nó dẫn đến triệu chứng trên]
```
Nếu chưa xác định được 3 điều trên → **tiếp tục điều tra, không được sửa**.

#### 5. 🛠️ Sửa lỗi, Scan & Đồng bộ (Fix, Side Effect Scan & Sync)
Quy tắc: Mọi bản sửa lỗi phải tuân thủ Context-First (có Header, Semantic name).
Verify UI: Nếu sửa lỗi liên quan đến giao diện, phải đối chiếu với _agent_context/ui_standards.md.

**Sau khi fix — Side Effect Scan bắt buộc:**
- [ ] Fix này ảnh hưởng đến component/function nào khác?
- [ ] Có breaking change với interface/API không?
- [ ] Mental trace: Input → [code đã sửa] → Output có đúng không?
- [ ] Lỗi gốc đã biến mất chưa khi trace lại full flow?

#### 6. 🛡️ Tiêm Vaccine (Prevention)
Hành động: Viết một file .test.ts hoặc cập nhật scripts/lint_runner.py để đảm bảo lỗi này không bao giờ quay lại.

```markdown
### 7. 🛡️ Phòng ngừa (Prevention)
[ ] Đã thêm Zod validation để chặn dữ liệu rỗng.
[ ] Đã cập nhật _agent_context/integrations.md về quy trình gọi API đồng bộ.
[ ] Đã chạy test_runner.py → Kết quả: PASS.
```

---

## ⚡ Nguyên Tắc Vàng

> **"Đừng đoán. Đừng sửa bừa. Tìm root cause trước — xác nhận — sửa — scan side effects — verify."**

1. 🔍 Đọc lỗi kỹ hơn người dùng nghĩ cần thiết
2. 🎯 Xác nhận root cause trước khi gõ một dòng fix
3. 🔧 Fix minimal — chỉ sửa những gì gây ra bug
4. ⚠️ Scan side effects — luôn kiểm tra fix làm hỏng thứ gì không
5. ✅ Verify — không assume đúng nếu chưa trace qua
6. 📋 Report rõ ràng — người dùng phải hiểu điều gì đã xảy ra