# Purchase, commission & referral flow

## Purchase

1. **Checkout** (`POST /api/orders`) — prices, variant deltas, delivery fee, coupon and loyalty-point
   discount are all computed **server-side**. Stock, coupon use and points are reserved atomically in one
   transaction. Buyers can't buy from their own store or from unapproved / closed stores.
2. **Pay** — checkout lists only what the server can process (`GET /api/payments/config`). Manual
   transfer: the buyer sees our MTN/Airtel number, pays, then submits their phone number and the MoMo
   transaction ID (`POST /api/payments/manual`) → order shows "awaiting verification" → an admin checks
   it against the MoMo statement and confirms or rejects (buyer gets a notification; rejected orders can
   be resubmitted; one transaction ID can't pay two orders). Other methods: mobile money via pawaPay (callback → `applyOrderPaid`), manual transfer confirmed by an admin
   (`POST /api/admin/orders/:id/confirm-payment`), or cash on delivery. A payment that lands _after_ an
   order was cancelled flags it `refund_pending` instead of reviving it.
3. **Fulfil** — sellers move paid/COD orders forward only: `payment_confirmed → preparing → packed →
picked_up → out_for_delivery → delivered`. Sellers cannot confirm payment. On multi-seller orders only
   an admin marks delivered / cancelled.
4. **Cancel** (buyer, seller, admin or the 2-hour auto-cancel) — gives back stock (incl. variants), the
   coupon use and redeemed points; a paid order becomes `refund_pending` until an admin marks it refunded.

## Seller earnings & commission

- On **delivery** each seller gets one `SellerEarning` ledger row:
  `gross − seller-funded discount = commission base`, `commission = base × rate`, `net = base − commission`.
- Rate: `COMMISSION_RATE` env (default 10%), overridable per seller (`PATCH /api/admin/sellers/:id/commission`).
- Commission is charged on **item sales only** (not delivery). Platform-funded discounts (loyalty points,
  platform-wide coupons) do not reduce what the seller earns; a seller's own coupon does.
- Earnings are withdrawable `EARNINGS_HOLD_DAYS` (default 2) after delivery, and are frozen while the buyer
  has an open dispute.
- `POST /api/payouts/me/request` atomically claims all withdrawable rows → no double payouts. Failed or
  rejected payouts release the rows again. A refund after payout leaves a clawback netted off the next payout.

## Referrals

- Every user has a `referralCode`. Invite link: `/register?ref=CODE` (also works with Google sign-up).
- The friend's first order must be **delivered** and ≥ `REFERRAL_MIN_ORDER_RWF` (default 5,000). Then the
  referrer gets `REFERRER_BONUS_POINTS` (500) and the friend `REFEREE_BONUS_POINTS` (200) — exactly once,
  capped at `REFERRAL_MAX_REWARDS` per referrer. Cancelled/refunded orders never pay out.

## Env vars (all optional)

`COMMISSION_RATE`, `EARNINGS_HOLD_DAYS`, `REFERRER_BONUS_POINTS`, `REFEREE_BONUS_POINTS`,
`REFERRAL_MIN_ORDER_RWF`, `REFERRAL_MAX_REWARDS`.

## Migration

Run once after deploying: `npm --prefix server run backfill:earnings` (dry run) then `-- --apply`.
This builds ledger rows for orders delivered before the ledger existed.
