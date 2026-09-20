/**
 * The checkout ↔ storefront bridge.
 *
 * When the checkout runs as a modal it lives in an iframe on the merchant's
 * storefront, a different origin. These messages are the only channel between
 * the two, so the protocol is deliberately tiny and every message is
 * origin-checked at both ends.
 *
 * Why an escape hatch exists: some payment flows cannot survive being framed.
 * Bank 3-D Secure pages and net-banking redirects routinely send
 * `X-Frame-Options: DENY`, and Razorpay's hosted checkout is explicitly
 * unsupported in an iframe. Rather than show a shopper a blank grey box at the
 * exact moment they are paying, the checkout asks the parent to promote it to a
 * full page and carries on there.
 */

export const MODAL_QUERY_FLAG = "display"
export const MODAL_QUERY_VALUE = "modal"

export type CheckoutToStorefront =
  /** The checkout has painted; the parent can reveal the iframe. */
  | { type: "pinggo:ready" }
  /** The shopper dismissed it. The parent removes the overlay. */
  | { type: "pinggo:close" }
  /** Keeps the iframe's height matched to its content. */
  | { type: "pinggo:height"; height: number }
  /**
   * Leave the frame and continue at top level — a payment flow that refuses
   * to be embedded.
   */
  | { type: "pinggo:breakout"; url: string }
  /** Paid. The parent closes and sends the shopper onward. */
  | { type: "pinggo:done"; url?: string }

/** True when this page is running inside the storefront modal. */
export function isModalDisplay(search?: string): boolean {
  const query = search ?? (typeof window === "undefined" ? "" : window.location.search)
  return new URLSearchParams(query).get(MODAL_QUERY_FLAG) === MODAL_QUERY_VALUE
}

/**
 * Sends a message to the storefront.
 *
 * Targeted with "*" rather than a specific origin: the checkout is framed by
 * whichever storefront opened it — myshopify.com for some merchants, a custom
 * domain for others — and it has no reliable way to know which. Nothing here
 * carries a secret; the payload is a status, never a token or an amount, so a
 * wildcard target discloses nothing. The parent does the origin check.
 */
export function postToStorefront(message: CheckoutToStorefront): void {
  if (typeof window === "undefined" || window.parent === window) return
  try {
    window.parent.postMessage(message, "*")
  } catch {
    // Frame is gone, or the browser blocked it. Nothing to recover.
  }
}
