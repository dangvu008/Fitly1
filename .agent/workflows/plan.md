---
description: Create project plan using project-planner agent. No code writing - only plan file generation.
---

---
description: Create detailed project plan using project-planner agent. No code writing — only plan file generation. Use before /create for complex projects.
---

# /plan - Project Planning Mode

$ARGUMENTS

---

## 🔴 Quy tắc cứng

1. **KHÔNG viết code** — chỉ tạo file plan
2. **Dùng `project-planner` agent** — không tự plan
3. **Socratic Gate** — hỏi trước khi plan
4. **Dynamic naming** — tên file theo task

---

## Pre-Flight

```
1. Kiểm tra: đã có plan file chưa? (tránh duplicate)
2. Kiểm tra: đã có /brainstorm trước chưa? Nếu chưa → gợi ý brainstorm trước
3. Đọc ARCHITECTURE.md nếu có → plan phải phù hợp kiến trúc hiện tại
```

> 💡 Nếu user chưa rõ phương án: *"Bạn có muốn `/brainstorm` trước để khám phá các options không?"*

---

## Task

Dùng `project-planner` agent với context:

```
CONTEXT:
- Yêu cầu: $ARGUMENTS
- Mode: PLANNING ONLY (không viết code)
- Output: docs/PLAN-{task-slug}.md

NAMING RULES:
1. Lấy 2-3 từ khóa chính từ yêu cầu
2. Lowercase, hyphen-separated, tối đa 30 ký tự
3. Ví dụ: "e-commerce cart" → PLAN-ecommerce-cart.md

RULES:
1. Chạy Phase -1 (Context Check): đọc ARCHITECTURE.md, CODEBASE.md
2. Chạy Phase 0 (Socratic Gate): hỏi tối đa 3 câu làm rõ
3. Tạo PLAN-{slug}.md với đủ: task breakdown, file structure, agent assignments, security checklist
4. KHÔNG viết bất kỳ file code nào
5. Báo cáo tên file đã tạo
```

---

## Plan File Structure

```markdown
# PLAN-{slug}.md

## Mục tiêu
[Mô tả feature/project]

## Tech Stack
[Đang dùng / Sẽ dùng]

## Task Breakdown
| Task | Agent | Priority | Estimate |
|---|---|---|---|

## File Structure
[Cấu trúc thư mục dự kiến]

## Dependencies Mới
[Packages cần install]

## Security Checklist
[ ] Input validation
[ ] Auth/permission check
[ ] Secrets trong .env

## Definition of Done
[ ] Tests passing
[ ] Security scan clean
[ ] Preview hoạt động
```

---

## Expected Deliverable

| File | Nội dung |
|---|---|
| `docs/PLAN-{slug}.md` | Full plan với tất cả sections trên |

---

## Sau khi plan xong

```
✅ Plan đã tạo: docs/PLAN-{slug}.md

Bước tiếp theo:
- Xem lại plan, chỉnh sửa nếu cần
- `/create` để bắt đầu implementation
- `/orchestrate` nếu cần multi-agent phức tạp
```

---

## Naming Examples

| Request | Plan File |
|---|---|
| `/plan e-commerce site with cart` | `PLAN-ecommerce-cart.md` |
| `/plan mobile fitness app` | `PLAN-fitness-app.md` |
| `/plan add dark mode` | `PLAN-dark-mode.md` |
| `/plan fix authentication bug` | `PLAN-auth-fix.md` |
| `/plan SaaS dashboard` | `PLAN-saas-dashboard.md` |

---

## Usage

```
/plan e-commerce site with cart
/plan mobile app for fitness tracking
/plan SaaS dashboard with analytics
/plan add payment integration
```