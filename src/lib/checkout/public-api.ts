import { PINGGO_API_BASE } from "@/lib/pinggo-api"
import type {
  CheckoutAddress,
  CheckoutBootstrap,
  CheckoutContact,
  CheckoutStatusResult,
  CreateAttemptResult,
  OtpSendResult,
  OtpVerifyResult,
  PaymentMethodKey,
  PublicCheckoutSession,
  RecognitionResult,
  VerifyAttemptResult,
} from "./types"

/**
 * Client for the shopper-facing checkout API (`/checkout/public/*`).
 *
 * Unauthenticated by design — the checkout token in the URL is the credential.
 * Safe to call from the browser, and every call here is one a shopper makes.
 *
 * Nothing in this file sends a price. The server prices everything from the
 * merchant's Shopify catalogue; the browser only ever says *what* and *how many*.
 */

const CHECKOUT_BASE = `${PINGGO_API_BASE}/checkout/public`

type Envelope<T> = {
  success?: boolean
  message?: string
  error?: unknown
  data?: T
}

export class CheckoutApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** 410 means the session is gone for good — the page must restart the cart. */
    public readonly expired = false
  ) {
    super(message)
    this.name = "CheckoutApiError"
  }
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${CHECKOUT_BASE}${path}`, {
      method: init.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: init.signal,
    })
  } catch {
    throw new CheckoutApiError(
      "We couldn't reach the payment service. Check your connection and try again.",
      0
    )
  }

  let json: Envelope<T> = {}
  try {
    json = (await res.json()) as Envelope<T>
  } catch {
    // A non-JSON body means a proxy or gateway error page, not our API.
  }

  if (!res.ok || json.success === false) {
    const detail =
      typeof json.error === "string" && !json.message ? json.error : json.message
    throw new CheckoutApiError(
      detail || `Something went wrong (${res.status}).`,
      res.status,
      res.status === 410
    )
  }

  return json.data as T
}

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Loads everything the checkout page needs in one call: the cart, the
 * merchant's published design, and the payment methods with per-method totals.
 *
 * `fetch` on the server would cache by default; the `cache: "no-store"` above
 * matters because a checkout is never stale-tolerant.
 */
export function fetchCheckout(token: string, signal?: AbortSignal) {
  return request<CheckoutBootstrap>(`/sessions/${encodeURIComponent(token)}`, { signal })
}

export function updateContact(token: string, contact: CheckoutContact) {
  return request<{ session: PublicCheckoutSession }>(
    `/sessions/${encodeURIComponent(token)}/contact`,
    { method: "PATCH", body: contact }
  )
}

export function updateAddress(
  token: string,
  body: {
    shippingAddress?: CheckoutAddress
    billingAddress?: CheckoutAddress
    billingSameAsShipping?: boolean
  }
) {
  return request<{ session: PublicCheckoutSession }>(
    `/sessions/${encodeURIComponent(token)}/address`,
    { method: "PATCH", body }
  )
}

// ─── Returning customers (§7) ─────────────────────────────────────────────────

/**
 * Asks whether we recognise this number.
 *
 * Returns the same "unknown" shape whether the number is genuinely unknown or
 * simply not verified yet — confirming that a number IS registered would itself
 * be a disclosure.
 */
export function recognize(token: string, phone: string) {
  return request<RecognitionResult>(
    `/sessions/${encodeURIComponent(token)}/recognize`,
    { method: "POST", body: { phone } }
  )
}

export function sendOtp(token: string) {
  return request<OtpSendResult>(`/sessions/${encodeURIComponent(token)}/otp/send`, {
    method: "POST",
  })
}

export function verifyOtp(token: string, code: string) {
  return request<OtpVerifyResult>(
    `/sessions/${encodeURIComponent(token)}/otp/verify`,
    { method: "POST", body: { code } }
  )
}

/**
 * Applies a discount code (§24).
 *
 * The server validates and returns a specific reason on failure — "this code
 * needs a ₹1,500 order" rather than "invalid code", which just makes shoppers
 * give up.
 */
export function applyCoupon(token: string, code: string) {
  return request<{ session: PublicCheckoutSession }>(
    `/sessions/${encodeURIComponent(token)}/coupon`,
    { method: "POST", body: { code } }
  )
}

export function removeCoupon(token: string) {
  return request<{ session: PublicCheckoutSession }>(
    `/sessions/${encodeURIComponent(token)}/coupon`,
    { method: "DELETE" }
  )
}

/**
 * Picks a delivery option.
 *
 * Re-quotes server-side rather than just swapping a price, because shipping is
 * taxable in India — a faster delivery changes the tax as well as the shipping
 * line.
 */
export function selectShippingRate(token: string, handle: string) {
  return request<{ session: PublicCheckoutSession }>(
    `/sessions/${encodeURIComponent(token)}/shipping-rate`,
    { method: "POST", body: { handle } }
  )
}

/** Selecting a method reprices — a prepaid discount changes the total (§24). */
export function selectMethod(token: string, method: PaymentMethodKey) {
  return request<{ session: PublicCheckoutSession }>(
    `/sessions/${encodeURIComponent(token)}/method`,
    { method: "POST", body: { method } }
  )
}

// ─── Payment ──────────────────────────────────────────────────────────────────

/**
 * Opens a payment at whichever gateway the merchant's routing picks.
 *
 * `idempotencyKey` is what makes a double-clicked pay button safe: the same key
 * returns the same gateway order rather than opening a second one. Generate it
 * once per intent and reuse it across retries of the same click.
 */
export function createAttempt(
  token: string,
  method: PaymentMethodKey,
  idempotencyKey: string
) {
  return request<CreateAttemptResult>(`/sessions/${encodeURIComponent(token)}/attempts`, {
    method: "POST",
    body: { method, idempotencyKey },
  })
}

/**
 * Reports what the gateway's component returned.
 *
 * This is an input to verification, never its conclusion — the server re-checks
 * with the gateway before anything is marked paid. A shopper editing this
 * payload gets a failed verification, not a free order.
 */
export function verifyAttempt(
  token: string,
  attemptRef: string,
  params: Record<string, unknown>
) {
  return request<VerifyAttemptResult>(
    `/sessions/${encodeURIComponent(token)}/attempts/${encodeURIComponent(attemptRef)}/verify`,
    { method: "POST", body: params }
  )
}

/** Polled by the success screen while the webhook and order sync land. */
export function fetchStatus(token: string, signal?: AbortSignal) {
  return request<CheckoutStatusResult>(
    `/sessions/${encodeURIComponent(token)}/status`,
    { signal }
  )
}

/** Generates a fresh idempotency key for one pay intent. */
export function newIdempotencyKey(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `pay_${random}`.slice(0, 100)
}
