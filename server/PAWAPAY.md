# pawaPay integration (Merchant API v2)

Replaces the manual mobile-money transfer flow with real-time, PIN-authorised
collections and automated seller payouts across MTN and Airtel in Rwanda.

## What changed

| File                                     | Change                                                                                                                                                                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/services/pawapay.service.ts`        | **New.** v2 API client — deposits, payouts, refunds, predict-provider, active-config.                                                                                                                                                                           |
| `src/services/pawapay.reconcile.ts`      | **New.** Recheck cycle for payments whose callback never arrived.                                                                                                                                                                                               |
| `src/routes/pawapay.routes.ts`           | **New.** `/api/payments/pawapay/*` — providers, predict, initiate, status, deposit + payout callbacks.                                                                                                                                                          |
| `src/routes/payout.routes.ts`            | Added `PATCH /admin/:id/disburse-pawapay` — actually moves money, unlike `/disburse` which only records a manual transfer.                                                                                                                                      |
| `src/services/automation.service.ts`     | **Bug fix** — the weekly payout cron used to call a 3-second mock, mark payouts `sent`, and email sellers saying they'd been paid, while no money moved. Now calls pawaPay for real, and the email only fires from the callback once the status is `COMPLETED`. |
| `src/models/Transaction.ts`, `Payout.ts` | Additive pawaPay fields. COD and the manual flow are untouched.                                                                                                                                                                                                 |

## API version note

pawaPay v2 is **not** shape-compatible with v1. If you find older snippets:

```jsonc
// v1 (do not use)
{ "correspondent": "MTN_MOMO_RWA", "country": "RWA",
  "payer": { "type": "MSISDN", "address": { "value": "250…" } } }

// v2 (what this code sends)
{ "currency": "RWF",
  "payer": { "type": "MMO",
             "accountDetails": { "phoneNumber": "250…", "provider": "MTN_MOMO_RWA" } } }
```

Endpoints are prefixed `/v2/`, and `amount` is a **string**. RWF allows no
decimals, so amounts are rounded to whole francs before sending.

## Setup

1. Get a sandbox token: pawaPay Dashboard → API tokens.
2. Set on Render (or `.env` locally):
   ```
   PAWAPAY_ENV=sandbox
   PAWAPAY_API_TOKEN=<token>
   PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io
   PAWAPAY_CALLBACK_SECRET=<any long random string>
   ```
3. Register these exact URLs in Dashboard → Developers → Callbacks:
   - Deposits: `https://<api-host>/api/payments/pawapay/callback?token=<secret>`
   - Payouts: `https://<api-host>/api/payments/pawapay/payouts/callback?token=<secret>`

   Locally, expose your server with `ngrok http 4000` and use the HTTPS URL.

4. Checkout shows the instant MTN/Airtel options only while `PAWAPAY_API_TOKEN` is set. Without it
   buyers see "Manual transfer" (if `MANUAL_PAY_*` numbers are set) and Cash on Delivery instead —
   no frontend flag needed.

## Sandbox test numbers (Rwanda)

The sandbox **skips the PIN prompt**, so payments resolve quickly.

**MTN (`MTN_MOMO_RWA`)**

| Number         | Deposit result                                                   |
| -------------- | ---------------------------------------------------------------- |
| `250783456789` | COMPLETED                                                        |
| `250783456039` | FAILED — PAYMENT_NOT_APPROVED                                    |
| `250783456029` | FAILED — PAYER_NOT_FOUND                                         |
| `250783456019` | FAILED — PAYER_LIMIT_REACHED                                     |
| `250783456129` | Stuck in SUBMITTED — **use this to test the reconciliation job** |

**Airtel (`AIRTEL_RWA`)**

| Number         | Deposit result                |
| -------------- | ----------------------------- |
| `250733456789` | COMPLETED                     |
| `250733456049` | FAILED — INSUFFICIENT_BALANCE |
| `250733456039` | FAILED — PAYMENT_NOT_APPROVED |
| `250733456129` | Stuck in SUBMITTED            |

For payouts, `250783456789` / `250733456789` complete; `…456089` gives
RECIPIENT_NOT_FOUND.

## Consistency guarantees

pawaPay's guide is strict about never guessing a payment's outcome. This
integration follows it:

- The `depositId` / `payoutId` is generated and **saved before** the API call, so
  a payment is always reconcilable even if the call never returns.
- A network error or HTTP 500 / `UNKNOWN_ERROR` raises `PawaPayIndeterminateError`
  and leaves the payment **pending** — never failed. The endpoint returns `202`.
- Callbacks are **idempotent**: a settled transaction is never reopened, so
  duplicate or out-of-order callbacks are safe.
- A reconciliation cron runs every 5 minutes over payments pending >15 minutes.
  `NOT_FOUND` (never reached pawaPay) is the only case where it marks a payment
  failed on its own.

## Still to do before production

- [ ] Enable **"Only accept signed requests"** in the Dashboard and verify the
      RFC-9421 `Signature` headers on callbacks. The `?token=` shared secret is a
      stopgap, not a substitute.
- [ ] Switch `PAWAPAY_ENV`, `PAWAPAY_BASE_URL`, and `PAWAPAY_API_TOKEN` to
      production values and re-register callback URLs against the live host.
- [ ] Drive the checkout provider list from `GET /api/payments/pawapay/providers`
      so new providers and downtime warnings appear without a deploy.
