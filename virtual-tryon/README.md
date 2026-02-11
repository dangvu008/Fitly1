# Fitly - Virtual Try-On

> AI-powered virtual clothing try-on with Web App + Chrome Extension

## 🎯 Features

| Feature | Description |
|---------|-------------|
| 🎽 **Virtual Try-On** | AI-powered clothing try-on using Replicate models |
| 💎 **Gems System** | Pay-per-use credits system |
| 👕 **Wardrobe** | Save and organize favorite clothing items |
| 📤 **Share** | Share outfits to social media |
| 📥 **Download** | Download try-on results |
| ⚖️ **Compare** | Compare multiple outfits side-by-side |
| 🔌 **Extension** | Chrome extension for any fashion website |
| 🌐 **i18n** | Multi-language support (EN, VI) |

## 📁 Project Structure

```
fitly/
├── apps/
│   ├── web/                 # Next.js 15 Web App
│   └── extension/           # Chrome Extension (Manifest V3)
└── packages/
    └── shared/              # Shared types & constants
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase account
- Replicate API key

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your keys

# 3. Run database migrations
# Copy supabase/schema.sql to Supabase SQL Editor and run

# 4. Start development
npm run dev
```

### Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `apps/extension/` folder

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `REPLICATE_API_TOKEN` | Replicate API token |
| `STRIPE_SECRET_KEY` | Stripe secret key |

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Extension**: Chrome Manifest V3, Side Panel API
- **Backend**: Next.js API Routes, Supabase
- **AI**: Replicate (IDM-VTON, Kolors)
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **i18n**: next-intl

## 📖 Documentation

- [Implementation Plan](./docs/implementation_plan.md)
- [Database Schema](./apps/web/supabase/schema.sql)
- [API Routes](./apps/web/src/app/api/)

## 📜 License

MIT
