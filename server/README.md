# SOMA Market — Server

Express + TypeScript + Mongoose + Socket.IO.

## Routes (selected)

- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/otp/request` · `POST /api/auth/otp/verify`
- `GET  /api/auth/google` · `GET /api/auth/google/callback`
- `POST /api/auth/refresh` · `POST /api/auth/logout`
- `GET  /api/products` · `GET /api/products/:id` · `POST /api/products`
- `GET  /api/sellers/:slug` · `POST /api/sellers/apply`
- `POST /api/orders` · `GET /api/orders/:id` · `PATCH /api/orders/:id/status`
- `POST /api/payments/mock`
- `POST /api/reviews`
- `POST /api/ai/chat`

## Sockets

- `marketPulse` — live shopper count + flash sale ticker
- `order:<orderId>` — order status updates

## Scripts

- `npm run dev` — tsx watch
- `npm run seed` — populate demo Rwandan data
- `npm run build && npm start` — production
