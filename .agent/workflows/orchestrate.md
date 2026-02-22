---
description: Coordinate multiple agents for complex tasks. Use for multi-perspective analysis, comprehensive reviews, or tasks requiring different domain expertise.
---

---
description: Coordinate multiple agents for complex tasks. Multi-perspective analysis, comprehensive reviews, tasks requiring different domain expertise. Minimum 3 agents required.
---

# /orchestrate - Multi-Agent Orchestration

$ARGUMENTS

---

## Pre-Flight: Auto-Discovery

```
1. Đọc ARCHITECTURE.md + CODEBASE.md → Hiểu toàn bộ scope
2. Kiểm tra docs/PLAN-*.md → Plan đã có chưa?
3. Xác định domains bị ảnh hưởng → Chọn agents phù hợp
```

---

## 🔴 Yêu cầu tối thiểu: 3 AGENTS KHÁC NHAU

> Nếu dùng ít hơn 3 agents → KHÔNG phải orchestration, chỉ là delegation.
>
> Kiểm tra trước khi kết thúc: `agent_count >= 3` → nếu không, gọi thêm agents.

### Agent Selection Matrix

| Loại task | Agents BẮT BUỘC |
|---|---|
| Web App | frontend-specialist, backend-specialist, test-engineer |
| API | backend-specialist, security-auditor, test-engineer |
| UI/Design | frontend-specialist, seo-specialist, performance-optimizer |
| Database | database-architect, backend-specialist, security-auditor |
| Full Stack | project-planner, frontend-specialist, backend-specialist, devops-engineer |
| Debug | debugger, explorer-agent, test-engineer |
| Security | security-auditor, penetration-tester, devops-engineer |

---

## 🔴 2-PHASE ORCHESTRATION PROTOCOL

### PHASE 1: PLANNING (Sequential — không chạy parallel)

| Bước | Agent | Action |
|---|---|---|
| 1 | `project-planner` | Tạo `docs/PLAN.md` |
| 2 | `explorer-agent` (tùy chọn) | Khám phá codebase nếu cần |

> 🔴 **KHÔNG dùng agent khác trong Phase 1.** Chỉ project-planner + explorer-agent.

### ⏸️ CHECKPOINT: Xác nhận của User

```
Sau khi PLAN.md hoàn thành, hỏi user:

"✅ Plan đã tạo: docs/PLAN.md

Bạn có muốn bắt đầu implementation không?
- Y: Tiến hành Phase 2
- N: Tôi sẽ chỉnh sửa plan"
```

> 🔴 **KHÔNG chuyển sang Phase 2 khi chưa có xác nhận rõ ràng từ user.**

### PHASE 2: IMPLEMENTATION (Parallel — sau khi user xác nhận)

| Nhóm | Agents |
|---|---|
| Foundation | `database-architect`, `security-auditor` |
| Core | `backend-specialist`, `frontend-specialist` |
| Polish | `test-engineer`, `devops-engineer` |

---

## Context Passing — BẮT BUỘC khi gọi subagent

Mỗi subagent phải nhận đủ context:

```
**CONTEXT:**
- Yêu cầu gốc: [full text của user]
- Quyết định đã có: [kết quả Socratic Gate]
- Công việc agents trước: [tóm tắt những gì đã làm]
- Plan hiện tại: [nội dung PLAN.md nếu có]

**TASK:** [nhiệm vụ cụ thể cho agent này]
```

> ⚠️ Gọi subagent thiếu context = subagent sẽ đưa ra giả định sai.

---

## Available Agents (17)

| Agent | Domain | Dùng khi |
|---|---|---|
| `project-planner` | Planning | Task breakdown, tạo PLAN.md |
| `explorer-agent` | Discovery | Khám phá codebase |
| `frontend-specialist` | UI/UX | React, Vue, CSS, HTML |
| `backend-specialist` | Server | API, Node.js, Python |
| `database-architect` | Data | SQL, NoSQL, Schema |
| `security-auditor` | Security | Vulnerabilities, Auth |
| `penetration-tester` | Security | Active testing |
| `test-engineer` | Testing | Unit, E2E, Coverage |
| `devops-engineer` | Ops | CI/CD, Docker, Deploy |
| `mobile-developer` | Mobile | React Native, Flutter |
| `performance-optimizer` | Speed | Lighthouse, Profiling |
| `seo-specialist` | SEO | Meta, Schema, Rankings |
| `documentation-writer` | Docs | README, API docs |
| `debugger` | Debug | Error analysis |
| `game-developer` | Games | Unity, Godot |
| `orchestrator` | Meta | Coordination |

---

## Phase Detection

| Trạng thái | Action |
|---|---|
| KHÔNG có `docs/PLAN.md` | → Vào PHASE 1 (planning only) |
| Có `docs/PLAN.md` + user đã xác nhận | → Vào PHASE 2 (implementation) |

---

## Verification (MANDATORY — bước cuối cùng)

Agent cuối cùng phải chạy:
```bash
python ~/.claude/skills/vulnerability-scanner/scripts/security_scan.py .
python ~/.claude/skills/lint-and-validate/scripts/lint_runner.py .
```

---

## Output Format

```markdown
## 🎼 Orchestration Report

### Task
[Tóm tắt task gốc]

### Agents Invoked (tối thiểu 3)
| # | Agent | Nhiệm vụ | Trạng thái |
|---|---|---|---|
| 1 | project-planner | Task breakdown | ✅ |
| 2 | frontend-specialist | UI implementation | ✅ |
| 3 | test-engineer | Verification | ✅ |

### Verification
- [x] security_scan.py → Pass
- [x] lint_runner.py → Pass

### Key Findings
1. **[Agent 1]**: [Finding]
2. **[Agent 2]**: [Finding]
3. **[Agent 3]**: [Finding]

### Deliverables
- [ ] PLAN.md tạo xong
- [ ] Code implemented
- [ ] Tests passing
- [ ] Scripts verified

### Summary
[Tổng hợp kết quả từ tất cả agents]
```

---

## 🔴 Exit Gate

Trước khi đánh dấu orchestration hoàn thành:

1. ✅ `agent_count >= 3`
2. ✅ `security_scan.py` đã chạy
3. ✅ Orchestration Report đã có đủ agents

> Nếu bất kỳ check nào fail → GỌI THÊM AGENTS hoặc chạy scripts còn thiếu.