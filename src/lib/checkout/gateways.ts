import {
  loadScript,
  PHONEPE_CHECKOUT_JS,
  RAZORPAY_CHECKOUT_JS,
} from "./load-script"
import type { CreateAttemptResult } from "./types"

/**
 * Mounting a gateway's own payment component.
 *
 * The hard rule here: this module NEVER decides whether a payment succeeded.
 * Every path — success callback, dismissal, error, timeout — resolves with an
 * outcome the caller then takes to the server for verification. A gateway
 * callback saying "paid" is a hint to go and check, nothing more (§31).
 *
 * That is also why `dismissed` is not treated as failure. A shopper who closes
 * a UPI modal may well have already paid in their banking app; only the server
 * knows.
 */

export type GatewayOutcome =
  | { kind: "returned"; params: Record<string, unknown> }
  | { kind: "dismissed" }
  | { kind: "redirecting" }
  | { kind: "error"; message: string }

interface RazorpayInstance {
  open(): void
  close?(): void
  on?(event: string, handler: (payload: unknown) => void): void
}

interface RazorpayGlobal {
  new (options: Record<string, unknown>): RazorpayInstance
}

interface PhonePeGlobal {
  transact(options: {
    tokenUrl: string
    callback?: (response: string) => void
    type?: "IFRAME" | "REDIRECT"
  }): void
  closePage?(): void
}

declare global {
  interface Window {
    Razorpay?: RazorpayGlobal
    PhonePeCheckout?: PhonePeGlobal
  }
}

// ─── Razorpay ─────────────────────────────────────────────────────────────────

/**
 * Opens Razorpay Checkout.js as a modal over our page.
 *
 * `handler` fires on success with the three fields the server needs to verify
 * the signature; `modal.ondismiss` fires when the shopper closes it. Exactly one
 * of them runs, so the promise is guarded against a double settle.
 */
async function openRazorpay(attempt: CreateAttemptResult): Promise<GatewayOutcome> {
  await loadScript(RAZORPAY_CHECKOUT_JS)

  const Razorpay = window.Razorpay
  if (!Razorpay) {
    return { kind: "error", message: "The payment gateway is unavailable." }
  }

  const payload = attempt.clientPayload as {
    key?: string
    orderId?: string
    amount?: number
    currency?: string
    name?: string
    prefill?: Record<string, string>
    notes?: Record<string, string>
    config?: Record<string, unknown>
  }

  return new Promise<GatewayOutcome>((resolve) => {
    let settled = false
    const settle = (outcome: GatewayOutcome) => {
      if (settled) return
      settled = true
      resolve(outcome)
    }

    let instance: RazorpayInstance
    try {
      instance = new Razorpay({
        key: payload.key,
        order_id: payload.orderId,
        amount: payload.amount,
        currency: payload.currency,
        name: payload.name,
        prefill: payload.prefill,
        notes: payload.notes,
        ...(payload.config ? { config: payload.config } : {}),
        // Razorpay's own retry UI would create a second payment against the
        // same order behind our back. Retries belong to us: a new attempt with
        // a new reference, so the ledger stays one-attempt-one-order.
        retry: { enabled: false },
        handler: (response: Record<string, unknown>) => {
          settle({ kind: "returned", params: response })
        },
        modal: {
          escape: true,
          ondismiss: () => settle({ kind: "dismissed" }),
        },
      })
    } catch (err) {
      settle({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not open the payment window.",
      })
      return
    }

    // Razorpay reports a declined payment through this event rather than
    // `handler`. We still send it on for verification instead of concluding
    // failure here.
    instance.on?.("payment.failed", (payload_: unknown) => {
      const detail = payload_ as { error?: Record<string, unknown> } | undefined
      settle({
        kind: "returned",
        params: { razorpay_failed: true, error: detail?.error ?? null },
      })
    })

    try {
      instance.open()
    } catch {
      settle({ kind: "error", message: "Could not open the payment window." })
    }
  })
}

// ─── PhonePe ──────────────────────────────────────────────────────────────────

/**
 * Renders PhonePe's Standard Checkout inside our page as an iframe.
 *
 * PhonePe signs nothing on the browser side and its callback carries only
 * "CONCLUDED" or "USER_CANCEL" — no payment id, no status. Both are treated the
 * same way: close the frame and ask our server, which asks PhonePe.
 */
async function openPhonePe(attempt: CreateAttemptResult): Promise<GatewayOutcome> {
  const payload = attempt.clientPayload as { tokenUrl?: string }
  const tokenUrl = payload.tokenUrl || attempt.redirectUrl
  if (!tokenUrl) {
    return { kind: "error", message: "The payment session could not be opened." }
  }

  try {
    await loadScript(PHONEPE_CHECKOUT_JS)
  } catch {
    // The SDK is blocked or unreachable — a full-page redirect still works and
    // is better than stranding the shopper.
    window.location.assign(tokenUrl)
    return { kind: "redirecting" }
  }

  const PhonePeCheckout = window.PhonePeCheckout
  if (!PhonePeCheckout?.transact) {
    window.location.assign(tokenUrl)
    return { kind: "redirecting" }
  }

  return new Promise<GatewayOutcome>((resolve) => {
    let settled = false
    const settle = (outcome: GatewayOutcome) => {
      if (settled) return
      settled = true
      resolve(outcome)
    }

    try {
      PhonePeCheckout.transact({
        tokenUrl,
        type: "IFRAME",
        callback: (response: string) => {
          if (response === "USER_CANCEL") {
            settle({ kind: "dismissed" })
            return
          }
          // "CONCLUDED" means the page closed, not that money moved.
          settle({ kind: "returned", params: { phonepe_response: response } })
        },
      })
    } catch {
      window.location.assign(tokenUrl)
      settle({ kind: "redirecting" })
    }
  })
}

/** Closes PhonePe's iframe if one is open — used when navigating away. */
export function closePhonePeFrame(): void {
  try {
    window.PhonePeCheckout?.closePage?.()
  } catch {
    // Nothing open, or the SDK never loaded.
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

/**
 * Hands control to whichever gateway the server routed this attempt to.
 *
 * The page does not know or care which one that is — it renders the merchant's
 * checkout, and this mounts the gateway's component inside it.
 */
export async function runGatewayFlow(
  attempt: CreateAttemptResult
): Promise<GatewayOutcome> {
  try {
    if (attempt.flow === "redirect") {
      if (!attempt.redirectUrl) {
        return { kind: "error", message: "The gateway did not provide a payment page." }
      }
      window.location.assign(attempt.redirectUrl)
      return { kind: "redirecting" }
    }

    switch (attempt.provider) {
      case "razorpay":
        return await openRazorpay(attempt)
      case "phonepe":
        return await openPhonePe(attempt)
      default:
        return { kind: "error", message: "This payment method is not supported." }
    }
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "The payment could not be started.",
    }
  }
}
