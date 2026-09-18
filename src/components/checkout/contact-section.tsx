"use client"

import * as React from "react"

import { displayPhone } from "@/lib/checkout/regions"
import { isFieldRequired, isFieldVisible } from "@/lib/checkout/theme"
import type { CheckoutConfigPayload, CheckoutContact } from "@/lib/checkout/types"

import { CkField, CkInput } from "./primitives"

/**
 * Contact details (§6, §7).
 *
 * Phone leads, because an Indian checkout is built around the number — it is
 * the order identifier, the delivery contact and the WhatsApp handle. Email is
 * optional by default for the same reason.
 *
 * Which fields appear, whether they are required, and their order all come from
 * the merchant's configuration. Nothing here is hard-coded.
 */

export interface ContactErrors {
  phone?: string
  email?: string
}

export function ContactSection({
  config,
  value,
  errors,
  onChange,
  onBlur,
  disabled,
}: {
  config: CheckoutConfigPayload
  value: CheckoutContact
  errors?: ContactErrors
  onChange: (patch: Partial<CheckoutContact>) => void
  onBlur?: () => void
  disabled?: boolean
}) {
  const fields = config.fields
  const showPhone = isFieldVisible(fields, "phone")
  const showEmail = isFieldVisible(fields, "email")

  // Held locally so the shopper sees exactly what they typed while typing;
  // normalisation to E.164 happens on blur, not on every keystroke.
  const [phoneDraft, setPhoneDraft] = React.useState(() => displayPhone(value.phone))

  // Re-seed only when the value changed elsewhere — typically the server
  // normalising "9876543210" to "+919876543210" on save — never while the
  // shopper is mid-edit. Adjusted during render rather than in an effect so the
  // reformatted number never paints twice.
  const [lastSynced, setLastSynced] = React.useState(value.phone)
  if (value.phone !== lastSynced) {
    setLastSynced(value.phone)
    setPhoneDraft(displayPhone(value.phone))
  }

  if (!showPhone && !showEmail) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {showPhone && (
        <CkField
          label={fieldLabel(config, "phone", "Mobile number")}
          required={isFieldRequired(fields, "phone")}
          error={errors?.phone}
          htmlFor="ck-phone"
          className={showEmail ? undefined : "sm:col-span-2"}
        >
          <CkInput
            id="ck-phone"
            name="tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={fieldPlaceholder(config, "phone", "+91 98765 43210")}
            value={phoneDraft}
            invalid={Boolean(errors?.phone)}
            disabled={disabled}
            onChange={(e) => {
              setPhoneDraft(e.target.value)
              onChange({ phone: e.target.value })
            }}
            onBlur={onBlur}
          />
        </CkField>
      )}

      {showEmail && (
        <CkField
          label={fieldLabel(config, "email", "Email")}
          required={isFieldRequired(fields, "email")}
          error={errors?.email}
          htmlFor="ck-email"
          className={showPhone ? undefined : "sm:col-span-2"}
        >
          <CkInput
            id="ck-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={fieldPlaceholder(config, "email", "you@example.com")}
            value={value.email ?? ""}
            invalid={Boolean(errors?.email)}
            disabled={disabled}
            onChange={(e) => onChange({ email: e.target.value })}
            onBlur={onBlur}
          />
        </CkField>
      )}
    </div>
  )
}

export function fieldLabel(
  config: CheckoutConfigPayload,
  key: string,
  fallback: string
): string {
  return config.fields.find((f) => f.key === key)?.label || fallback
}

export function fieldPlaceholder(
  config: CheckoutConfigPayload,
  key: string,
  fallback: string
): string {
  return config.fields.find((f) => f.key === key)?.placeholder || fallback
}
