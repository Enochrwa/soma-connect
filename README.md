# SOMA Market

Rwanda's open-source digital marketplace. MERN stack, 100% free tier services.

> **Heads up:** This codebase was scaffolded inside Lovable but targets a standard
> MERN runtime (Node + Express + MongoDB). The Lovable in-browser preview cannot
> execute Express or MongoDB — clone this repo and run it locally or on
> Render/Vercel using the instructions below.

## Stack

- **Client:** React 18 + TypeScript + Vite + TailwindCSS + Redux Toolkit (RTK Query) + React Router v6 + Framer Motion + Recharts + Lucide
- **Server:** Node.js + Express + TypeScript + Mongoose + Socket.IO + JWT + Multer + Cloudinary + Nodemailer
- **DB:** MongoDB Atlas (free 512MB) with Atlas Search
- **Cache / rate limit:** Upstash Redis (free 10K cmds/day)
- **Storage:** Cloudinary (free 25GB)
- **Email/OTP:** Nodemailer + Gmail SMTP
- **Payments:** Mock MTN/Airtel MoMo (3s simulated USSD push) + COD
- **AI:** Hugging Face Inference API (free tier) — `mistralai/Mistral-7B-Instruct-v0.2`

## Quick Start

### 1. Prerequisites
- Node 20+, npm
- MongoDB Atlas free cluster (or local Mongo via `docker compose up`)
- Upstash Redis free DB (optional in dev)
- Cloudinary free account
- Gmail account with App Password (for SMTP)
- Google OAuth client (free)
- Hugging Face token (free)

### 2. Environment

```bash
cp .env.example server/.env
cp client/.env.example client/.env
```

Fill in the values. See `.env.example` for the full list.

### 3. Install + run

```bash
# Terminal 1 — server
cd server
npm install
npm run seed     # seed Rwandan demo data
npm run dev      # starts on :4000

# Terminal 2 — client
cd client
npm install
npm run dev      # starts on :5173
```

Open http://localhost:5173.

### 4. Local Mongo + Redis (optional)

```bash
docker compose up -d
```

### 5. Deploy (free)
- **Client → Vercel:** import the `client/` folder, set `VITE_API_URL` to your Render URL.
- **Server → Render:** new web service, root `server/`, build `npm install && npm run build`, start `npm start`. Add all server env vars.
- **DB:** point `MONGO_URI` at your Atlas cluster.

## Folder map

```
soma-market/
├── client/      # React app
├── server/      # Express API + Socket.IO
├── docker-compose.yml
└── .env.example
```

See `client/README.md` and `server/README.md` for module-level docs.

## Status

This is a scaffold with the design system, auth, product CRUD, cart, mock
checkout, and order tracking wired end-to-end. Seller dashboard, admin
dashboard, loyalty, and AI assistant have skeleton routes and UI shells ready
to extend.
