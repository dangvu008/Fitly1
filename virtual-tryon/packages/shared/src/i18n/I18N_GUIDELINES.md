# I18n (Internationalization) Guidelines

## Overview
Fitly supports multiple languages across both web app and browser extension. This document provides guidelines for maintaining and extending the i18n system.

## Supported Languages
| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| vi | Vietnamese | Tiếng Việt |
| ja | Japanese | 日本語 |
| ko | Korean | 한국어 |
| zh | Chinese | 中文 |
| th | Thai | ไทย |
| id | Indonesian | Bahasa Indonesia |
| es | Spanish | Español |
| fr | French | Français |

## Web App (Next.js)

### Using Translations in Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export function MyComponent() {
    // Use namespace for specific section
    const t = useTranslations('tryon');
    
    return (
        <div>
            <h1>{t('title')}</h1>
            <button>{t('try_on_button')}</button>
        </div>
    );
}
```

### Multiple Namespaces

```tsx
export function MyComponent() {
    const t = useTranslations(); // Access all namespaces
    
    return (
        <div>
            <h1>{t('common.app_name')}</h1>
            <p>{t('errors.generic')}</p>
        </div>
    );
}
```

### With Variables (Interpolation)

```tsx
// In messages/en.json:
// "gems_count": "{count} gems remaining"

const t = useTranslations('gems');
t('gems_count', { count: 50 }); // "50 gems remaining"
```

### Language Switching

```tsx
import { useLocale } from '@/lib/hooks/useLocale';

export function LanguageSwitcher() {
    const { locale, setLocale, locales, localeInfo } = useLocale();
    
    return (
        <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            {locales.map(loc => (
                <option key={loc} value={loc}>
                    {localeInfo[loc].flag} {localeInfo[loc].native}
                </option>
            ))}
        </select>
    );
}
```

## Message File Structure

```
apps/web/messages/
├── en.json     # English (default)
├── vi.json     # Vietnamese
├── ja.json     # Japanese
├── ko.json     # Korean
├── zh.json     # Chinese
├── th.json     # Thai
├── id.json     # Indonesian
├── es.json     # Spanish
└── fr.json     # French
```

### Namespace Organization

```json
{
    "common": {
        "app_name": "Fitly",
        "loading": "Loading...",
        "cancel": "Cancel"
    },
    "nav": {
        "home": "Home",
        "explore": "Explore"
    },
    "tryon": {
        "title": "Virtual Try-On",
        "try_on_button": "Try On"
    },
    "gems": {},
    "wardrobe": {},
    "errors": {}
}
```

## Adding New Translations

### Step 1: Add to English file first
```json
// messages/en.json
{
    "new_feature": {
        "title": "New Feature",
        "description": "This is a new feature"
    }
}
```

### Step 2: Add to all other language files
Make sure to add the same keys to all language files (vi.json, ja.json, etc.)

### Step 3: Use in component
```tsx
const t = useTranslations('new_feature');
return <h1>{t('title')}</h1>;
```

## Extension (Browser)

The extension uses inline translations in `sidebar.js`:

```javascript
const translations = {
    en: {
        your_photo: 'Your Photo',
        clothing: 'Clothing',
        // ...
    },
    vi: {
        your_photo: 'Ảnh của bạn',
        clothing: 'Quần áo',
        // ...
    },
    // other languages...
};

function t(key) {
    return translations[state.locale]?.[key] || translations['en'][key] || key;
}
```

## Best Practices

### 1. Never hardcode strings
```tsx
// ❌ Bad
<button>Try On</button>

// ✅ Good
<button>{t('try_on_button')}</button>
```

### 2. Use meaningful key names
```json
// ❌ Bad
"btn1": "Try On"

// ✅ Good
"try_on_button": "Try On"
```

### 3. Keep translations consistent
- Use the same key structure across all languages
- Always add new keys to ALL language files

### 4. Handle pluralization
```json
// English
"items_count": "{count, plural, =0 {No items} =1 {1 item} other {# items}}"

// Or simple approach:
"items_count_zero": "No items",
"items_count_one": "1 item",
"items_count_other": "{count} items"
```

### 5. Group related translations
```json
{
    "tryon": {
        "title": "...",
        "your_photo": "...",
        "clothing": "...",
        "try_on_button": "..."
    }
}
```

### 6. Keep context in mind
- Some languages have gendered words
- Some languages have different plural forms
- Some languages read right-to-left (not currently supported)

## Checklist for New Features

- [ ] Add translation keys to `messages/en.json`
- [ ] Add translations to all other language files
- [ ] Update extension translations in `sidebar.js` if applicable
- [ ] Test with at least 2 different languages
- [ ] Check text doesn't overflow (some languages are longer)
- [ ] Update shared translations in `packages/shared/src/i18n/translations.ts` if needed

## Tools

### Check missing translations
You can use the i18n checker script:
```bash
python .agent/skills/i18n-localization/scripts/i18n_checker.py
```

## Common Mistakes to Avoid

1. **Forgetting to add keys to all language files**
   - Missing keys will fall back to English, causing inconsistent UX

2. **Hardcoding strings in new components**
   - Always use `useTranslations()` hook

3. **Using dynamic keys**
   ```tsx
   // ❌ Bad - dynamic keys are hard to track
   t(`status_${status}`)
   
   // ✅ Good - explicit keys
   const statusMessages = {
       pending: t('status_pending'),
       completed: t('status_completed'),
   };
   statusMessages[status]
   ```

4. **Not testing with longer languages**
   - German, French, and Thai often have longer text than English
