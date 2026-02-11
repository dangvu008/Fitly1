---
name: fitly-virtual-tryon
description: Virtual Try-On AI service for fashion apps. Use when implementing AI-powered clothing fitting, image manipulation, or try-on workflows.
allowed-tools: Read, Write, Edit, Bash, Grep
triggers:
  - "try-on"
  - "virtual fitting"
  - "AI clothing"
  - "garment swap"
  - "outfit preview"
---

# Fitly Virtual Try-On Skill 👗🪄

> **Philosophy:** One-tap magic. User sees themselves in new clothes instantly.
> **Core Principle:** Hide AI complexity. Make it feel like a "Magic Mirror".

---

## 🎯 When to Use This Skill

- Implementing AI-powered try-on features
- Processing user body images
- Handling garment images from external sources
- Building try-on result UI/UX

---

## 1. Try-On Service Architecture

### Provider Priority Chain

```
Gemini Flash (Primary) → Nano Banana (Fallback 1) → Qwen Edit (Fallback 2)
```

| Provider | Best For | Cost | Speed |
|----------|----------|------|-------|
| **Gemini Flash** | General try-on | $0.002/call | ~3s |
| **Nano Banana** | High-quality output | $0.01/call | ~5s |
| **Qwen Edit** | Image modifications | $0.005/call | ~4s |

### File Locations

```
apps/web/src/lib/
├── ai/prompts.ts           # Prompt templates by category
├── gemini/tryon.ts         # Gemini provider
├── replicate/
│   ├── nano_banana.ts      # Nano Banana provider
│   └── qwen_image_edit.ts  # Qwen Edit provider
├── tryon/
│   └── tryon_service.ts    # Unified service with fallback
```

---

## 2. Prompt Engineering Rules

### Category-Specific Placement

| Category | Placement Instruction |
|----------|----------------------|
| Tops/Shirts | "Replace ONLY upper body clothing, keep pants/skirt intact" |
| Dresses | "Replace FULL outfit from shoulders to mid-thigh" |
| Pants | "Replace ONLY lower body, keep shirt/top intact" |
| Accessories | "ADD item without removing existing clothing" |
| Shoes | "Replace ONLY footwear, keep outfit intact" |

### Face Preservation (CRITICAL)

```
ALWAYS include in every prompt:
"PRESERVE the person's face, skin tone, body shape, and pose EXACTLY.
 Do NOT alter facial features. The result must look like the SAME person."
```

### Anti-Hallucination Rules

```
NEVER include:
- "improve"
- "enhance beauty"
- "make more attractive"
- "better lighting"

ALWAYS include:
- "realistic fabric texture"
- "natural lighting consistent with source"
- "proper shadows and wrinkles"
```

---

## 3. User Model Management

### One-Time Setup (Onboarding)

```typescript
interface UserModel {
  id: string;
  userId: string;
  imageUrl: string;          // Processed full-body image
  processedAt: Date;
  bodyMetrics?: {            // Optional AI-detected measurements
    height: 'short' | 'average' | 'tall';
    bodyType: 'slim' | 'average' | 'plus';
  };
}
```

### Storage Strategy

- **Original**: Keep in S3/Supabase Storage (never delete)
- **Processed**: Cache cleaned version for fast try-on
- **Expiry**: Re-process if >30 days old (lighting/quality may vary)

---

## 4. Garment Image Processing

### Validation Pipeline

```
Input URL/Image
    ↓
[1] Check dimensions (min 512x512)
    ↓
[2] AI Classification: "Is this a wearable garment?"
    ↓
[3] Extract: Category, Color, Pattern
    ↓
[4] Store with metadata for Try-On
```

### Invalid Image Responses

```typescript
const REJECTION_MESSAGES = {
  'no_garment': 'Không tìm thấy quần áo trong ảnh này',
  'too_small': 'Ảnh quá nhỏ, cần ít nhất 512x512 pixels',
  'multiple_items': 'Ảnh có nhiều sản phẩm, vui lòng chọn 1',
  'not_fashion': 'Link này không chứa sản phẩm thời trang',
};
```

---

## 5. Result Handling

### Success Response UI

```
┌─────────────────────────┐
│     [Full Try-On Image] │
│                         │
│  ┌───────────────────┐  │
│  │ Custom Edit Input │  │  ← "Đổi màu đỏ", "Ngắn hơn"
│  └───────────────────┘  │
│                         │
│  [Save] [Share] [Buy]   │
└─────────────────────────┘
```

### Error Handling

| Error Type | User Message | Internal Action |
|------------|--------------|-----------------|
| AI Timeout | "Đang bận, thử lại nhé!" | Retry with fallback provider |
| Invalid Result | "Hmm, không ra đẹp lắm" | Log for manual review |
| Rate Limit | "Bạn thử quá nhanh rồi" | Queue request |

---

## 6. Cost Optimization

### Smart Caching

```
If same garment + same user model:
  → Return cached result (0 cost)
  → Expire cache after 7 days
```

### Quality Tiers

| Tier | Resolution | When to Use |
|------|------------|-------------|
| **Preview** | 512x512 | First try-on (fast) |
| **Full** | 1024x1024 | User "zooms in" or saves |

---

## 7. Anti-Patterns

### ❌ DON'T

- Ask user to upload garment image manually (use link/paste)
- Show AI progress bars with technical terms
- Return blurry or low-quality results
- Forget face preservation in prompts
- Use same prompt for all garment types

### ✅ DO

- Auto-extract garment from URL
- Show simple spinner: "Đang thử đồ..."
- Retry with fallback on failure
- Customize prompt per clothing category
- Cache results for repeat views

---

## Reference Files

- [prompts.ts](file:///apps/web/src/lib/ai/prompts.ts) - All prompt templates
- [tryon_service.ts](file:///apps/web/src/lib/tryon/tryon_service.ts) - Unified service

---

> **Remember:** Users don't care about AI. They care about seeing themselves in beautiful clothes. Make it magical. 🪄
