"use client"

import * as React from "react"

import { displayPhone } from "@/lib/checkout/regions"
import type { CheckoutAddress, RecognitionResult } from "@/lib/checkout/types"

import {
  CkAlert,
  CkBadge,
  CkGhostButton,
  CkInput,
  CkRadioRow,
  CkSpinner,
} from "./primitives"

/**
 * Returning-customer recognition (§7).
 *
 * Three states, depending on what the merchant switched on:
 *
 *  - **Recognised, no verification** — saved addresses offered straight away.
 *  - **Recognised, verification required** — a code goes to WhatsApp first, so
 *    someone who merely guesses a phone number can't read that person's address.
 *  - **Not recognised** — renders nothing at all. A "we don't know you" message
 *    would be noise, and confirming which numbers *are* registered would itself
 *    be a disclosure.
 */

export interface RecognitionState {
  result: RecognitionResult | null
  otpSent: boolean
  maskedPhone?: string
  busy: boolean
  error: string | null
}

export function RecognitionPanel({
  state,
  phone,
  onSendOtp,
  onVerifyOtp,
  onUseAddress,
  onDismiss,
  disabled,
}: {
  state: RecognitionState
  phone?: string
  onSendOtp: () => void
  onVerifyOtp: (code: string) => void
  onUseAddress: (address: CheckoutAddress) => void
  onDismiss: () => void
  disabled?: boolean
}) {
  const [code, setCode] = React.useState("")
  const result = state.result

  if (!result?.known) return null

  const greeting = result.firstName
    ? `Welcome back, ${result.firstName}`
    : "Welcome back"

  // ── Verification required ───────────────────────────────────────────────────

  if (result.requiresVerification) {
    return (
      <div
        className="flex flex-col gap-3 px-4 py-3.5"
        style={{
          background: "var(--ck-primary-wash)",
          border: "1px solid var(--ck-primary-edge)",
          borderRadius: "var(--ck-radius-sm)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[14px] font-semibold"
              style={{ color: "var(--ck-text)" }}
            >
              {greeting}
            </p>
            <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--ck-muted)" }}>
              {state.otpSent
                ? `Enter the code we sent to ${state.maskedPhone ?? displayPhone(phone)} on WhatsApp.`
                : "Verify your number to use your saved address."}
            </p>
          </div>
          <CkGhostButton onClick={onDismiss}>Skip</CkGhostButton>
        </div>

        {state.error && <CkAlert tone="error">{state.error}</CkAlert>}

        {state.otpSent ? (
          <div className="flex items-center gap-2">
            <CkInput
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // The checkout is one form — Enter here must not pay.
                  e.preventDefault()
                  if (code.length === 6) onVerifyOtp(code)
                }
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              maxLength={6}
              disabled={disabled || state.busy}
              aria-label="Verification code"
              className="tracking-[0.3em]"
            />
            <button
              type="button"
              onClick={() => onVerifyOtp(code)}
              disabled={disabled || state.busy || code.length !== 6}
              className="shrink-0 px-4 text-[13px] font-semibold outline-none disabled:opacity-50"
              style={{
                minHeight: "var(--ck-control-height, 2.75rem)",
                background: "var(--ck-button)",
                color: "var(--ck-button-text)",
                borderRadius: "var(--ck-radius-sm)",
              }}
            >
              {state.busy ? <CkSpinner size={14} /> : "Verify"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSendOtp}
            disabled={disabled || state.busy}
            className="self-start px-4 text-[13px] font-semibold outline-none disabled:opacity-50"
            style={{
              minHeight: "var(--ck-control-height, 2.75rem)",
              background: "var(--ck-button)",
              color: "var(--ck-button-text)",
              borderRadius: "var(--ck-radius-sm)",
            }}
          >
            {state.busy ? <CkSpinner size={14} /> : "Send code on WhatsApp"}
          </button>
        )}

        {state.otpSent && (
          <CkGhostButton onClick={onSendOtp}>Resend code</CkGhostButton>
        )}
      </div>
    )
  }

  // ── Recognised, addresses available ─────────────────────────────────────────

  if (result.addresses.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--ck-text)" }}>
          {greeting}
          {result.previousOrders ? (
            <CkBadge tone="success">
              {result.previousOrders} {result.previousOrders === 1 ? "order" : "orders"}
            </CkBadge>
          ) : null}
        </p>
        <CkGhostButton onClick={onDismiss}>Use a new address</CkGhostButton>
      </div>

      <div role="radiogroup" aria-label="Saved addresses" className="flex flex-col gap-2">
        {result.addresses.map((address, index) => (
          <CkRadioRow
            key={index}
            selected={false}
            onSelect={() => onUseAddress(address)}
            disabled={disabled}
            title={[address.address1, address.address2].filter(Boolean).join(", ")}
            subtitle={[address.city, address.province, address.zip]
              .filter(Boolean)
              .join(" · ")}
          />
        ))}
      </div>
    </div>
  )
}
