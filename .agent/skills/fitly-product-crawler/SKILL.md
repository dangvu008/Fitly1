---
name: fitly-product-crawler
description: Fashion product scraping and image extraction from e-commerce sites. Use when implementing URL parser, image validator, or product import features.
allowed-tools: Read, Write, Edit, Bash, Grep
triggers:
  - "crawler"
  - "scrape"
  - "extract product"
  - "parse URL"
  - "import from link"
---

# Fitly Product Crawler Skill 🕷️

> **Philosophy:** Any link → Try-on ready. Zero user effort.
> **Core Principle:** Find the RIGHT image. Reject the wrong ones.

---

## 🎯 When to Use This Skill

- Parsing product URLs from e-commerce sites
- Extracting the correct product image from multiple candidates
- Validating if an image is a wearable fashion item
- Handling user-pasted links or shared URLs

---

## 1. URL Processing Flow

```
User Input (URL/Image)
    ↓
[1] URL Validator - Is it a valid HTTP URL?
    ↓
[2] Site Detector - Known site or generic?
    ↓
[3] Image Extractor - Get all candidate images
    ↓
[4] AI Selector - Pick the main product image
    ↓
[5] Fashion Validator - Is it actually clothing?
    ↓
[6] Output - Cleaned image ready for Try-On
```

---

## 2. Image Extraction Strategies

### Strategy A: Known Sites (Fast, Reliable)

| Site | Selector/Method |
|------|-----------------|
| Shopee | `meta[property="og:image"]` |
| Lazada | `.pdp-mod-common-image img` |
| Zara | `picture.media-image source` |
| H&M | `.product-detail-main-image img` |
| Uniqlo | `.pdp-image-main img` |

### Strategy B: Generic (Fallback)

```typescript
const GENERIC_SELECTORS = [
  'meta[property="og:image"]',           // OpenGraph (most reliable)
  'script[type="application/ld+json"]',  // JSON-LD Product schema
  '[class*="product"] img',              // Common class patterns
  '[class*="main-image"] img',
  '[id*="product"] img',
];
```

### Strategy C: AI Vision (Last Resort)

Send all images to Gemini Flash:
```
"Here are N images from a webpage. Which one(s) show the MAIN product for sale?
Return:
- Index of best image (1-N)
- Category (Dress/Top/Pants/Shoes/Bag/Accessory)
- If NO product image found, return 'INVALID'"
```

---

## 3. Validation Rules

### Image Quality Checks

```typescript
const isValidProductImage = (img: ImageMeta): boolean => {
  // Minimum resolution
  if (img.width < 400 || img.height < 400) return false;
  
  // Skip icons/logos (usually square and tiny)
  if (img.width === img.height && img.width < 200) return false;
  
  // Skip banner-ratio images (too wide)
  if (img.width / img.height > 3) return false;
  
  // Skip vertical banners (too tall)
  if (img.height / img.width > 3) return false;
  
  return true;
};
```

### Content Validation (AI)

```typescript
const VALIDATION_PROMPT = `
Analyze this image. Answer:
1. Is this a wearable fashion item? (YES/NO)
2. If YES, what category? (Dress/Top/Pants/Shoes/Bag/Accessory/Other)
3. If NO, why? (banner/logo/detail-shot/lifestyle/multiple-items/unrelated)

Respond in JSON: { "isWearable": boolean, "category": string, "reason": string }
`;
```

---

## 4. Error Handling

### User-Friendly Messages

```typescript
const ERROR_MESSAGES = {
  'invalid_url': 'Link không hợp lệ, thử copy lại nhé!',
  'no_images': 'Không tìm thấy ảnh nào trên trang này',
  'no_product': 'Trang này không có sản phẩm thời trang',
  'multiple_products': 'Có nhiều sản phẩm, bạn chọn một cái nhé!',
  'blocked': 'Trang này chặn truy cập, thử ảnh chụp màn hình?',
  'timeout': 'Trang load quá lâu, thử link khác?',
};
```

### Fallback Flow

```
URL Parse Failed?
  → Try headless browser (Playwright)
  → Still failed? Ask user for screenshot

Multiple Products Detected?
  → Show grid of options
  → User taps to select one
```

---

## 5. Screenshot Processing

When URL fails, user can upload screenshot:

```typescript
const SCREENSHOT_PROMPT = `
This is a screenshot from a shopping app/website.
Task: Find the MAIN product image and extract its bounding box.
Return: { "found": boolean, "box": { x, y, width, height }, "category": string }
`;
```

---

## 6. Supported Input Methods

### PWA Mobile

| Method | UX Flow |
|--------|---------|
| **Share Sheet** | User shares link from Safari → Fitly receives URL |
| **Paste Link** | User copies URL, opens Fitly, pastes in input |
| **Screenshot** | User takes screenshot, uploads to Fitly |

### Browser Extension

| Method | UX Flow |
|--------|---------|
| **Right-Click** | User right-clicks image → "Try with Fitly" |
| **Sidebar** | Extension auto-detects product on page |

---

## 7. Rate Limiting & Caching

### Request Limits

```typescript
const RATE_LIMITS = {
  perUser: 30,      // requests per hour
  perSite: 100,     // requests per hour to same domain
  globalAI: 1000,   // AI calls per hour (cost control)
};
```

### Caching Strategy

```typescript
// Cache extracted products by URL
const CACHE_TTL = {
  productImage: 24 * 60 * 60,  // 24 hours
  siteSelector: 7 * 24 * 60 * 60,  // 7 days (site structure rarely changes)
};
```

---

## 8. Anti-Patterns

### ❌ DON'T

- Scrape without respecting robots.txt
- Store full product pages (copyright issues)
- Retry blocked requests aggressively
- Assume og:image is always the product
- Skip validation (garbage in = garbage out)

### ✅ DO

- Use headless browser for JavaScript-heavy sites
- Cache successful selectors per domain
- Give user fallback options (screenshot)
- Log extraction failures for improvement
- Respect site rate limits

---

## Tech Stack

| Component | Recommended |
|-----------|-------------|
| HTTP Client | `ky` or `axios` |
| Headless Browser | `Playwright` |
| HTML Parser | `cheerio` |
| Job Queue | `BullMQ` (for async processing) |
| AI Vision | `Gemini Flash` (cheapest, fast) |

---

> **Remember:** Users just want to paste a link and see magic. Handle the chaos silently. 🔗✨
