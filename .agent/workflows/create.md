---
description: Create new application command. Triggers App Builder skill and starts interactive dialogue with user.
---

---
description: Create new application from scratch. Full scaffold, config, and build workflow with multi-agent coordination.
---

# /create - Create Application

$ARGUMENTS

---

## Pre-Flight: Auto-Discovery

```
1. Kiểm tra MCP available: filesystem-mcp, terminal-mcp, supabase-mcp, github-mcp
2. Kiểm tra folder hiện tại — đã có project chưa? (tránh overwrite)
3. Nếu có ARCHITECTURE.md → đọc trước (user có thể đang thêm app vào monorepo)
```

---

## Socratic Gate — Hỏi trước khi code

Nếu request thiếu thông tin, hỏi tối đa 3 câu:
- Loại ứng dụng? (web / mobile / API / fullstack)
- Tính năng cốt lõi cần có ngay?
- Tech stack preference? (nếu không có → dùng defaults bên dưới)

**Defaults khi không chỉ định:**
```
Web:     Next.js + TypeScript + Tailwind + Supabase
Mobile:  React Native + TypeScript + Expo
API:     Node.js + Fastify + TypeScript + PostgreSQL
```

---

## Workflow

### Phase 1: Planning

1. **Dùng `project-planner` agent** tạo `docs/PLAN-{slug}.md`
   - Task breakdown
   - File structure đề xuất
   - Agent assignments
   - Security checklist

2. **Trình bày plan** cho user xác nhận:
   ```
   📋 Kế hoạch tạo [app name]:
   - [X] files mới
   - Tech stack: [stack]
   - Agents sẽ dùng: database-architect, backend-specialist, frontend-specialist
   - Thời gian ước tính: ~[N] phút

   Xác nhận để bắt đầu? (Y/N)
   ```

> ⛔ **KHÔNG viết code trước khi user xác nhận plan.**

---

### Phase 2: Scaffold

Sau khi user xác nhận:

```
1. Tạo cấu trúc thư mục theo §5 (antigravity-rules)
2. Tạo config files: tsconfig, eslint, prettier, env.example
3. Setup .gitignore, README.md
4. Tạo AI Context Header cho mỗi file (§6④ antigravity-rules)
```

---

### Phase 3: Build — Parallel Agents

Phân công song song:

| Agent | Nhiệm vụ |
|---|---|
| `database-architect` | Schema, migrations, seed data |
| `backend-specialist` | API routes, services, middleware |
| `frontend-specialist` | Pages, components, layouts |
| `security-auditor` | Auth flow, input validation, env vars |

---

### Phase 4: Security Scan & Verify

```bash
python ~/.claude/skills/vulnerability-scanner/scripts/security_scan.py .
python ~/.claude/skills/lint-and-validate/scripts/lint_runner.py .
```

Checklist trước khi báo hoàn thành:
- [ ] Không có hardcoded secrets
- [ ] `.env.example` đã có tất cả vars cần thiết
- [ ] Input validation tại API layer
- [ ] Auth routes có rate limiting
- [ ] TypeScript strict mode bật

---

### Phase 5: Preview

```bash
python ~/.claude/scripts/auto_preview.py start
```

Báo cáo URL cho user.

---

## Output khi hoàn thành

```markdown
## ✅ [App Name] đã được tạo

### Stack
- Framework: [X]
- Database: [X]
- Auth: [X]

### Files tạo ra
- [N] files mới
- Cấu trúc: src/app · src/features · src/shared

### Security
✅ No hardcoded secrets
✅ Input validation: Zod schemas
✅ Auth: [method]

### Preview
🌐 http://localhost:3000

### Bước tiếp theo
- `/enhance` để thêm tính năng
- `/test` để viết tests
- `/deploy` khi sẵn sàng
```

---

## Usage Examples

```
/create blog site
/create e-commerce app with product listing and cart
/create todo app
/create SaaS dashboard with analytics
/create REST API for mobile app
```