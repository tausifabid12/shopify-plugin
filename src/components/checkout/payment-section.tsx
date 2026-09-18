"use client"

import { formatMoney } from "@/lib/checkout/money"
import type {
  CheckoutConfigPayload,
  PaymentMethodKey,
  PublicPaymentMethod,
} from "@/lib/checkout/types"

import { CkBadge, CkRadioRow } from "./primitives"

/**
 * Payment method selection (§10, §24).
 *
 * The shopper picks an instrument — UPI, Card, Net Banking — never a gateway.
 * Which gateway serves it is the merchant's routing decision and is resolved
 * server-side, so "Razorpay" and "PhonePe" appear nowhere on this screen. That
 * indirection is the product.
 *
 * Each row carries its own total, because a prepaid discount or a COD fee makes
 * the same cart cost different amounts by method. Showing the saving here —
 * before the choice — is what actually shifts shoppers to prepaid.
 */

const METHOD_ICONS: Record<PaymentMethodKey, React.ReactNode> = {
  upi: <UpiGlyph />,
  card: <CardGlyph />,
  netbanking: <BankGlyph />,
  wallet: <WalletGlyph />,
  cod: <CashGlyph />,
}

const DEFAULT_SUBTITLES: Record<PaymentMethodKey, string> = {
  upi: "Pay by any UPI app",
  card: "Visa, Mastercard, RuPay, Amex",
  netbanking: "All major banks",
  wallet: "Paytm, PhonePe, Amazon Pay and more",
  cod: "Pay when your order arrives",
}

export function PaymentSection({
  config,
  methods,
  selected,
  onSelect,
  currency,
  disabled,
}: {
  config: CheckoutConfigPayload
  methods: PublicPaymentMethod[]
  selected?: PaymentMethodKey
  onSelect: (method: PaymentMethodKey) => void
  currency: string
  disabled?: boolean
}) {
  if (methods.length === 0) {
    return (
      <p className="text-[13.5px]" style={{ color: "var(--ck-muted)" }}>
        No payment methods are available right now. Please contact the store.
      </p>
    )
  }

  // The cheapest option anchors the savings badges. Using the dearest as the
  // baseline would overstate the discount on every row.
  const cheapest = Math.min(...methods.map((m) => m.total))
  const dearest = Math.max(...methods.map((m) => m.total))
  const hasVariation = dearest > cheapest

  return (
    <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Payment method">
      {methods.map((method) => {
        const saving = dearest - method.total
        const custom = config.methodMessaging?.[method.method]

        return (
          <CkRadioRow
            key={method.method}
            selected={selected === method.method}
            onSelect={() => onSelect(method.method)}
            disabled={disabled}
            title={method.label}
            subtitle={custom || method.description || DEFAULT_SUBTITLES[method.method]}
            badge={
              hasVariation && saving > 0 ? (
                <CkBadge tone="success">Save {formatMoney(saving, currency)}</CkBadge>
              ) : undefined
            }
            trailing={
              <span className="flex items-center gap-3">
                {hasVariation && (
                  <span
                    className="text-[14px] font-semibold tabular-nums"
                    style={{ color: "var(--ck-text)" }}
                  >
                    {formatMoney(method.total, currency)}
                  </span>
                )}
                <span style={{ color: "var(--ck-muted)" }}>
                  {METHOD_ICONS[method.method]}
                </span>
              </span>
            }
          />
        )
      })}
    </div>
  )
}

// ─── Glyphs ───────────────────────────────────────────────────────────────────
// Inline so the checkout page ships no icon library — every kilobyte on a
// payment page is a conversion cost.

function UpiGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12l5-7 2.5 7L9 19 4 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M13 12l5-7 2 7-2 7-5-7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CardGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="5.5"
        width="19"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 14.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function BankGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 9.5L12 4l9 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 10.5v7M9.5 10.5v7M14.5 10.5v7M18.5 10.5v7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M3.5 19.5h17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function WalletGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="6.5"
        width="19"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M2.5 10.5h19" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="14.5" r="1.25" fill="currentColor" />
    </svg>
  )
}

function CashGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="7"
        width="19"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
