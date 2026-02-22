---
description: Structured brainstorming for projects and features. Explores multiple options before implementation.
---

---
description: Structured brainstorming for projects and features. Explores multiple options before implementation. Reads project context before proposing solutions.
---

# /brainstorm - Structured Idea Exploration

$ARGUMENTS

---

## Pre-Flight: Auto-Discovery

Trước khi brainstorm, đọc ngay:
```
1. ARCHITECTURE.md     → Tech stack, constraints đang dùng
2. CODEBASE.md         → Dependencies, patterns hiện tại
3. _agent_context/     → Nếu có: integrations.md, progress.md
```
> Mục đích: Đề xuất phải khớp với tech stack thực tế, không đề xuất Firebase khi đang dùng Supabase.

---

## Purpose

Kích hoạt BRAINSTORM mode để khám phá ý tưởng có cấu trúc. Dùng khi cần cân nhắc nhiều phương án trước khi implementation.

---

## Behavior

1. **Hiểu mục tiêu**
   - Vấn đề cần giải quyết là gì?
   - Người dùng cuối là ai?
   - Constraints: tech stack, timeline, budget?
   - Đã có gì rồi? (từ context đọc ở Pre-Flight)

2. **Tạo ≥ 3 phương án**
   - Mỗi option rõ ràng, khác biệt thực sự
   - Có option unconventional / sáng tạo
   - Pros/cons trung thực — không che giấu độ phức tạp

3. **So sánh & Khuyến nghị**
   - Bảng so sánh nhanh
   - Recommendation có reasoning cụ thể
   - Dựa trên context dự án thực tế

---

## Output Format

```markdown
## 🧠 Brainstorm: [Topic]

### Context
[Tóm tắt vấn đề + tech stack hiện tại]

---

### Option A: [Tên]
[Mô tả]

✅ **Pros:** [benefit 1] · [benefit 2]
❌ **Cons:** [drawback 1]
📊 **Effort:** Low | Medium | High
🔧 **Phù hợp stack:** [có/không/cần thêm gì]

---

### Option B: [Tên]
[Mô tả]

✅ **Pros:** ...
❌ **Cons:** ...
📊 **Effort:** Low | Medium | High
🔧 **Phù hợp stack:** ...

---

### Option C: [Tên]
[Mô tả]

✅ **Pros:** ...
❌ **Cons:** ...
📊 **Effort:** Low | Medium | High
🔧 **Phù hợp stack:** ...

---

## 📊 So sánh nhanh

| Tiêu chí | Option A | Option B | Option C |
|---|---|---|---|
| Effort | Low | High | Medium |
| Rủi ro | Thấp | Cao | Trung bình |
| Phù hợp stack | ✅ | ⚠️ | ✅ |

## 💡 Khuyến nghị

**Option [X]** vì [reasoning cụ thể dựa trên context dự án].

---

➡️ Bước tiếp theo: `/plan [option đã chọn]` để lên kế hoạch chi tiết.
```

---

## Examples

```
/brainstorm authentication system
/brainstorm state management for complex form
/brainstorm database schema for social app
/brainstorm caching strategy
/brainstorm realtime notification approach
```

---

## Key Principles

- **No code** — ý tưởng, không phải implementation
- **Context-aware** — đề xuất phải khớp tech stack thực tế
- **Honest tradeoffs** — không che giấu độ phức tạp
- **Defer to user** — trình bày options, để user quyết định
- **Handoff rõ ràng** — luôn kết thúc bằng gợi ý `/plan` hoặc `/create`