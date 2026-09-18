"use client"

import { formatMoney } from "@/lib/checkout/money"
import { content } from "@/lib/checkout/theme"
import type { CheckoutConfigPayload } from "@/lib/checkout/types"

import { CkButton, CkCard, CkSpinner } from "./primitives"

/**
 * Terminal screens: paid, still settling, or failed.
 *
 * The "settling" state matters more than it looks. A shopper can land here
 * while the gateway webhook and the Shopify order creation are still in flight,
 * and the honest thing to show is "we have your payment, finishing up" — not a
 * success we cannot yet stand behind, and certainly not a failure.
 */

export function CheckoutSuccess({
  config,
  orderName,
  amount,
  currency,
  settling,
}: {
  config: CheckoutConfigPayload
  orderName?: string
  amount?: number
  currency?: string
  /** Payment confirmed, Shopify order not yet created. */
  settling?: boolean
}) {
  const copy = content(config)

  return (
    <ResultShell>
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: "rgba(0,128,96,0.12)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="#008060"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1
        className="text-[22px] font-semibold tracking-[-0.02em]"
        style={{ color: "var(--ck-text)" }}
      >
        Payment successful
      </h1>

      <p
        className="max-w-sm text-center text-[14px] leading-relaxed"
        style={{ color: "var(--ck-muted)" }}
      >
        {copy.successMessage}
      </p>

      {amount !== undefined && (
        <p
          className="text-[18px] font-bold tabular-nums"
          style={{ color: "var(--ck-text)" }}
        >
          {formatMoney(amount, currency || "INR")}
        </p>
      )}

      {orderName ? (
        <p className="text-[13px]" style={{ color: "var(--ck-muted)" }}>
          Order <span className="font-semibold">{orderName}</span>
        </p>
      ) : settling ? (
        <span
          className="inline-flex items-center gap-2 text-[13px]"
          style={{ color: "var(--ck-muted)" }}
        >
          <CkSpinner size={14} />
          Confirming your order…
        </span>
      ) : null}
    </ResultShell>
  )
}

export function CheckoutFailure({
  config,
  reason,
  onRetry,
}: {
  config: CheckoutConfigPayload
  reason?: string
  onRetry?: () => void
}) {
  const copy = content(config)

  return (
    <ResultShell>
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: "rgba(215,44,13,0.10)" }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 7l10 10M17 7L7 17"
            stroke="#d72c0d"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h1
        className="text-[22px] font-semibold tracking-[-0.02em]"
        style={{ color: "var(--ck-text)" }}
      >
        Payment not completed
      </h1>

      <p
        className="max-w-sm text-center text-[14px] leading-relaxed"
        style={{ color: "var(--ck-muted)" }}
      >
        {reason || copy.failureMessage}
      </p>

      {onRetry && (
        <div className="w-full max-w-xs pt-2">
          <CkButton onClick={onRetry}>Try another payment method</CkButton>
        </div>
      )}
    </ResultShell>
  )
}

export function CheckoutExpired({ config }: { config?: CheckoutConfigPayload }) {
  return (
    <ResultShell>
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: "rgba(255,184,0,0.16)" }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8.5" stroke="#8a6100" strokeWidth="2" />
          <path
            d="M12 7.5V12l3 2"
            stroke="#8a6100"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1
        className="text-[22px] font-semibold tracking-[-0.02em]"
        style={{ color: "var(--ck-text)" }}
      >
        This checkout has expired
      </h1>

      <p
        className="max-w-sm text-center text-[14px] leading-relaxed"
        style={{ color: "var(--ck-muted)" }}
      >
        {config?.content?.failureMessage ||
          "Your basket is still saved. Head back to the store and check out again."}
      </p>
    </ResultShell>
  )
}

function ResultShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-svh w-full items-center justify-center px-4 py-12"
      style={{
        background: "var(--ck-bg)",
        color: "var(--ck-text)",
        fontFamily: "var(--ck-font)",
      }}
    >
      <CkCard padding="2.5rem" className="max-w-md">
        <div className="flex flex-col items-center gap-4">{children}</div>
      </CkCard>
    </div>
  )
}
