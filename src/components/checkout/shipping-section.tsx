"use client"

import { formatMoney } from "@/lib/checkout/money"
import type { PublicCheckoutSession } from "@/lib/checkout/types"

import { CkAlert, CkRadioRow, CkSpinner } from "./primitives"

/**
 * Delivery options (§6).
 *
 * The rates come from Shopify, quoted against the shopper's address using the
 * merchant's own shipping zones — so what appears here is exactly what the
 * merchant configured, and exactly what the created order will carry.
 *
 * Three states matter and are all handled distinctly, because collapsing them
 * is how a shopper ends up stuck:
 *
 *  - **No address yet** — say so, don't show an empty box.
 *  - **Quoting** — a spinner, because this is a round-trip to Shopify.
 *  - **Not deliverable** — Shopify returned no rate for that destination. The
 *    shopper needs to know their address is the problem, not the page.
 */

export function ShippingSection({
  session,
  onSelect,
  busy,
  disabled,
}: {
  session: PublicCheckoutSession
  onSelect: (handle: string) => void
  /** A quote is in flight. */
  busy?: boolean
  disabled?: boolean
}) {
  const needsShipping = session.items.length > 0
  if (!needsShipping) return null

  const hasAddress = Boolean(session.shippingAddress?.zip)

  if (!hasAddress) {
    return (
      <p className="text-[13px]" style={{ color: "var(--ck-muted)" }}>
        Enter your delivery address to see shipping options.
      </p>
    )
  }

  if (busy && session.shippingRates.length === 0) {
    return (
      <span
        className="inline-flex items-center gap-2 text-[13px]"
        style={{ color: "var(--ck-muted)" }}
      >
        <CkSpinner size={14} />
        Checking delivery options…
      </span>
    )
  }

  if (!session.shippingAvailable) {
    return (
      <CkAlert tone="error">
        We don&apos;t deliver to this address yet. Try a different PIN code, or
        contact the store.
      </CkAlert>
    )
  }

  if (session.shippingRates.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: "var(--ck-muted)" }}>
        Shipping will be confirmed once your address is complete.
      </p>
    )
  }

  return (
    <div
      className="flex flex-col gap-2.5"
      role="radiogroup"
      aria-label="Delivery option"
      aria-busy={busy || undefined}
    >
      {session.shippingRates.map((rate) => (
        <CkRadioRow
          key={rate.handle}
          selected={session.selectedShippingRateHandle === rate.handle}
          onSelect={() => onSelect(rate.handle)}
          disabled={disabled || busy}
          title={rate.title}
          trailing={
            <span
              className="text-[14px] font-semibold tabular-nums"
              style={{ color: "var(--ck-text)" }}
            >
              {rate.price === 0 ? "Free" : formatMoney(rate.price, session.currency)}
            </span>
          }
        />
      ))}
    </div>
  )
}
