"use client"

import * as React from "react"

import { formatMoney } from "@/lib/checkout/money"
import type { PublicCheckoutSession } from "@/lib/checkout/types"

import { CkInput, CkSpinner } from "./primitives"

/**
 * Discount code entry (§24).
 *
 * Kept quiet by default — an empty, prominent coupon box is one of the
 * best-documented ways to lose a sale, because it tells a shopper they are
 * paying more than someone else and sends them off to hunt for a code. It opens
 * only when asked, and collapses into a confirmation once a code applies.
 *
 * Automatic and prepaid discounts don't appear here at all; they're already in
 * the order summary. This field is only for codes the shopper has to type.
 */

export function CouponField({
  session,
  onApply,
  onRemove,
  disabled,
}: {
  session: PublicCheckoutSession
  onApply: (code: string) => Promise<string | null>
  onRemove: () => Promise<void>
  disabled?: boolean
}) {
  const applied = session.discounts.find((d) => d.source === "coupon")
  const [open, setOpen] = React.useState(false)
  const [code, setCode] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async () => {
    const trimmed = code.trim()
    if (!trimmed) return

    setBusy(true)
    setError(null)
    const message = await onApply(trimmed)
    setBusy(false)

    if (message) {
      setError(message)
      return
    }
    setCode("")
    setOpen(false)
  }

  const remove = async () => {
    setBusy(true)
    setError(null)
    await onRemove()
    setBusy(false)
  }

  if (applied) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-3 py-2.5"
        style={{
          background: "var(--ck-primary-wash)",
          border: "1px solid var(--ck-primary-edge)",
          borderRadius: "var(--ck-radius-sm)",
        }}
      >
        <span className="flex min-w-0 flex-col">
          <span
            className="truncate text-[13px] font-semibold"
            style={{ color: "var(--ck-text)" }}
          >
            {applied.code ?? applied.title}
          </span>
          <span className="text-[12px]" style={{ color: "var(--ck-muted)" }}>
            {formatMoney(applied.amount, session.currency)} off
          </span>
        </span>

        <button
          type="button"
          onClick={remove}
          disabled={disabled || busy}
          className="shrink-0 text-[12px] font-medium underline-offset-4 outline-none hover:underline disabled:opacity-50"
          style={{ color: "var(--ck-muted)" }}
        >
          {busy ? <CkSpinner size={13} /> : "Remove"}
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="self-start text-[13px] font-medium underline-offset-4 outline-none hover:underline disabled:opacity-50"
        style={{ color: "var(--ck-primary)" }}
      >
        Have a discount code?
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <CkInput
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // The checkout is one form; Enter here must not submit payment.
              e.preventDefault()
              void submit()
            }
          }}
          placeholder="Enter code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          invalid={Boolean(error)}
          disabled={disabled || busy}
          aria-label="Discount code"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || busy || !code.trim()}
          className="shrink-0 px-4 text-[13px] font-semibold outline-none disabled:opacity-50"
          style={{
            minHeight: "var(--ck-control-height, 2.75rem)",
            border: "1px solid var(--ck-border)",
            borderRadius: "var(--ck-radius-sm)",
            color: "var(--ck-text)",
          }}
        >
          {busy ? <CkSpinner size={14} /> : "Apply"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[12px] font-medium text-[#d72c0d]">
          {error}
        </p>
      )}
    </div>
  )
}
