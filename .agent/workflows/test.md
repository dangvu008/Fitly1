---
description: Test generation and test running command. Creates and executes tests for code.
---

---
description: Test generation and execution. Creates tests following AAA pattern, colocated with source files, with coverage thresholds.
---

# /test - Test Generation and Execution

$ARGUMENTS

---

## Pre-Flight: Auto-Discovery

```
1. Detect test framework: Jest / Vitest / pytest / RSpec (đọc package.json hoặc requirements.txt)
2. Đọc test files hiện tại → nhận biết patterns đang dùng
3. Kiểm tra terminal-mcp → chạy tests tự động
```

---

## Sub-commands

```
/test                    - Chạy tất cả tests
/test [file/feature]     - Tạo tests cho target cụ thể
/test coverage           - Hiển thị coverage report
/test watch              - Chạy tests ở watch mode
/test fix                - Phân tích và fix failing tests
```

---

## Coverage Thresholds (theo antigravity-rules §12)

| Layer | Threshold |
|---|---|
| Utils / Pure functions | **90%+** |
| API / Services | **80%+** |
| UI Components | **70%+** |
| Critical flows (auth, payment) | **100% E2E** |

> Báo cáo khi coverage dưới threshold — đừng tự nghĩ "đủ rồi".

---

## Behavior

### Khi tạo tests cho file/feature

1. **Phân tích code**
   - Identify functions, methods, edge cases
   - Tìm external dependencies cần mock
   - Đọc test files đã có → follow existing patterns

2. **Tạo test cases**
   - Happy path
   - Error cases
   - Edge cases (null, empty, boundary values)
   - Integration tests nếu cần

3. **Viết tests**
   - Colocated: `feature.ts` + `feature.test.ts` kề nhau
   - Theo AAA pattern (Arrange-Act-Assert)
   - Mock external dependencies
   - Tên test mô tả hành vi, không mô tả implementation

---

## Output Format

### Tạo tests

```markdown
## 🧪 Tests: [Target]

### Test Plan
| Test Case | Type | Coverage |
|---|---|---|
| Should create user successfully | Unit | Happy path |
| Should reject invalid email | Unit | Validation |
| Should handle DB connection error | Unit | Error case |
| Should login and access protected route | E2E | Critical flow |

### File tạo ra
`src/features/auth/auth.service.test.ts`

[Code block]

---

Chạy với: `npm test`
Coverage check: `npm run test:coverage`
```

### Khi chạy tests

```
🧪 Running tests...

✅ auth.test.ts        (5/5 passed)
✅ user.test.ts        (8/8 passed)
❌ order.test.ts       (2/3 — 1 failed)

FAILED: order.test.ts
  ✗ should calculate total with discount
    Expected: 90
    Received: 100
    → Lỗi tại: calculate_order_total.ts:47

Coverage:
  Utils:      94% ✅ (threshold: 90%)
  Services:   78% ⚠️ (threshold: 80%) ← cần thêm tests
  Components: 72% ✅ (threshold: 70%)

Total: 15 tests (14 passed, 1 failed)
```

---

## Test Patterns

### Unit Test — AAA

```typescript
describe('AuthService', () => {
  describe('login', () => {
    it('should return token for valid credentials', async () => {
      // Arrange
      const credentials = { email: 'test@test.com', password: 'pass123' };
      mockUserRepo.findByEmail.mockResolvedValue(validUser);

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result.token).toBeDefined();
      expect(result.token).toMatch(/^eyJ/); // JWT format
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      // Arrange
      const credentials = { email: 'test@test.com', password: 'wrong' };

      // Act & Assert
      await expect(authService.login(credentials))
        .rejects.toThrow('Invalid credentials');
    });

    it('should throw for non-existent user', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      await expect(authService.login(credentials)).rejects.toThrow();
    });
  });
});
```

---

## Key Principles

- **Test hành vi, không test implementation** — nếu refactor không breaking, test không nên fail
- **Một assertion có ý nghĩa mỗi test** (có thể có nhiều expect nếu cùng verify một concept)
- **Tên test = tài liệu** — đọc tên là hiểu luồng
- **AAA pattern bắt buộc**
- **Mock external dependencies** — DB, API, filesystem
- **Colocated** — test file kề source file, không đặt riêng vào `/tests`

---

## Examples

```
/test src/services/auth.service.ts
/test user registration flow
/test coverage
/test watch
/test fix
```