---
description: Deployment command for production releases. Pre-flight checks and deployment execution.
---

---
description: Deployment command for production releases. Auto-detects platform, runs pre-flight checks, executes deployment with rollback plan.
---

# /deploy - Production Deployment

$ARGUMENTS

---

## Pre-Flight: Auto-Discovery

```
1. Kiểm tra MCP: github-mcp, terminal-mcp, filesystem-mcp
2. Auto-detect platform (xem bảng §Platform Detection)
3. Đọc .env.example → verify tất cả vars có trong .env production
4. Đọc ARCHITECTURE.md nếu có → tìm deployment notes
```

### Platform Auto-Detection

```
Có vercel.json hoặc next.config.*   → Vercel
Có railway.toml                     → Railway
Có fly.toml                         → Fly.io
Có docker-compose.yml               → Docker
Có .github/workflows/deploy.*       → GitHub Actions
Không tìm thấy → Hỏi user
```

---

## Sub-commands

```
/deploy            - Interactive deployment wizard
/deploy check      - Pre-deployment checks only (không deploy)
/deploy preview    - Deploy to preview/staging
/deploy production - Deploy to production
/deploy rollback   - Rollback to previous version
```

---

## Pre-Deployment Checklist (bắt buộc mọi deploy)

```markdown
### Code Quality
- [ ] TypeScript: npx tsc --noEmit → 0 errors
- [ ] Lint: npx eslint . → 0 errors
- [ ] Tests: npm test → all passing
- [ ] Không có console.log debug còn sót

### Security
- [ ] Không có hardcoded secrets (git grep -r "sk-\|password=\|api_key")
- [ ] Environment variables đầy đủ (so sánh .env.example vs production env)
- [ ] npm audit → 0 critical vulnerabilities

### Performance
- [ ] Bundle size chấp nhận được
- [ ] Images đã optimize

### Rollback Plan ← PHẢI có trước khi bấm deploy
- [ ] Biết version hiện tại đang chạy: [version]
- [ ] Lệnh rollback: [command cụ thể]
- [ ] Database migration có thể revert không?
```

> ⛔ Không deploy nếu chưa có rollback plan.

---

## Deployment Flow

```
/deploy
  │
  ├─ Auto-Discovery (platform + env vars)
  │
  ├─ Pre-flight checks ──FAIL──► Báo lỗi cụ thể, dừng lại
  │
  ├─ Tóm tắt deploy + rollback plan → Xác nhận từ user
  │
  ├─ Build
  │
  ├─ Deploy to platform (dùng MCP nếu available)
  │
  ├─ Health check (30s retry x3)
  │
  └─ Report kết quả
```

---

## Output Format

### Successful Deploy

```markdown
## 🚀 Deployment Complete

| | |
|---|---|
| Version | v1.2.3 |
| Environment | production |
| Platform | Vercel |
| Duration | 47s |

### URLs
🌐 Production: https://app.example.com

### Health Check
✅ API: 200 OK
✅ Database: connected
✅ All services healthy

### Rollback
Nếu cần: `vercel rollback` → về v1.2.2
```

### Failed Deploy

```markdown
## ❌ Deployment Failed

**Bước thất bại:** TypeScript compilation
**Lỗi:** `TS2345: Argument of type 'string' is not assignable...`
**File:** src/services/user.ts:45

### Cách fix
1. Sửa lỗi TypeScript tại file trên
2. Chạy `npm run build` local để verify
3. Thử `/deploy` lại

### Trạng thái hiện tại
✅ Production v1.2.2 vẫn đang chạy bình thường.
```

---

## Platform Commands

| Platform | Deploy Command | Rollback |
|---|---|---|
| Vercel | `vercel --prod` | `vercel rollback` |
| Railway | `railway up` | Dashboard → previous deployment |
| Fly.io | `fly deploy` | `fly releases rollback` |
| Docker | `docker compose up -d` | `docker compose down && checkout prev tag` |

---

## Examples

```
/deploy
/deploy check
/deploy preview
/deploy production
/deploy rollback
```