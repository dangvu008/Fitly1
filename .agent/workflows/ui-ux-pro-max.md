---
description: Plan and implement UI
---

---
description: Plan and implement professional UI/UX. Searches design database for colors, typography, patterns. Always checks existing components before creating new ones.
---

# UI/UX Pro Max - Design Intelligence

Searchable database of UI styles, color palettes, font pairings, chart types, UX guidelines, and stack-specific best practices.

---

## Pre-Flight: Auto-Discovery

Trước khi bất cứ thứ gì, kiểm tra những gì đã có:

```
1. Quét shared/components/ui/ → Tìm components có thể tái sử dụng
2. Đọc MEMORY.md / UI_SYSTEM.md → Design tokens, color vars, spacing scale hiện tại
3. Đọc styles/ → Nếu có design tokens → PHẢI dùng, không hardcode
4. Kiểm tra Python có sẵn → cho bước search bên dưới
```

> ❌ KHÔNG tạo component mới nếu đã có trong `shared/components/ui/`.
> ❌ KHÔNG hardcode màu/spacing nếu đã có design tokens.

---

## Prerequisites

```bash
python3 --version || python --version
```

Nếu chưa có Python:

**macOS:** `brew install python3`
**Ubuntu:** `sudo apt update && sudo apt install python3`
**Windows:** `winget install Python.Python.3.12`

---

## Workflow

### Step 1: Phân tích Yêu cầu

Từ request của user, xác định:
- **Product type**: SaaS, e-commerce, portfolio, dashboard, landing page...
- **Style keywords**: minimal, playful, professional, elegant, dark mode...
- **Industry**: healthcare, fintech, gaming, education...
- **Stack**: React, Vue, Next.js → default: `html-tailwind`

### Step 2: Search Design Database

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

**Thứ tự search khuyến nghị:**

| # | Domain | Mục đích |
|---|---|---|
| 1 | `product` | Style recommendations cho product type |
| 2 | `style` | Style guide: colors, effects, frameworks |
| 3 | `typography` | Font pairings + Google Fonts imports |
| 4 | `color` | Color palette: Primary, Secondary, CTA, BG, Text, Border |
| 5 | `landing` | Page structure (chỉ nếu là landing page) |
| 6 | `chart` | Chart recommendations (chỉ nếu là dashboard) |
| 7 | `ux` | Best practices + anti-patterns |
| 8 | Stack flag | Stack-specific guidelines |

### Step 3: Stack Guidelines

Default stack: **`html-tailwind`** nếu user không chỉ định.

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

| Stack | Khi dùng |
|---|---|
| `html-tailwind` | Default — Tailwind utilities, responsive, a11y |
| `react` | React hooks, state, performance patterns |
| `nextjs` | SSR, routing, images, API routes |
| `vue` | Composition API, Pinia, Vue Router |
| `shadcn` | shadcn/ui components, theming, forms |
| `swiftui` | Views, State, Navigation, Animation |
| `react-native` | Components, Navigation, Lists |
| `flutter` | Widgets, State, Layout, Theming |

---

## Ví dụ Workflow

**Request:** "Làm landing page cho dịch vụ chăm sóc da chuyên nghiệp"

```bash
# 1. Kiểm tra shared/components/ui/ trước (Pre-Flight)
# → Tìm: Button, Card, Nav components có thể dùng lại

# 2. Search design database
python3 .shared/ui-ux-pro-max/scripts/search.py "beauty spa wellness service" --domain product
python3 .shared/ui-ux-pro-max/scripts/search.py "elegant minimal soft" --domain style
python3 .shared/ui-ux-pro-max/scripts/search.py "elegant luxury" --domain typography
python3 .shared/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --domain color
python3 .shared/ui-ux-pro-max/scripts/search.py "hero-centric social-proof" --domain landing
python3 .shared/ui-ux-pro-max/scripts/search.py "animation" --domain ux
python3 .shared/ui-ux-pro-max/scripts/search.py "accessibility" --domain ux
python3 .shared/ui-ux-pro-max/scripts/search.py "layout responsive" --stack html-tailwind

# 3. Tổng hợp + implement
```

---

## Quy tắc UI Chuyên nghiệp

### Icons & Visual

| ✅ Làm | ❌ Không làm |
|---|---|
| SVG icons (Heroicons, Lucide) | Dùng emoji 🎨 🚀 làm UI icon |
| Stable hover (color/opacity) | Scale transforms gây layout shift |
| Official SVG từ Simple Icons | Guess logo paths |
| Fixed viewBox 24x24 | Mix icon sizes ngẫu nhiên |

### Interaction

| ✅ Làm | ❌ Không làm |
|---|---|
| `cursor-pointer` cho clickable elements | Default cursor trên interactive elements |
| Visual hover feedback | Không có indication |
| `transition-colors duration-200` | Instant state changes hoặc >500ms |

### Light/Dark Mode Contrast

| ✅ Làm | ❌ Không làm |
|---|---|
| `bg-white/80` cho glass card (light) | `bg-white/10` (quá trong suốt) |
| `#0F172A` (slate-900) cho body text | `#94A3B8` (slate-400) cho body text |
| `border-gray-200` (light mode) | `border-white/10` (vô hình) |

### Layout

| ✅ Làm | ❌ Không làm |
|---|---|
| `top-4 left-4 right-4` cho floating nav | Stick nav sát `top-0 left-0` |
| Account cho fixed navbar height | Content ẩn sau fixed elements |
| `max-w-6xl` nhất quán | Mix container widths |

---

## Pre-Delivery Checklist

### Visual
- [ ] Không dùng emoji làm icons
- [ ] Icons từ consistent set (Heroicons/Lucide)
- [ ] Brand logos đúng (verified từ Simple Icons)
- [ ] Hover states không gây layout shift

### Interaction
- [ ] Tất cả clickable elements có `cursor-pointer`
- [ ] Hover feedback rõ ràng
- [ ] Transitions 150–300ms
- [ ] Focus states visible cho keyboard navigation

### Light/Dark Mode
- [ ] Light mode text contrast ≥ 4.5:1
- [ ] Glass/transparent elements visible ở light mode
- [ ] Borders visible cả hai modes

### Layout & Responsive
- [ ] Floating elements có đủ spacing
- [ ] Không content ẩn sau fixed navbars
- [ ] Responsive tại: 320px, 768px, 1024px, 1440px
- [ ] Không horizontal scroll trên mobile

### Accessibility
- [ ] Tất cả images có alt text
- [ ] Form inputs có labels
- [ ] Color không phải indicator duy nhất
- [ ] `prefers-reduced-motion` được tôn trọng

### Code Quality
- [ ] Dùng design tokens, không hardcode màu/spacing
- [ ] Tái dùng components từ `shared/components/ui/` khi có
- [ ] Tách components lớn thành files riêng (<200–300 dòng/file)