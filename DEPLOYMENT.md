# SOMA Connect — Deployment Guide

This guide covers deploying the **server** on [Render](https://render.com) (free tier) and the **client** on [Vercel](https://vercel.com) (free tier).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Deploy the Server on Render](#2-deploy-the-server-on-render)
3. [Deploy the Client on Vercel](#3-deploy-the-client-on-vercel)
4. [Connect Server & Client](#4-connect-server--client)
5. [Seed the Database](#5-seed-the-database)
6. [Configure Google OAuth (optional)](#6-configure-google-oauth-optional)
7. [Set Up UptimeRobot to Prevent Cold Starts](#7-set-up-uptimerobot-to-prevent-cold-starts)
8. [Post-Deployment Checklist](#8-post-deployment-checklist)
9. [Environment Variable Reference](#9-environment-variable-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

- A [GitHub](https://github.com) account with this repo pushed.
- A [Render](https://render.com) account (free).
- A [Vercel](https://vercel.com) account (free).
- A [MongoDB Atlas](https://cloud.mongodb.com) free cluster (M0) — already configured in the `.env`.
- A [Cloudinary](https://cloudinary.com) free account — already configured.
- A [Brevo](https://brevo.com) free SMTP account — already configured.
- (Optional) A [Google Cloud](https://console.cloud.google.com) project for OAuth.

---

## 2. Deploy the Server on Render

### 2a. Create a new Web Service

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New → Web Service**.
3. Connect your GitHub account and select the `soma-connect` repository.
4. Configure the service:
   - **Name:** `soma-connect-api`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/index.js`
   - **Plan:** Free (or Starter for no cold starts)
   - **Health Check Path:** `/api/health`

### 2b. Set Environment Variables

In the Render dashboard → your service → **Environment**, add the following variables.
Use the values from your `.env` file:

| Variable                   | Value                                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| `NODE_ENV`                 | `production`                                                          |
| `PORT`                     | `10000`                                                               |
| `MONGO_URI`                | _(your Atlas connection string)_                                      |
| `JWT_ACCESS_SECRET`        | _(generate: `openssl rand -hex 64`)_                                  |
| `JWT_REFRESH_SECRET`       | _(generate: `openssl rand -hex 64`)_                                  |
| `CLIENT_URL`               | _(your Vercel URL — set after step 3)_                                |
| `CLOUDINARY_CLOUD_NAME`    | `dmemlt9gp`                                                           |
| `CLOUDINARY_API_KEY`       | _(from Cloudinary dashboard)_                                         |
| `CLOUDINARY_API_SECRET`    | _(from Cloudinary dashboard)_                                         |
| `SMTP_HOST`                | `smtp-relay.brevo.com`                                                |
| `SMTP_PORT`                | `587`                                                                 |
| `SMTP_USER`                | _(your Brevo SMTP login)_                                             |
| `SMTP_PASS`                | _(your Brevo SMTP password)_                                          |
| `SMTP_FROM`                | `SOMA Market <enockuwumukiza850@gmail.com>`                           |
| `COOKIE_SECURE`            | `true`                                                                |
| `COOKIE_DOMAIN`            | _(leave **blank/empty** for Vercel↔Render cross-origin)_              |
| `GOOGLE_CLIENT_ID`         | _(from Google Cloud Console — optional)_                              |
| `GOOGLE_CLIENT_SECRET`     | _(from Google Cloud Console — optional)_                              |
| `GOOGLE_CALLBACK_URL`      | `https://<your-render-service>.onrender.com/api/auth/google/callback` |
| `UPSTASH_REDIS_REST_URL`   | _(from Upstash — optional)_                                           |
| `UPSTASH_REDIS_REST_TOKEN` | _(from Upstash — optional)_                                           |
| `HF_API_TOKEN`             | _(from HuggingFace — optional)_                                       |

> **Important:** `COOKIE_DOMAIN` must be set to an **empty string** (not `localhost`) when the frontend and API are on different domains. Setting it to the Render subdomain will break authentication cookies.

### 2c. Deploy

Click **Create Web Service**. Render will build and deploy automatically. Note your service URL — it will look like `https://soma-connect-api.onrender.com`.

---

## 3. Deploy the Client on Vercel

### 3a. Import the project

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New → Project**.
3. Select your `soma-connect` GitHub repository.
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 3b. Set Environment Variables

In Vercel → your project → **Settings → Environment Variables**:

| Variable          | Value                                            |
| ----------------- | ------------------------------------------------ |
| `VITE_API_URL`    | `https://<your-render-service>.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://<your-render-service>.onrender.com`     |

Replace `<your-render-service>` with your actual Render service name.

### 3c. Deploy

Click **Deploy**. Vercel will build and publish. Note your Vercel URL — e.g. `https://soma-connect.vercel.app`.

---

## 4. Connect Server & Client

After both are deployed:

1. Go to your **Render** service → **Environment**.
2. Set `CLIENT_URL` to your Vercel URL (e.g. `https://soma-connect.vercel.app`).
3. Click **Save Changes** — Render will auto-redeploy.

This ensures the CORS configuration and cookie `SameSite` settings allow the frontend to communicate with the API.

---

## 5. Seed the Database

The seed script creates demo sellers, products, an admin user, and a buyer account. Passwords are **randomly generated** and printed to the console once.

### Run the seed:

```bash
# From the server directory
cd server
npm run seed
```

Or trigger it from a Render Shell (Dashboard → your service → **Shell**):

```bash
node dist/scripts/seed.js
```

**Important:** Copy the printed credentials immediately — they are not stored anywhere in the code. Example output:

```
========== SEED CREDENTIALS (save these now) ==========
[seed] admin  → email admin@somamarket.rw  | pw: a1b2c3d4e5f6a7b8
[seed] buyer  → email buyer@somamarket.rw  | pw: z9y8x7w6v5u4t3s2
=======================================================
```

You can also pre-set passwords via environment variables before seeding:

```bash
SEED_ADMIN_PASSWORD=MySecureAdminPw123 SEED_BUYER_PASSWORD=MySecureBuyerPw456 node dist/scripts/seed.js
```

---

## 6. Configure Google OAuth (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web Application).
3. Add Authorised redirect URIs:
   - `https://<your-render-service>.onrender.com/api/auth/google/callback`
4. Copy the **Client ID** and **Client Secret** into Render environment variables.
5. Set `GOOGLE_CALLBACK_URL` to the same redirect URI.

---

## 7. Set Up UptimeRobot to Prevent Cold Starts

Render's free tier spins down services after 15 minutes of inactivity, causing the next request to take 30–60 seconds. Prevent this with a free uptime monitor:

1. Sign up at [UptimeRobot.com](https://uptimerobot.com) (free tier: up to 50 monitors).
2. Click **Add New Monitor**.
3. Configure:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `SOMA Connect API`
   - **URL:** `https://<your-render-service>.onrender.com/api/health`
   - **Monitoring Interval:** Every **5 minutes**
4. Click **Create Monitor**.

This keeps the server warm and ensures near-instant response times for visitors.

---

## 8. Post-Deployment Checklist

After deploying, verify the following:

- [ ] `https://<render-url>/api/health` returns `{"status":"ok"}`.
- [ ] Client loads at Vercel URL without CORS errors in the browser console.
- [ ] Register a new account and receive the OTP email.
- [ ] Log in and place a test order with Cash on Delivery.
- [ ] Place a test order with MTN MoMo — verify the manual payment instructions appear (no USSD auto-confirm).
- [ ] Log in as admin and confirm the test MoMo order via `/admin/orders`.
- [ ] Upload a product image and confirm it appears via Cloudinary.
- [ ] Check `/privacy` and `/terms` pages load correctly.
- [ ] Seed credentials are saved securely and the seed output is not publicly visible.

---

## 9. Environment Variable Reference

### Server (.env)

```dotenv
NODE_ENV=production
PORT=10000

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<app>

# JWT — use openssl rand -hex 64 to generate
JWT_ACCESS_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Client URL — your Vercel deployment URL
CLIENT_URL=https://soma-connect.vercel.app

# Cookies
COOKIE_SECURE=true
COOKIE_DOMAIN=          # Leave BLANK for Vercel↔Render cross-origin

# Cloudinary
CLOUDINARY_CLOUD_NAME=dmemlt9gp
CLOUDINARY_API_KEY=<your-key>
CLOUDINARY_API_SECRET=<your-secret>

# Email (Brevo SMTP)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your-brevo-smtp-user>
SMTP_PASS=<your-brevo-smtp-password>
SMTP_FROM=SOMA Connect <enockuwumukiza850@gmail.com>

# Google OAuth (optional)
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=https://<render-service>.onrender.com/api/auth/google/callback

# Upstash Redis (optional — rate limiting)
UPSTASH_REDIS_REST_URL=<your-upstash-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>

# HuggingFace (optional — AI search)
HF_API_TOKEN=<your-hf-token>
```

### Client (.env.production / Vercel env vars)

```dotenv
VITE_API_URL=https://<your-render-service>.onrender.com/api
VITE_SOCKET_URL=https://<your-render-service>.onrender.com
```

---

## 10. Troubleshooting

### "Failed to fetch" / CORS errors in browser

- Confirm `CLIENT_URL` in Render matches your exact Vercel URL (no trailing slash).
- Confirm `COOKIE_DOMAIN` is set to an **empty string**, not `localhost`.
- Check that your Vercel project's `VITE_API_URL` points to the correct Render URL.

### Authentication cookies not persisting (login works but redirects back)

- `COOKIE_DOMAIN` must be blank for cross-origin deployments.
- `COOKIE_SECURE` must be `true` in production.
- The API must be on HTTPS (Render provides this automatically).

### Google OAuth redirect_uri_mismatch

- The `GOOGLE_CALLBACK_URL` env var must exactly match the redirect URI registered in Google Cloud Console, including `https://` and no trailing slash.

### Render cold starts (slow first response)

- Set up UptimeRobot as described in [section 7](#7-set-up-uptimerobot-to-prevent-cold-starts).
- Or upgrade to Render's paid Starter plan ($7/month) which eliminates cold starts.

### Build fails on Render

- Check the build logs in the Render dashboard.
- Common cause: missing env vars. Ensure `MONGO_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are set before the first deploy.

### Seed script fails

- Ensure `MONGO_URI` is set in your environment.
- MongoDB Atlas: confirm your Atlas cluster's IP Access List includes `0.0.0.0/0` or the Render IP range.

---

_Last updated for deployment branch `feature/deployement-preparation`._
