---
name: fitly-pwa-mobile
description: Progressive Web App & Mobile-First patterns for Fitly. Use when building mobile layouts, PWA features, or touch-optimized UI.
allowed-tools: Read, Write, Edit, Bash
triggers:
  - "PWA"
  - "mobile layout"
  - "bottom nav"
  - "touch"
  - "safe area"
  - "add to home"
---

# Fitly PWA & Mobile-First Skill 📱

> **Philosophy:** Web that feels like Native. No install, full power.
> **Core Principle:** Thumb-first design. Every tap counts.

---

## 🎯 When to Use This Skill

- Setting up PWA manifest and icons
- Building mobile-first layouts
- Implementing bottom navigation
- Handling safe areas (iPhone notch/home bar)
- Touch gesture optimization

---

## 1. PWA Configuration

### manifest.json

```json
{
  "name": "Fitly - Virtual Try-On",
  "short_name": "Fitly",
  "description": "Try clothes with AI magic",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Meta Tags (layout.tsx)

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

---

## 2. Safe Area Handling

### CSS Variables

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}
```

### Bottom Navigation

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(60px + var(--safe-area-bottom));
  padding-bottom: var(--safe-area-bottom);
  background: rgba(10, 10, 10, 0.9);
  backdrop-filter: blur(20px);
}
```

---

## 3. Touch Optimization

### Tap Targets

```css
/* Minimum 44x44px for comfortable tapping */
.tap-target {
  min-height: 44px;
  min-width: 44px;
}

/* Active feedback */
.button {
  transition: transform 0.1s;
}
.button:active {
  transform: scale(0.95);
}
```

### Prevent Unwanted Behaviors

```css
/* Prevent pull-to-refresh */
html, body {
  overscroll-behavior-y: none;
}

/* Prevent text selection on buttons */
.button {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

/* Prevent zoom on input focus (iOS) */
input, textarea {
  font-size: 16px; /* Must be 16px+ */
}
```

---

## 4. Mobile Navigation Pattern

### Bottom Tab Bar (5 Tabs)

```typescript
const TABS = [
  { icon: 'Home', path: '/', label: 'Trang chủ' },
  { icon: 'Search', path: '/explore', label: 'Khám phá' },
  { icon: 'Camera', path: '/tryon', label: 'Thử đồ', featured: true },
  { icon: 'User', path: '/profile', label: 'Cá nhân' },
  { icon: 'ShoppingBag', path: '/cart', label: 'Giỏ hàng' },
];
```

### Icon Active States

```css
.nav-icon {
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.2s;
}
.nav-icon.active {
  color: #ffffff;
}
/* Featured center button */
.nav-icon.featured {
  background: linear-gradient(135deg, #f97316, #ec4899);
  border-radius: 50%;
  padding: 12px;
}
```

---

## 5. Page Transitions

### Framer Motion Setup

```typescript
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const pageTransition = {
  type: 'tween',
  duration: 0.2,
};
```

---

## 6. Offline Support (Optional)

### Service Worker Strategy

```
Network-first for:
  - API calls
  - Dynamic content

Cache-first for:
  - Static assets (CSS, JS, fonts)
  - User's saved model image
  - Previously viewed try-on results
```

---

## 7. Share Target API

### Receive Shared Links

```json
// In manifest.json
{
  "share_target": {
    "action": "/share-handler",
    "method": "GET",
    "params": {
      "url": "link"
    }
  }
}
```

### Handler Component

```typescript
// app/share-handler/page.tsx
export default function ShareHandler({ searchParams }) {
  const sharedUrl = searchParams.link;
  // Process the shared URL → Extract garment → Try-On
}
```

---

## 8. Anti-Patterns

### ❌ DON'T

- Use hover-only interactions (mobile has no hover)
- Place important buttons in top corners (hard to reach)
- Forget safe area padding
- Allow zoom on forms (breaks layout)
- Use tiny tap targets (<44px)

### ✅ DO

- Put primary actions in thumb zone (bottom 1/3)
- Add haptic feedback (vibration) on key actions
- Test on actual devices, not just simulators
- Use skeleton loaders, not spinners
- Respect reduced motion preference

---

## Design Tokens

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| Background | `#0a0a0a` | `#fafafa` |
| Card | `#1a1a1a` | `#ffffff` |
| Text Primary | `#ffffff` | `#0a0a0a` |
| Text Secondary | `#a1a1a1` | `#6b7280` |
| Border | `#2a2a2a` | `#e5e5e5` |
| Primary Gradient | `#f97316 → #ec4899` | Same |

---

> **Remember:** Your user is lying on a couch, using one thumb, probably distracted. Design for that. 🛋️👍
