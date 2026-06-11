# SOMA Market 🛒

> Rwanda's digital marketplace — connecting buyers and sellers across the country with a fast, mobile-first, offline-capable platform built for African users.

[![CI](https://github.com/Enochrwa/soma-connect/actions/workflows/ci.yml/badge.svg)](https://github.com/Enochrwa/soma-connect/actions/workflows/ci.yml)

---

## Stack

| Layer    | Technology                                                               |
| -------- | ------------------------------------------------------------------------ |
| Frontend | React 18 · TypeScript · Vite · TailwindCSS · Redux Toolkit · RTK Query   |
| Backend  | Node.js · Express · TypeScript · MongoDB (Mongoose) · Socket.IO          |
| Auth     | JWT (access 15m + refresh 7d httpOnly cookie) · Google OAuth · Email OTP |
| Storage  | Cloudinary (images/videos — free 25GB)                                   |
| Cache    | Upstash Redis (free 10K cmds/day)                                        |
| Email    | Nodemailer + Gmail SMTP (free)                                           |
| AI       | Hugging Face Inference API (Mistral-7B, BART — free tier)                |
| Maps     | Leaflet.js (no API key required)                                         |
| i18n     | i18next (English · Kinyarwanda · Français)                               |
| Payments | MTN MoMo / Airtel Money (mock UI, real API-ready) · Cash on Delivery     |

---

## Project Structure

```
soma-connect/
├── client/                     # React 18 frontend (Vite)
│   ├── src/
│   │   ├── app/                # Redux store, RTK Query API slices, typed hooks
│   │   ├── components/
│   │   │   ├── ui/             # Design system: Button, Card, Badge, Skeleton…
│   │   │   ├── layout/         # Navbar, Footer, MobileBottomNav, OfflineBanner
│   │   │   ├── home/           # MarketPulse, Hero, FlashDeals, CategoryPills…
│   │   │   └── product/        # ProductCard, ProductGallery, Reviews
│   │   ├── features/
│   │   │   ├── auth/           # authSlice (JWT + user state)
│   │   │   └── cart/           # cartSlice (persistent localStorage)
│   │   ├── pages/              # Route-level page components
│   │   ├── types/              # Shared TypeScript interfaces
│   │   ├── constants/          # Categories, Kigali sectors, config
│   │   ├── utils/              # formatRWF, formatDate, countdown
│   │   └── i18n/               # en.json, rw.json, fr.json
│   ├── public/
│   │   └── manifest.json       # PWA manifest
│   ├── Dockerfile              # Production (multi-stage + nginx)
│   ├── Dockerfile.dev          # Development
│   └── nginx.conf
│
├── server/                     # Express API
│   ├── src/
│   │   ├── config/env.ts       # Typed environment variables
│   │   ├── models/             # Mongoose schemas (User, Seller, Product, Order…)
│   │   ├── routes/             # auth, products, sellers, orders, payments, ai…
│   │   ├── services/           # email, cloudinary, ai (HF), payment mock, tokens
│   │   ├── middleware/         # auth (JWT), validate (Zod), rateLimiter, errorHandler
│   │   ├── socket/             # Socket.IO — market pulse + order real-time updates
│   │   ├── types/              # Shared server TypeScript types
│   │   ├── utils/              # slugify, makeOrderNumber
│   │   └── scripts/seed.ts     # Rwandan demo data seeder
│   ├── Dockerfile
│   └── .env.example
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint → TypeCheck → Build on every push/PR
│       ├── deploy.yml          # Auto-deploy to Vercel + Render on main
│       └── pr-checks.yml       # Branch name + typecheck on PRs
│
├── .husky/
│   ├── pre-commit              # lint-staged (ESLint + Prettier)
│   └── commit-msg              # Conventional commit validation
│
├── docker-compose.yml          # Full local stack (mongo, redis, server, client)
├── .env.example                # Template — copy to server/.env
└── .prettierrc
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional, for local MongoDB/Redis)

### 1. Clone & Install

```bash
git clone https://github.com/Enochrwa/soma-connect.git
cd soma-connect

# Install all workspaces
npm install --legacy-peer-deps
```

### 2. Environment Setup

```bash
# Server
cp .env.example server/.env
# Edit server/.env — MongoDB URI and Cloudinary are pre-filled

# Client (already configured for localhost)
# client/.env is ready for local dev
```

### 3. Start Local Services (MongoDB + Redis via Docker)

```bash
docker-compose up mongo redis -d
```

### 4. Seed Demo Data

```bash
cd server && npm run seed
# Creates: admin, buyer, 6 sellers, ~20 Rwandan products
# Admin:  phone +250 788 000 001 / pw admin1234
# Buyer:  phone +250 788 000 002 / pw buyer1234
```

### 5. Start Dev Servers

```bash
# From root — starts both client and server concurrently
npm run dev

# Or separately:
cd server && npm run dev   # http://localhost:4000
cd client && npm run dev   # http://localhost:5173
```

---

## API Reference

All endpoints are prefixed `/api/v1/` (or `/api/` in dev).

| Method | Endpoint                | Auth         | Description                       |
| ------ | ----------------------- | ------------ | --------------------------------- |
| POST   | `/auth/register`        | —            | Register with phone + password    |
| POST   | `/auth/login`           | —            | Login, returns access token       |
| POST   | `/auth/otp/request`     | —            | Send OTP to email                 |
| POST   | `/auth/otp/verify`      | —            | Verify OTP, returns access token  |
| POST   | `/auth/refresh`         | cookie       | Rotate refresh token              |
| POST   | `/auth/logout`          | cookie       | Clear refresh cookie              |
| GET    | `/products`             | —            | List/search products              |
| GET    | `/products/flash-deals` | —            | Active flash deals                |
| GET    | `/products/trending`    | —            | Top by sales + rating             |
| GET    | `/products/new`         | —            | Latest 12 products                |
| GET    | `/products/:id`         | —            | Product detail                    |
| POST   | `/products`             | seller       | Create product                    |
| POST   | `/orders`               | buyer        | Place order                       |
| GET    | `/orders/me`            | buyer        | My orders                         |
| GET    | `/orders/:id`           | buyer/admin  | Order detail                      |
| PATCH  | `/orders/:id/status`    | seller/admin | Update order status               |
| POST   | `/payments/mock`        | buyer        | Initiate mock MoMo payment        |
| POST   | `/reviews`              | buyer        | Submit review (verified purchase) |
| GET    | `/reviews/product/:id`  | —            | Product reviews                   |
| POST   | `/sellers/apply`        | buyer        | Apply to become a seller          |
| GET    | `/sellers/:slug`        | —            | Seller storefront                 |
| POST   | `/uploads`              | auth         | Upload files to Cloudinary        |
| POST   | `/ai/chat`              | —            | AI assistant (Hugging Face)       |
| GET    | `/loyalty/me`           | buyer        | My points + history               |
| POST   | `/loyalty/daily-login`  | buyer        | Claim daily login points          |
| GET    | `/api/health`           | —            | Server health check               |

---

## Payment Flow (Mock)

Since we're on zero budget, mobile money is a full UI mock:

1. Buyer selects MTN MoMo / Airtel Money at checkout
2. UI shows realistic "USSD push sent to your MTN number..." flow
3. Backend creates a `Transaction` record with status `initiated`
4. After 3 seconds, backend auto-confirms → order moves to `payment_confirmed`
5. Orders over RWF 500,000 → `manual_review` (admin approves manually)

**To activate real MoMo:** Replace `server/src/services/payment.mock.ts` with the actual MTN MoMo Rwanda API call — the rest of the codebase stays unchanged.

---

## Environment Variables

See `.env.example` for the full list. Minimum required to run:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
JWT_ACCESS_SECRET=<64-char-random-hex>
JWT_REFRESH_SECRET=<different-64-char-random-hex>
```

---

## Deployment (Free)

| Service  | Platform      | Free Tier                                     |
| -------- | ------------- | --------------------------------------------- |
| Frontend | Vercel        | Unlimited static deployments                  |
| Backend  | Render        | 750 hrs/month (sleeps after 15min inactivity) |
| Database | MongoDB Atlas | 512MB storage                                 |
| Redis    | Upstash       | 10,000 commands/day                           |
| Images   | Cloudinary    | 25GB storage + 25GB bandwidth                 |
| Email    | Gmail SMTP    | 500 emails/day                                |

### Deploy Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel
cd client && vercel --prod
# Set env vars in Vercel dashboard
```

### Deploy Backend (Render)

- Connect GitHub repo to Render
- Root dir: `server`
- Build cmd: `npm ci && npm run build`
- Start cmd: `npm run start:prod`
- Add all env vars from `server/.env`

---

## Contributing

1. Fork and create a branch: `git checkout -b feature/your-feature`
2. Commit using Conventional Commits: `feat(cart): add save-for-later`
3. Push and open a PR against `develop`

Pre-commit hooks will run ESLint + Prettier automatically.

---

## Seed Accounts

After running `npm run seed` from the server:

| Role    | Phone            | Password   |
| ------- | ---------------- | ---------- |
| Admin   | +250 788 000 001 | admin1234  |
| Buyer   | +250 788 000 002 | buyer1234  |
| Sellers | (auto-generated) | seller1234 |

---

Built with ❤️ for Rwanda 🇷🇼
