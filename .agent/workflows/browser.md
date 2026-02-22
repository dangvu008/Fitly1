---
description: Tự động hóa trình duyệt với browser-use MCP. Kích hoạt khi: debug từ browser · chụp màn hình tự động · test UI trên browser · điền form tự động · kiểm tra visual · thu thập thông tin từ web app đang chạy.
---

# /browser - Browser Automation Workflow

$ARGUMENTS

---

## MCP Config

```jsonc
"browser-use": {
  "command": "npx",
  "args": [
    "mcp-remote",
    "https://api.browser-use.com/mcp",
    "--header",
    "X-Browser-Use-API-Key: YOUR_API_KEY"
  ]
}
```

> Kết hợp: `browser-use MCP` (cloud automation) + `MCP Browser Extension` (local control).

---

## Sub-commands

```
/browser                     - Kiểm tra trạng thái browser hiện tại
/browser open [url]          - Mở URL và lấy state đầy đủ
/browser screenshot          - Chụp màn hình + phân tích
/browser debug               - Debug UI từ browser (console + visual)
/browser fill [form] [data]  - Điền form tự động
/browser test [flow]         - Chạy E2E test flow trên browser
/browser watch [url]         - Theo dõi URL, báo cáo thay đổi
```

---

## BƯỚC 0 — LUÔN LÀM ĐẦU TIÊN: Xác định Trạng thái Browser

> Antigravity PHẢI biết chính xác browser đang ở đâu trước khi thực hiện bất kỳ hành động nào.

```
STATE AUDIT (bắt buộc trước mọi action):
1. URL hiện tại là gì?            → get_current_url()
2. Tab nào đang active?           → list_tabs() + get_active_tab()
3. Trang đã load xong chưa?       → check_page_ready()
4. User đang login hay không?     → check_auth_state()
5. Dev server đang chạy ở port?   → check_preview_server()
6. Console có lỗi không?          → get_console_errors()
```

**State Object — phải populate trước khi tiếp tục:**
```json
{
  "current_url": "http://localhost:3000/dashboard",
  "active_tab": "Dashboard - My App",
  "page_ready": true,
  "auth_state": "logged_in",
  "dev_server": "localhost:3000",
  "console_errors": [],
  "viewport": "1440x900"
}
```

---

## Workflow: Debug từ Browser

```
BƯỚC 1 — State Audit (xem BƯỚC 0)

BƯỚC 2 — Thu thập thông tin lỗi
  a. Chụp screenshot toàn trang
  b. Lấy console errors + warnings
  c. Lấy network requests failed (4xx, 5xx)
  d. Lấy DOM state của element lỗi

BƯỚC 3 — Phân tích visual
  - So sánh screenshot với expected behavior
  - Xác định element bị sai (selector, vị trí, style)
  - Kiểm tra responsive: mobile / tablet / desktop

BƯỚC 4 — Root Cause
  - Từ console error → trace về source file
  - Từ network error → check API endpoint
  - Từ visual bug → check CSS/component

BƯỚC 5 — Fix & Verify
  - Apply fix vào code
  - Reload browser: navigate_to(current_url)
  - Chụp screenshot sau fix
  - So sánh before/after
  - Báo cáo kết quả
```

---

## Workflow: Chụp màn hình & Phân tích

```
BƯỚC 1 — Xác định target
  URL / element / flow cần chụp

BƯỚC 2 — Setup viewport
  Desktop:  1440x900 (default)
  Tablet:   768x1024
  Mobile:   375x812

BƯỚC 3 — Chụp & phân tích
  screenshot(full_page=True)
  → Mô tả chi tiết những gì thấy
  → Highlight vấn đề nếu có
  → So sánh với design nếu có file thiết kế

BƯỚC 4 — Báo cáo
  Đính kèm screenshot + nhận xét cụ thể
```

---

## Workflow: Form Automation

```
BƯỚC 1 — State Audit → xác nhận đang ở đúng trang

BƯỚC 2 — Map form fields
  Liệt kê: selector · type · required · validation

BƯỚC 3 — Fill & validate
  Với mỗi field:
  - locate_element(selector)
  - fill(value)
  - verify_value_set()

BƯỚC 4 — Submit & verify response
  click_submit()
  wait_for_response()
  check_success_state() hoặc check_error_state()

BƯỚC 5 — Screenshot kết quả
```

---

## Workflow: E2E Test Flow

```
BƯỚC 1 — Xác định flow cần test
  Ví dụ: Login → Dashboard → Create Item → Logout

BƯỚC 2 — Chạy từng bước
  Với mỗi bước:
  a. Navigate / click / fill
  b. Wait for state change
  c. Assert expected state
  d. Screenshot nếu fail

BƯỚC 3 — Báo cáo
  ✅ Pass: mô tả bước thành công
  ❌ Fail: screenshot + console log + expected vs actual
```

---

## Browser Control Protocol

### Navigation
```
navigate_to(url)           - Điều hướng đến URL, chờ load xong
go_back()                  - Quay lại trang trước
refresh()                  - Reload trang hiện tại
wait_for_selector(css)     - Chờ element xuất hiện (timeout: 10s)
wait_for_url(pattern)      - Chờ URL khớp pattern
```

### Interaction
```
click(selector)            - Click element
fill(selector, value)      - Nhập text vào input
select(selector, option)   - Chọn dropdown option
hover(selector)            - Hover để xem tooltip/menu
press_key(key)             - Nhấn phím (Enter, Tab, Escape...)
scroll_to(selector)        - Cuộn đến element
```

### Inspection
```
get_current_url()          - URL hiện tại
get_page_title()           - Title của trang
get_element_text(selector) - Text của element
get_element_attr(selector, attr) - Attribute của element
get_console_errors()       - Console errors
get_network_errors()       - Network requests thất bại
screenshot(full_page)      - Chụp màn hình
get_dom_snapshot()         - HTML của trang
```

### Tab Management
```
list_tabs()                - Danh sách tất cả tabs
get_active_tab()           - Tab đang active
switch_tab(index)          - Chuyển tab
new_tab(url)               - Mở tab mới
close_tab()                - Đóng tab hiện tại
```

---

## Anti-patterns — KHÔNG làm

```
❌ Thực hiện action mà không biết browser đang ở URL nào
❌ Click element mà không verify nó tồn tại trước
❌ Assume trang đã load xong mà không wait_for_selector
❌ Bỏ qua console errors trong quá trình automation
❌ Không chụp screenshot khi gặp lỗi
❌ Hardcode timeout cố định thay vì wait_for_state
❌ Chạy automation trên production URL (chỉ localhost/staging)
```

---

## Output Format

```markdown
## 🌐 Browser Automation Report

### State tại thời điểm thực thi
- URL: http://localhost:3000/dashboard
- Tab: "Dashboard - MyApp"
- Auth: Logged in as test@example.com
- Server: localhost:3000 ✅

### Actions thực hiện
1. navigate_to('http://localhost:3000/login')
2. fill('#email', 'test@example.com')
3. fill('#password', '***')
4. click('[type=submit]')
5. wait_for_url('/dashboard')

### Kết quả
✅ Login thành công → redirect đến /dashboard
📸 Screenshot: [đính kèm]

### Console Errors
❌ TypeError: Cannot read property 'id' of undefined
   → src/features/dashboard/useStats.ts:34

### Khuyến nghị
Fix lỗi null check tại useStats.ts:34 → xem debug.md
```

---

## Nguyên tắc Kiểm soát Browser

1. **Luôn biết mình đang ở đâu** — State Audit trước mọi action
2. **Verify trước khi interact** — Element phải exist + visible
3. **Wait, không assume** — Dùng wait_for_* thay vì sleep cố định
4. **Screenshot khi fail** — Bằng chứng trực quan > log text
5. **Chỉ test localhost/staging** — Không automation production
6. **Cleanup sau mỗi test** — Reset state, logout nếu cần
