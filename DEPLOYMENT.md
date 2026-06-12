# SOMA Connect — Production Deployment Guide

## Architecture

- **Frontend**: Vercel (React + Vite)
- **Backend**: Render.com (Node.js + Express)
- **Database**: MongoDB Atlas (free M0 tier)
- **Email**: Brevo (300 free emails/day)
- **Media uploads**: Cloudinary (free 25 GB)

---

## 1. MongoDB Atlas (database)

1. Create a free account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a **free M0 cluster** (region: AWS / Frankfurt or nearest to Rwanda)
3. Under **Database Access** → Add a database user with username + strong password
4. Under **Network Access** → Add `0.0.0.0/0` (allow all IPs — needed for Render)
5. Click **Connect** → **Connect your application** → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/soma_market?retryWrites=true&w=majority
   ```
6. Use this as `MONGO_URI` in Render env vars

> **Text search**: After first deploy run `npm run seed` to create the text index on the products collection. Or it's created automatically on first seed.

---

## 2. Cloudinary (image uploads)

1. Sign up free at [cloudinary.com](https://cloudinary.com)
2. Dashboard → copy **Cloud name**, **API Key**, **API Secret**
3. Set these in Render: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

---

## 3. Brevo (transactional email)

1. Sign up free at [brevo.com](https://brevo.com) — 300 emails/day free
2. Go to **Settings → SMTP & API → SMTP**
3. Generate an SMTP key
4. Set in Render:
   - `SMTP_HOST` = `smtp-relay.brevo.com`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = your Brevo login email
   - `SMTP_PASS` = the SMTP key you generated
   - `SMTP_FROM` = `SOMA Market <no-reply@somamarket.rw>`

---

## 4. Deploy Backend to Render

1. Push this branch to GitHub
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your GitHub repo, select the `soma-connect` repo
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
   - **Region**: Oregon (or Frankfurt)
   - **Plan**: Starter ($7/mo) or Free (spins down after inactivity)
5. Under **Environment Variables** add all secrets from `server/.env.example`
6. Set `CLIENT_URL` = your Vercel URL (set after step 5 below, then redeploy)
7. Set `COOKIE_SECURE=true` and `COOKIE_DOMAIN=.yourdomain.com`

> **Note**: The free Render plan spins down after 15 min inactivity. Use Starter for a marketplace.

---

## 5. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select the `soma-connect` repo
3. Configure:
   - **Root Directory**: `client` ← important
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variables**:
   - `VITE_API_URL` = `https://your-render-service.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://your-render-service.onrender.com`
5. Deploy → copy the Vercel URL

Then go back to Render and update `CLIENT_URL` with the Vercel URL → Manual deploy.

---

## 6. Post-deployment checklist

- [ ] Run `npm run seed` against production DB (one-time, creates admin user + text index)
- [ ] Log in as `admin@somamarket.rw` / `admin1234` → **change the password immediately**
- [ ] Test an image upload via seller dashboard
- [ ] Test order flow end-to-end (mock MoMo auto-confirms in ~3s)
- [ ] Send a test OTP to verify email delivery
- [ ] Set up MongoDB Atlas **free tier alerts** for storage/connections

---

## 7. When you get real MoMo/Airtel API access

The mock payment service is in `server/src/services/payment.mock.ts`.

To swap in the real MTN MoMo API:

1. Replace `initiateMobileMoneyPush` with a call to MTN's Collection API
2. Set up the callback webhook at `POST /api/payment/webhook/mtn`
3. Verify the webhook signature, then update the `Transaction` and `Order` status
4. Remove the `setTimeout` simulation

MTN MoMo API docs: https://momodeveloper.mtn.com  
Airtel Money Rwanda: https://developers.airtel.africa

---

## 8. Environment variables quick reference

| Variable                | Where to get it                 |
| ----------------------- | ------------------------------- |
| `MONGO_URI`             | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET`     | `openssl rand -hex 64`          |
| `JWT_REFRESH_SECRET`    | `openssl rand -hex 64`          |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard            |
| `CLOUDINARY_API_KEY`    | Cloudinary dashboard            |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard            |
| `SMTP_USER`             | Your Brevo login email          |
| `SMTP_PASS`             | Brevo SMTP key                  |
| `CLIENT_URL`            | Your Vercel deployment URL      |
| `GOOGLE_CLIENT_ID`      | Google Cloud Console (optional) |
| `GOOGLE_CLIENT_SECRET`  | Google Cloud Console (optional) |
