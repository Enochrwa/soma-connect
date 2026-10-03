/**
 * pawaPay Merchant API **v2** client.
 *
 * Docs: https://docs.pawapay.io/v2/docs/deposits
 * Sandbox: https://api.sandbox.pawapay.io   Production: https://api.pawapay.io
 *
 * NOTE ON VERSIONS: v2 changed the payload shape from v1. In v1 the payer was
 * `{ type: "MSISDN", address: { value } }` plus a top-level `correspondent` and
 * `country`. In v2 it is `{ type: "MMO", accountDetails: { phoneNumber, provider } }`
 * with no `country` on the request, and endpoints are prefixed `/v2/`.
 * Everything here targets v2.
 */
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";

/** Rwanda providers configured on pawaPay. */
export type PawaPayProvider = "MTN_MOMO_RWA" | "AIRTEL_RWA";

/** Status returned on initiation (synchronous). */
export type PawaPayInitiationStatus = "ACCEPTED" | "REJECTED" | "DUPLICATE_IGNORED";

/** Status of a payment in its lifecycle (from callback or status check). */
export type PawaPayPaymentStatus =
  | "ACCEPTED"
  | "ENQUEUED"
  | "SUBMITTED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "IN_RECONCILIATION";

export interface PawaPayFailureReason {
  failureCode?: string;
  failureMessage?: string;
}

export interface PawaPayInitiationResponse {
  depositId?: string;
  payoutId?: string;
  refundId?: string;
  status: PawaPayInitiationStatus;
  nextStep?: string;
  created?: string;
  failureReason?: PawaPayFailureReason;
}

/** Wrapper returned by the v2 status-check endpoints. */
export interface PawaPayStatusResult<T = Record<string, unknown>> {
  status: "FOUND" | "NOT_FOUND";
  data?: T;
}

/**
 * Thrown when we genuinely cannot tell whether pawaPay accepted a payment
 * (network failure, or HTTP 500 / UNKNOWN_ERROR). Callers MUST NOT treat this
 * as a failed payment — they should leave it pending and let the reconciliation
 * job resolve it. See docs: "Handling HTTP 500 with failureCode UNKNOWN_ERROR".
 */
export class PawaPayIndeterminateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PawaPayIndeterminateError";
  }
}

async function pawapayFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  if (!env.PAWAPAY_API_TOKEN) {
    throw new HttpError(500, "pawaPay is not configured (missing PAWAPAY_API_TOKEN).");
  }

  let res: Response;
  try {
    res = await fetch(`${env.PAWAPAY_BASE_URL}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${env.PAWAPAY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    // Network error / timeout — we have no idea if pawaPay got the request.
    throw new PawaPayIndeterminateError(
      `Could not reach pawaPay: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const body = data as PawaPayFailureReason & { failureReason?: PawaPayFailureReason };
    const code = body.failureReason?.failureCode ?? body.failureCode;
    // 5xx or UNKNOWN_ERROR => indeterminate, never assume failure.
    if (res.status >= 500 || code === "UNKNOWN_ERROR") {
      throw new PawaPayIndeterminateError(
        `pawaPay returned ${res.status}${code ? ` (${code})` : ""}`,
      );
    }
    throw new HttpError(
      400,
      body.failureReason?.failureMessage ??
        body.failureMessage ??
        `pawaPay rejected the request (${res.status})`,
      data,
    );
  }
  return data as T;
}

/**
 * Validates and normalises a phone number, and predicts which MMO it belongs to.
 * Returns pawaPay's sanitised MSISDN, which is what the deposit/payout
 * endpoints expect. Input should include the country code.
 */
export async function predictProvider(phoneNumber: string): Promise<{
  country: string;
  provider: PawaPayProvider;
  phoneNumber: string;
}> {
  return pawapayFetch("/v2/predict-provider", {
    method: "POST",
    body: { phoneNumber: toMsisdn(phoneNumber) },
  });
}

/** Best-effort local normalisation to 2507XXXXXXXX. pawaPay does the authoritative cleanup. */
export function toMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("250")) return digits;
  if (digits.startsWith("0")) return `250${digits.slice(1)}`;
  if (digits.length === 9) return `250${digits}`;
  return digits;
}

/**
 * pawaPay rejects RWF amounts with decimals (decimalsInAmount: NONE), so we send
 * a whole-number string. Amounts are strings in v2, not numbers.
 */
function toAmount(amount: number): string {
  return String(Math.round(amount));
}

export interface InitiateDepositInput {
  depositId: string; // UUIDv4 — generate and PERSIST before calling
  amount: number; // RWF
  phoneNumber: string; // MSISDN, ideally from predictProvider
  provider: PawaPayProvider;
  customerMessage: string; // 4–22 chars, shown on the customer's statement
  orderId: string;
  clientReferenceId?: string;
}

export async function initiateDeposit(
  input: InitiateDepositInput,
): Promise<PawaPayInitiationResponse> {
  return pawapayFetch<PawaPayInitiationResponse>("/v2/deposits", {
    method: "POST",
    body: {
      depositId: input.depositId,
      amount: toAmount(input.amount),
      currency: "RWF",
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: toMsisdn(input.phoneNumber),
          provider: input.provider,
        },
      },
      customerMessage: input.customerMessage.slice(0, 22),
      ...(input.clientReferenceId ? { clientReferenceId: input.clientReferenceId } : {}),
      metadata: [{ orderId: input.orderId }],
    },
  });
}

export async function checkDepositStatus(depositId: string) {
  return pawapayFetch<PawaPayStatusResult>(`/v2/deposits/${depositId}`, { method: "GET" });
}

export interface InitiatePayoutInput {
  payoutId: string; // UUIDv4 — generate and PERSIST before calling
  amount: number;
  phoneNumber: string;
  provider: PawaPayProvider;
  customerMessage: string;
  payoutRecordId: string;
}

export async function initiatePayout(
  input: InitiatePayoutInput,
): Promise<PawaPayInitiationResponse> {
  return pawapayFetch<PawaPayInitiationResponse>("/v2/payouts", {
    method: "POST",
    body: {
      payoutId: input.payoutId,
      amount: toAmount(input.amount),
      currency: "RWF",
      recipient: {
        type: "MMO",
        accountDetails: {
          phoneNumber: toMsisdn(input.phoneNumber),
          provider: input.provider,
        },
      },
      customerMessage: input.customerMessage.slice(0, 22),
      metadata: [{ payoutRecordId: input.payoutRecordId }],
    },
  });
}

export async function checkPayoutStatus(payoutId: string) {
  return pawapayFetch<PawaPayStatusResult>(`/v2/payouts/${payoutId}`, { method: "GET" });
}

export async function initiateRefund(input: {
  refundId: string;
  depositId: string;
  amount?: number;
}): Promise<PawaPayInitiationResponse> {
  return pawapayFetch<PawaPayInitiationResponse>("/v2/refunds", {
    method: "POST",
    body: {
      refundId: input.refundId,
      depositId: input.depositId,
      ...(input.amount ? { amount: toAmount(input.amount) } : {}),
    },
  });
}

/**
 * Providers and their availability/limits for Rwanda. Used by the checkout UI so
 * new providers appear without a code change, and so we can warn the customer
 * before they try to pay with a provider that's currently down.
 */
export async function getActiveConfig(operationType: "DEPOSIT" | "PAYOUT" = "DEPOSIT") {
  return pawapayFetch<Record<string, unknown>>(
    `/v2/active-conf?country=RWA&operationType=${operationType}`,
    { method: "GET" },
  );
}
