"use client"

import * as React from "react"

import { formatMoney } from "@/lib/checkout/money"
import type {
  CheckoutConfigPayload,
  PublicCheckoutSession,
} from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

import { CkDivider } from "./primitives"

/**
 * The order summary (§23).
 *
 * Every row is individually switchable by the merchant, so this renders what
 * they configured rather than a fixed table. On narrow screens it can collapse
 * behind a disclosure, because on a phone a five-line cart pushes the pay
 * button below the fold — which is exactly where conversions go to die.
 */

export function OrderSummary({
  session,
  config,
  collapsible,
  className,
}: {
  session: PublicCheckoutSession
  config: CheckoutConfigPayload
  /** Forces the collapsed treatment regardless of viewport (used in preview). */
  collapsible?: boolean
  className?: string
}) {
  const opts = config.orderSummary
  const canCollapse = collapsible ?? opts.collapsedOnMobile
  const [open, setOpen] = React.useState(false)

  const { totals, currency } = session
  const itemCount = session.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className={cn("flex flex-col", className)}>
      {canCollapse && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between py-3 text-left outline-none md:hidden"
          >
            <span
              className="flex items-center gap-1.5 text-[14px] font-medium"
              style={{ color: "var(--ck-primary)" }}
            >
              {open ? "Hide" : "Show"} order summary
              <svg
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
                aria-hidden
                style={{ transform: open ? "rotate(180deg)" : undefined }}
                className="transition-transform"
              >
                <path
                  d="M1 1.5L6 6.5L11 1.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              className="text-[15px] font-semibold"
              style={{ color: "var(--ck-text)" }}
            >
              {formatMoney(totals.total, currency)}
            </span>
          </button>
          <div className="md:hidden">
            <CkDivider />
          </div>
        </>
      )}

      <div className={cn(canCollapse && !open && "hidden md:block")}>
        {config.content?.summaryHeading !== "" && (
          <h2
            className="mb-4 hidden text-[15px] font-semibold tracking-[-0.01em] md:block"
            style={{ color: "var(--ck-text)" }}
          >
            {config.content?.summaryHeading || "Order summary"}
            <span className="ml-2 font-normal" style={{ color: "var(--ck-muted)" }}>
              ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
          </h2>
        )}

        <ul className="flex flex-col gap-3.5 pt-3 md:pt-0">
          {session.items.map((item) => (
            <li key={item.variantGid} className="flex items-start gap-3">
              {opts.showProductImages && (
                <div
                  className="relative size-12 shrink-0 overflow-hidden"
                  style={{
                    borderRadius: "var(--ck-radius-sm)",
                    border: "1px solid var(--ck-border)",
                    background: "var(--ck-bg)",
                  }}
                >
                  {item.imageUrl ? (
                    // Plain <img>: product images come from arbitrary Shopify
                    // CDN hosts, which next/image would need configured per
                    // merchant domain.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  {opts.showQuantity && (
                    <span
                      className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{
                        background: "var(--ck-primary)",
                        color: "var(--ck-button-text)",
                      }}
                    >
                      {item.quantity}
                    </span>
                  )}
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className="truncate text-[13.5px] font-medium"
                  style={{ color: "var(--ck-text)" }}
                >
                  {item.title}
                </span>
                {item.variantTitle && (
                  <span className="truncate text-[12px]" style={{ color: "var(--ck-muted)" }}>
                    {item.variantTitle}
                  </span>
                )}
                {opts.showQuantity && !opts.showProductImages && (
                  <span className="text-[12px]" style={{ color: "var(--ck-muted)" }}>
                    Qty {item.quantity}
                  </span>
                )}
              </div>

              <span
                className="shrink-0 text-[13.5px] font-medium tabular-nums"
                style={{ color: "var(--ck-text)" }}
              >
                {formatMoney(item.lineTotal, currency)}
              </span>
            </li>
          ))}
        </ul>

        <div className="my-4">
          <CkDivider />
        </div>

        <dl className="flex flex-col gap-2.5">
          <SummaryRow label="Subtotal" value={formatMoney(totals.subtotal, currency)} />

          {opts.showDiscount && totals.discount > 0 && (
            <SummaryRow
              label={session.discounts[0]?.title || "Discount"}
              value={`− ${formatMoney(totals.discount, currency)}`}
              tone="positive"
            />
          )}

          {opts.showShipping && (
            <SummaryRow
              label="Shipping"
              value={
                totals.shipping > 0 ? formatMoney(totals.shipping, currency) : "Free"
              }
            />
          )}

          {opts.showTax && totals.tax > 0 && (
            <SummaryRow label="Tax" value={formatMoney(totals.tax, currency)} />
          )}

          {/* A COD handling fee, when the merchant charges one. */}
          {totals.paymentAdjustment > 0 && (
            <SummaryRow
              label="Handling fee"
              value={formatMoney(totals.paymentAdjustment, currency)}
            />
          )}
        </dl>

        {/* Tax-inclusive pricing (MRP) is the Indian norm, so the GST is stated
            rather than shown as a line that adds to the total. */}
        {opts.showTax && totals.tax === 0 && session.taxIncludedAmount > 0 && (
          <p className="mt-2 text-[11.5px]" style={{ color: "var(--ck-muted)" }}>
            Includes {formatMoney(session.taxIncludedAmount, currency)} GST
          </p>
        )}

        <div className="my-4">
          <CkDivider />
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-semibold" style={{ color: "var(--ck-text)" }}>
            Total
          </span>
          <span
            className="text-[20px] font-bold tabular-nums tracking-[-0.02em]"
            style={{ color: "var(--ck-text)" }}
          >
            {formatMoney(totals.total, currency)}
          </span>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "positive"
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[13.5px]" style={{ color: "var(--ck-muted)" }}>
        {label}
      </dt>
      <dd
        className="text-[13.5px] font-medium tabular-nums"
        style={{ color: tone === "positive" ? "#0a6b52" : "var(--ck-text)" }}
      >
        {value}
      </dd>
    </div>
  )
}
