"use client"

import * as React from "react"

import { formatMoney } from "@/lib/checkout/money"
import { content, layoutSpec } from "@/lib/checkout/theme"
import type {
  CheckoutAddress,
  CheckoutConfigPayload,
  CheckoutContact,
  OfferNudge,
  PaymentMethodKey,
  PublicCheckoutSession,
  PublicPaymentMethod,
} from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

import { AddressSection, type AddressErrors } from "./address-section"
import { ContactSection, type ContactErrors } from "./contact-section"
import { CouponField } from "./coupon-field"
import { OrderSummary } from "./order-summary"
import { PaymentSection } from "./payment-section"
import { RecognitionPanel, type RecognitionState } from "./recognition-panel"
import { ShippingSection } from "./shipping-section"
import {
  CkAlert,
  CkButton,
  CkCard,
  CkHeading,
  CkLockIcon,
} from "./primitives"

/**
 * The checkout, as a pure presentational component.
 *
 * It owns no data fetching and no side effects: everything arrives as props.
 * That is what lets `CheckoutShell` drive it with a live session and the
 * customiser's preview drive it with sample data — the merchant previews the
 * real component, not a mock-up that will drift from it.
 *
 * Layout, colours, copy, field visibility and summary rows all come from
 * `config`. Nothing below is hard-coded to one merchant's taste.
 */

export interface CheckoutFrameProps {
  config: CheckoutConfigPayload
  session: PublicCheckoutSession
  paymentMethods: PublicPaymentMethod[]

  contact: CheckoutContact
  address: CheckoutAddress
  contactErrors?: ContactErrors
  addressErrors?: AddressErrors

  onContactChange: (patch: Partial<CheckoutContact>) => void
  onContactBlur?: () => void
  onAddressChange: (patch: Partial<CheckoutAddress>) => void
  onAddressBlur?: () => void
  onSelectMethod: (method: PaymentMethodKey) => void
  onSelectShippingRate?: (handle: string) => void
  /** Resolves to an error message, or null on success. */
  onApplyCoupon?: (code: string) => Promise<string | null>
  onRemoveCoupon?: () => Promise<void>
  onPay: () => void

  /** Offers the cart nearly qualifies for (§24). */
  nudges?: OfferNudge[]
  /** Returning-customer state (§7). Omitted in the preview. */
  recognition?: RecognitionState
  onSendOtp?: () => void
  onVerifyOtp?: (code: string) => void
  onUseSavedAddress?: (address: CheckoutAddress) => void
  onDismissRecognition?: () => void

  /** A tax/shipping quote is in flight. */
  quoting?: boolean
  busy?: boolean
  /** Shown above the pay button. */
  error?: string | null
  /** Disables interaction wholesale — used by the customiser preview. */
  inert?: boolean
  /** Rendered inside the preview frame instead of the real viewport. */
  embedded?: boolean
}

export function CheckoutFrame({
  config,
  session,
  paymentMethods,
  contact,
  address,
  contactErrors,
  addressErrors,
  onContactChange,
  onContactBlur,
  onAddressChange,
  onAddressBlur,
  onSelectMethod,
  onSelectShippingRate,
  onApplyCoupon,
  onRemoveCoupon,
  onPay,
  nudges,
  recognition,
  onSendOtp,
  onVerifyOtp,
  onUseSavedAddress,
  onDismissRecognition,
  quoting,
  busy,
  error,
  inert,
  embedded,
}: CheckoutFrameProps) {
  const spec = layoutSpec(config.branding.layout)
  const copy = content(config)
  const selected = session.selectedMethod

  const payTotal =
    paymentMethods.find((m) => m.method === selected)?.total ?? session.totals.total

  const summary = (
    <OrderSummary
      session={session}
      config={config}
      className={spec.twoColumn ? "md:sticky md:top-8" : undefined}
    />
  )

  return (
    <div
      className={cn("w-full", embedded ? "min-h-full" : "min-h-svh")}
      style={{
        background: "var(--ck-bg)",
        color: "var(--ck-text)",
        fontFamily: "var(--ck-font)",
        ["--ck-control-height" as string]: spec.controlHeight,
      }}
    >
      <Header config={config} environment={session.environment} />

      <main
        className="mx-auto w-full px-4 pb-16 sm:px-6"
        style={{ maxWidth: spec.maxWidth }}
      >
        <PromoBanners config={config} nudges={nudges} currency={session.currency} />
        {/* On stacked layouts the summary can lead, so a shopper sees what
            they're buying before being asked for details. */}
        {!spec.twoColumn && spec.summaryFirst && (
          <div className="pt-4">
            <CkCard bordered={spec.bordered} padding={spec.cardPadding}>
              {summary}
            </CkCard>
          </div>
        )}

        <div
          className={cn(
            "pt-4",
            spec.twoColumn && "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-start"
          )}
          style={{ gap: spec.gap }}
        >
          {/* Form column */}
          <form
            className="flex min-w-0 flex-col"
            style={{ gap: spec.gap }}
            onSubmit={(e) => {
              e.preventDefault()
              if (!inert) onPay()
            }}
          >
            <CkCard bordered={spec.bordered} padding={spec.cardPadding}>
              <CkHeading show={spec.showSectionHeadings}>{copy.contactHeading}</CkHeading>
              <ContactSection
                config={config}
                value={contact}
                errors={contactErrors}
                onChange={onContactChange}
                onBlur={onContactBlur}
                disabled={inert || busy}
              />
            </CkCard>

            <CkCard bordered={spec.bordered} padding={spec.cardPadding}>
              <CkHeading show={spec.showSectionHeadings}>{copy.addressHeading}</CkHeading>

              {/* Sits above the fields so a returning shopper can skip them
                  entirely rather than discovering the shortcut after typing. */}
              {recognition && (
                <div className="mb-4">
                  <RecognitionPanel
                    state={recognition}
                    phone={contact.phone}
                    onSendOtp={() => onSendOtp?.()}
                    onVerifyOtp={(code) => onVerifyOtp?.(code)}
                    onUseAddress={(a) => onUseSavedAddress?.(a)}
                    onDismiss={() => onDismissRecognition?.()}
                    disabled={inert || busy}
                  />
                </div>
              )}

              <AddressSection
                config={config}
                value={address}
                errors={addressErrors}
                onChange={onAddressChange}
                onBlur={onAddressBlur}
                disabled={inert || busy}
              />
            </CkCard>

            {/* Delivery sits between address and payment: the shopper has to
                know what shipping costs before the pay button shows a total. */}
            <CkCard bordered={spec.bordered} padding={spec.cardPadding}>
              <CkHeading show={spec.showSectionHeadings}>Delivery</CkHeading>
              <ShippingSection
                session={session}
                onSelect={(handle) => onSelectShippingRate?.(handle)}
                busy={quoting}
                disabled={inert || busy}
              />
            </CkCard>

            <CkCard bordered={spec.bordered} padding={spec.cardPadding}>
              <CkHeading show={spec.showSectionHeadings}>{copy.paymentHeading}</CkHeading>
              <PaymentSection
                config={config}
                methods={paymentMethods}
                selected={selected}
                onSelect={onSelectMethod}
                currency={session.currency}
                disabled={inert || busy}
              />
            </CkCard>

            {/* Summary sits between the form and the pay button on stacked
                layouts that didn't lead with it — the shopper confirms the
                amount immediately before committing to it. */}
            {!spec.twoColumn && !spec.summaryFirst && (
              <CkCard bordered={spec.bordered} padding={spec.cardPadding}>
                {summary}
              </CkCard>
            )}

            <div className="flex flex-col gap-3">
              {onApplyCoupon && (
                <CouponField
                  session={session}
                  onApply={onApplyCoupon}
                  onRemove={onRemoveCoupon ?? (async () => {})}
                  disabled={inert || busy}
                />
              )}

              {error && <CkAlert tone="error">{error}</CkAlert>}

              {/* Blocked rather than allowed-then-failed: paying for an order
                  we cannot deliver would take money we then have to refund. */}
              <CkButton
                type="submit"
                loading={busy || quoting}
                disabled={inert || !selected || !session.shippingAvailable}
              >
                {copy.payButtonLabel} {formatMoney(payTotal, session.currency)}
              </CkButton>

              <TrustRow config={config} message={copy.trustMessage} />
            </div>
          </form>

          {/* Summary column */}
          {spec.twoColumn && (
            <aside className="mt-6 min-w-0 md:mt-0">
              <CkCard bordered={spec.bordered} padding={spec.cardPadding}>
                {summary}
              </CkCard>
            </aside>
          )}
        </div>

        {copy.footerNote && (
          <p
            className="mt-8 text-center text-[12px] leading-relaxed"
            style={{ color: "var(--ck-muted)" }}
          >
            {copy.footerNote}
          </p>
        )}
      </main>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({
  config,
  environment,
}: {
  config: CheckoutConfigPayload
  environment: string
}) {
  const { branding } = config

  return (
    <>
      {/*
        Test mode has to be unmissable. A merchant testing their checkout should
        never wonder which mode they are in, and a shopper should never see a
        test checkout without knowing (§27).
      */}
      {environment === "test" && (
        <div
          className="w-full px-4 py-2 text-center text-[12px] font-semibold tracking-wide"
          style={{ background: "#ffb800", color: "#3d2c00" }}
        >
          TEST MODE — no real payment will be taken
        </div>
      )}

      <header
        className="w-full"
        style={{ borderBottom: "1px solid var(--ck-border)", background: "var(--ck-surface)" }}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={branding.storeName || "Store"}
              className="h-8 w-auto max-w-45 object-contain"
            />
          ) : (
            <span
              className="text-[17px] font-semibold tracking-[-0.01em]"
              style={{ color: "var(--ck-text)" }}
            >
              {branding.storeName || "Checkout"}
            </span>
          )}
        </div>
      </header>
    </>
  )
}

// ─── Promotional banners (§24) ────────────────────────────────────────────────

/**
 * Merchant banners, plus the cart-specific nudges the offers engine produced.
 *
 * Nudges come first and are the more valuable of the two: "add ₹500 more for
 * free shipping" is actionable right now, where a static banner is the sort of
 * thing shoppers learn to scroll past.
 */
function PromoBanners({
  config,
  nudges,
  currency,
}: {
  config: CheckoutConfigPayload
  nudges?: OfferNudge[]
  currency: string
}) {
  const banners = config.banners ?? []
  if (banners.length === 0 && !nudges?.length) return null

  const tones = {
    info: { bg: "var(--ck-primary-wash)", fg: "var(--ck-text)" },
    success: { bg: "rgba(0,128,96,0.10)", fg: "#0a6b52" },
    warning: { bg: "rgba(255,184,0,0.16)", fg: "#8a6100" },
  }

  return (
    <div className="flex flex-col gap-2 pt-4">
      {nudges?.map((nudge, index) => (
        <div
          key={`nudge-${index}`}
          className="px-3.5 py-2.5 text-center text-[13px] font-medium"
          style={{
            background: tones.success.bg,
            color: tones.success.fg,
            borderRadius: "var(--ck-radius-sm)",
          }}
        >
          Add {formatMoney(nudge.shortfall, currency)} more — {nudge.message}
        </div>
      ))}

      {banners.map((banner, index) => (
        <div
          key={`banner-${index}`}
          className="px-3.5 py-2.5 text-center text-[13px]"
          style={{
            background: tones[banner.tone].bg,
            color: tones[banner.tone].fg,
            borderRadius: "var(--ck-radius-sm)",
          }}
        >
          {banner.text}
        </div>
      ))}
    </div>
  )
}

// ─── Trust ────────────────────────────────────────────────────────────────────

function TrustRow({
  config,
  message,
}: {
  config: CheckoutConfigPayload
  message: string
}) {
  const trust = config.trust
  if (!trust.showSecureBadge && trust.badges.length === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      {trust.showSecureBadge && (
        <span
          className="inline-flex items-center gap-1.5 text-[12px] font-medium"
          style={{ color: "var(--ck-muted)" }}
        >
          <CkLockIcon />
          {message}
        </span>
      )}
      {trust.badges.map((badge) => (
        <span
          key={badge.label}
          className="inline-flex items-center gap-1.5 text-[12px]"
          style={{ color: "var(--ck-muted)" }}
        >
          {badge.iconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={badge.iconUrl} alt="" className="h-4 w-auto" />
          )}
          {badge.label}
        </span>
      ))}
    </div>
  )
}
