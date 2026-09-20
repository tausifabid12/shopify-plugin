"use client"

import * as React from "react"

import { closePhonePeFrame, runGatewayFlow } from "@/lib/checkout/gateways"
import { isModalDisplay, postToStorefront } from "@/lib/checkout/modal-bridge"
import * as api from "@/lib/checkout/public-api"
import { CheckoutApiError } from "@/lib/checkout/public-api"
import {
  isValidEmail,
  isValidIndianPin,
  isValidPhone,
  normalizePhone,
} from "@/lib/checkout/regions"
import { brandingToCssVars, isFieldRequired, isFieldVisible } from "@/lib/checkout/theme"
import type {
  CheckoutAddress,
  CheckoutBootstrap,
  CheckoutContact,
  CheckoutFieldKey,
  PaymentMethodKey,
  PublicCheckoutSession,
} from "@/lib/checkout/types"

import type { AddressErrors } from "./address-section"
import { CheckoutFrame } from "./checkout-frame"
import type { RecognitionState } from "./recognition-panel"
import {
  CheckoutExpired,
  CheckoutFailure,
  CheckoutSuccess,
} from "./checkout-result"
import type { ContactErrors } from "./contact-section"

/**
 * The live checkout.
 *
 * Owns everything stateful: persistence, validation, the pay flow and the
 * post-payment wait. `CheckoutFrame` below it stays purely presentational so
 * the customiser can render the identical component tree.
 *
 * The page never decides a payment succeeded. It asks the server, which asks
 * the gateway (§31). Every branch below that looks like it concludes something
 * is really just deciding what to display while the server works it out.
 */

type Phase =
  | "form"
  | "paying" // gateway component is open
  | "verifying" // server is checking with the gateway
  | "settling" // paid; waiting for the Shopify order
  | "paid"
  | "failed"
  | "expired"

/** How long to wait for the Shopify order before showing success anyway. */
const ORDER_WAIT_MS = 25_000
const ORDER_POLL_INTERVAL_MS = 2_000

export function CheckoutShell({ initial }: { initial: CheckoutBootstrap }) {
  const [session, setSession] = React.useState<PublicCheckoutSession>(initial.session)
  const config = initial.config

  // Per-method totals are computed once at bootstrap from the cart and the
  // merchant's discount rules. Nothing a shopper does on this page changes the
  // cart, so they stay valid for the life of the session.
  const methods = initial.paymentMethods

  const [contact, setContact] = React.useState<CheckoutContact>(initial.session.contact)
  const [address, setAddress] = React.useState<CheckoutAddress>(
    initial.session.shippingAddress ?? { countryCode: "IN", country: "India" }
  )

  const [contactErrors, setContactErrors] = React.useState<ContactErrors>({})
  const [addressErrors, setAddressErrors] = React.useState<AddressErrors>({})
  const [error, setError] = React.useState<string | null>(null)
  /** A tax/shipping quote is in flight against Shopify. */
  const [quoting, setQuoting] = React.useState(false)

  const [recognition, setRecognition] = React.useState<RecognitionState>({
    result: null,
    otpSent: false,
    busy: false,
    error: null,
  })
  /** Set once the shopper picks a saved address or asks for a new one. */
  const [dismissedRecognition, setDismissedRecognition] = React.useState(false)

  const [phase, setPhase] = React.useState<Phase>(() =>
    initial.session.status === "paid"
      ? "paid"
      : initial.session.status === "expired" || initial.session.status === "cancelled"
        ? "expired"
        : "form"
  )
  const [orderName, setOrderName] = React.useState<string | undefined>()

  // One key per pay intent. Retrying the same click reuses it (so the server
  // returns the same gateway order); choosing a different method mints a new
  // one, because that is genuinely a different payment.
  const idempotencyKey = React.useRef<string>(api.newIdempotencyKey())

  const themeVars = React.useMemo(
    () => brandingToCssVars(config.branding),
    [config.branding]
  )

  // PhonePe's iframe outlives a React unmount, so close it explicitly.
  React.useEffect(() => () => closePhonePeFrame(), [])

  /**
   * Storefront modal integration.
   *
   * When framed, the parent keeps the overlay hidden until it hears `ready`,
   * so a failure to load shows as a fallback redirect rather than an empty
   * grey box. Height is reported so the modal can track the content as the
   * shopper moves through the steps.
   */
  const inModal = React.useMemo(() => isModalDisplay(), [])

  React.useEffect(() => {
    if (!inModal) return
    postToStorefront({ type: "pinggo:ready" })

    // ResizeObserver rather than polling: the checkout changes height on almost
    // every interaction (errors, delivery options, the gateway mounting).
    const observer = new ResizeObserver(() => {
      postToStorefront({
        type: "pinggo:height",
        height: document.documentElement.scrollHeight,
      })
    })
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  }, [inModal])

  // Tell the storefront to close and move the shopper on.
  React.useEffect(() => {
    if (!inModal || phase !== "paid") return
    postToStorefront({ type: "pinggo:done" })
  }, [inModal, phase])

  // ── Persistence ─────────────────────────────────────────────────────────────

  const persistContact = React.useCallback(async () => {
    const payload: CheckoutContact = {}
    if (contact.phone?.trim()) {
      const normalized = normalizePhone(contact.phone)
      if (isValidPhone(normalized)) payload.phone = normalized
    }
    if (contact.email?.trim() && isValidEmail(contact.email)) {
      payload.email = contact.email.trim().toLowerCase()
    }
    if (Object.keys(payload).length === 0) return

    try {
      const { session: updated } = await api.updateContact(session.token, payload)
      setSession(updated)
      setContact(updated.contact)
    } catch {
      // Saving as you type is a convenience. A failure here must not interrupt
      // the shopper — the same data is revalidated and resent before paying.
    }
  }, [contact.phone, contact.email, session.token])

  /**
   * Saves the address and picks up the tax/shipping quote that comes with it.
   *
   * The server quotes Shopify on every address save, so this is where delivery
   * options and tax actually appear. It is slower than the other autosaves —
   * hence the explicit `quoting` state rather than letting it look frozen.
   */
  const persistAddress = React.useCallback(async () => {
    if (!address.address1?.trim() || !address.zip?.trim()) return
    if (!address.provinceCode && !address.province) return

    setQuoting(true)
    try {
      const { session: updated } = await api.updateAddress(session.token, {
        shippingAddress: address,
        billingSameAsShipping: true,
      })
      setSession(updated)
    } catch {
      // Non-fatal: the same details are revalidated and re-quoted before
      // anything is charged.
    } finally {
      setQuoting(false)
    }
  }, [address, session.token])

  const handleSelectShippingRate = React.useCallback(
    async (handle: string) => {
      setQuoting(true)
      setError(null)
      // Optimistic, so the radio responds immediately; the re-quote follows and
      // is authoritative for both shipping and tax.
      setSession((s) => ({ ...s, selectedShippingRateHandle: handle }))
      try {
        const { session: updated } = await api.selectShippingRate(session.token, handle)
        setSession(updated)
      } catch (err) {
        if (err instanceof CheckoutApiError && err.expired) {
          setPhase("expired")
          return
        }
        setError(
          err instanceof Error ? err.message : "Could not select that delivery option."
        )
      } finally {
        setQuoting(false)
      }
    },
    [session.token]
  )

  // ── Method selection ────────────────────────────────────────────────────────

  const handleSelectMethod = React.useCallback(
    async (method: PaymentMethodKey) => {
      // Optimistic, so the radio responds instantly; the server's reprice
      // follows and is authoritative.
      setSession((s) => ({ ...s, selectedMethod: method }))
      setError(null)
      idempotencyKey.current = api.newIdempotencyKey()

      try {
        const { session: updated } = await api.selectMethod(session.token, method)
        setSession(updated)
      } catch (err) {
        if (err instanceof CheckoutApiError && err.expired) {
          setPhase("expired")
          return
        }
        setError(err instanceof Error ? err.message : "Could not select that method.")
      }
    },
    [session.token]
  )

  // ── Returning customers (§7) ────────────────────────────────────────────────

  /**
   * Probes recognition once the shopper has typed a usable number.
   *
   * Fires on blur rather than per keystroke: each call is a lookup, and probing
   * a half-typed number tells us nothing anyway.
   */
  const checkRecognition = React.useCallback(
    async (rawPhone?: string) => {
      if (!initial.config.recognition?.enabled) return
      if (dismissedRecognition) return

      const normalized = rawPhone ? normalizePhone(rawPhone) : ""
      if (!isValidPhone(normalized)) return

      try {
        const result = await api.recognize(session.token, normalized)
        setRecognition((s) => ({ ...s, result, error: null }))
      } catch {
        // Recognition is a convenience. If it fails the shopper simply types
        // their address, which they were going to do anyway.
      }
    },
    [initial.config.recognition?.enabled, dismissedRecognition, session.token]
  )

  const handleSendOtp = React.useCallback(async () => {
    setRecognition((s) => ({ ...s, busy: true, error: null }))
    try {
      const result = await api.sendOtp(session.token)
      setRecognition((s) => ({
        ...s,
        busy: false,
        otpSent: true,
        maskedPhone: result.maskedPhone,
      }))
    } catch (err) {
      setRecognition((s) => ({
        ...s,
        busy: false,
        error: err instanceof Error ? err.message : "Could not send the code.",
      }))
    }
  }, [session.token])

  const handleVerifyOtp = React.useCallback(
    async (code: string) => {
      setRecognition((s) => ({ ...s, busy: true, error: null }))
      try {
        const result = await api.verifyOtp(session.token, code)
        setRecognition((s) => ({
          ...s,
          busy: false,
          otpSent: false,
          error: null,
          result: {
            known: true,
            requiresVerification: false,
            firstName: result.firstName,
            addresses: result.addresses,
          },
        }))
      } catch (err) {
        setRecognition((s) => ({
          ...s,
          busy: false,
          error: err instanceof Error ? err.message : "That code isn't right.",
        }))
      }
    },
    [session.token]
  )

  /** One tap fills the whole address form and saves it straight away. */
  const handleUseSavedAddress = React.useCallback(
    (saved: CheckoutAddress) => {
      setAddress(saved)
      setAddressErrors({})
      setDismissedRecognition(true)

      setQuoting(true)
      void api
        .updateAddress(session.token, {
          shippingAddress: saved,
          billingSameAsShipping: true,
        })
        .then(({ session: updated }) => setSession(updated))
        .catch(() => undefined)
        .finally(() => setQuoting(false))
    },
    [session.token]
  )

  // ── Offers ──────────────────────────────────────────────────────────────────

  /**
   * Returns the server's reason on failure rather than throwing.
   *
   * The message is the point: "this code needs a ₹1,500 order" is actionable,
   * and the coupon field shows it inline instead of as a page-level error.
   */
  const handleApplyCoupon = React.useCallback(
    async (code: string): Promise<string | null> => {
      try {
        const { session: updated } = await api.applyCoupon(session.token, code)
        setSession(updated)
        return null
      } catch (err) {
        if (err instanceof CheckoutApiError && err.expired) {
          setPhase("expired")
          return null
        }
        return err instanceof Error ? err.message : "That code could not be applied."
      }
    },
    [session.token]
  )

  const handleRemoveCoupon = React.useCallback(async () => {
    try {
      const { session: updated } = await api.removeCoupon(session.token)
      setSession(updated)
    } catch {
      // Nothing to recover: the code either came off or it didn't, and the
      // next render shows the truth either way.
    }
  }, [session.token])

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = React.useCallback((): boolean => {
    const fields = config.fields
    const nextContact: ContactErrors = {}
    const nextAddress: AddressErrors = {}

    const phone = contact.phone ? normalizePhone(contact.phone) : ""
    if (isFieldVisible(fields, "phone")) {
      if (isFieldRequired(fields, "phone") && !phone) {
        nextContact.phone = "Enter your mobile number"
      } else if (phone && !isValidPhone(phone)) {
        nextContact.phone = "Enter a valid mobile number"
      }
    }

    if (isFieldVisible(fields, "email")) {
      const email = contact.email?.trim() ?? ""
      if (isFieldRequired(fields, "email") && !email) {
        nextContact.email = "Enter your email"
      } else if (email && !isValidEmail(email)) {
        nextContact.email = "Enter a valid email"
      }
    }

    const requiredAddress: CheckoutFieldKey[] = [
      "firstName",
      "lastName",
      "address1",
      "address2",
      "city",
      "province",
      "zip",
    ]
    for (const key of requiredAddress) {
      if (!isFieldVisible(fields, key) || !isFieldRequired(fields, key)) continue
      const value = (address as Record<string, string | undefined>)[key]
      if (!value?.trim()) {
        nextAddress[key as keyof CheckoutAddress] = "Required"
      }
    }

    if (
      isFieldVisible(fields, "zip") &&
      address.zip?.trim() &&
      !isValidIndianPin(address.zip)
    ) {
      nextAddress.zip = "Enter a valid 6-digit PIN code"
    }

    setContactErrors(nextContact)
    setAddressErrors(nextAddress)

    return (
      Object.keys(nextContact).length === 0 && Object.keys(nextAddress).length === 0
    )
  }, [config.fields, contact, address])

  // ── Post-payment wait ───────────────────────────────────────────────────────

  /**
   * Waits for the Shopify order after the payment is confirmed.
   *
   * Gives up after ORDER_WAIT_MS and shows success regardless — because by this
   * point the money IS taken and the order IS queued with retries behind it.
   * Holding a spinner in front of a paying customer while our backend catches
   * up would be the wrong trade.
   */
  const waitForOrder = React.useCallback(async () => {
    const deadline = Date.now() + ORDER_WAIT_MS

    while (Date.now() < deadline) {
      try {
        const status = await api.fetchStatus(session.token)
        if (status.order?.status === "created") {
          setOrderName(status.order.name)
          setPhase("paid")
          return
        }
        if (status.paid) setPhase("settling")
      } catch {
        // Keep polling; a blip here changes nothing about the payment.
      }
      await new Promise((resolve) => setTimeout(resolve, ORDER_POLL_INTERVAL_MS))
    }

    setPhase("paid")
  }, [session.token])

  // ── Pay ─────────────────────────────────────────────────────────────────────

  const handlePay = React.useCallback(async () => {
    setError(null)

    if (!session.selectedMethod) {
      setError("Choose a payment method.")
      return
    }
    if (!validate()) {
      setError("Please check the highlighted fields.")
      return
    }

    setPhase("paying")

    try {
      // Flush the latest details before charging — the shopper may have typed
      // into a field and pressed Pay without blurring it.
      await Promise.all([persistContact(), persistAddress()])

      const attempt = await api.createAttempt(
        session.token,
        session.selectedMethod,
        idempotencyKey.current
      )

      const outcome = await runGatewayFlow(attempt)

      if (outcome.kind === "redirecting") return // page is navigating away
      if (outcome.kind === "error") {
        setPhase("form")
        setError(outcome.message)
        return
      }
      if (outcome.kind === "dismissed") {
        /**
         * The shopper closed the gateway. That is NOT a failure: with UPI
         * collect they may have already approved it in their banking app. Ask
         * the server, which asks the gateway.
         */
        setPhase("verifying")
        const result = await api.verifyAttempt(session.token, attempt.attemptRef, {})
        if (result.status === "succeeded") {
          setPhase("settling")
          await waitForOrder()
        } else {
          setPhase("form")
          // A fresh key: the next press is a genuinely new payment.
          idempotencyKey.current = api.newIdempotencyKey()
          setError(
            result.status === "pending"
              ? "We haven't received your payment yet. If you completed it, give it a moment and refresh."
              : null
          )
        }
        return
      }

      setPhase("verifying")
      const result = await api.verifyAttempt(
        session.token,
        attempt.attemptRef,
        outcome.params
      )

      if (result.status === "succeeded") {
        setPhase("settling")
        await waitForOrder()
        return
      }

      idempotencyKey.current = api.newIdempotencyKey()
      if (result.status === "pending") {
        setPhase("settling")
        await waitForOrder()
        return
      }
      setPhase("failed")
    } catch (err) {
      if (err instanceof CheckoutApiError && err.expired) {
        setPhase("expired")
        return
      }
      idempotencyKey.current = api.newIdempotencyKey()
      setPhase("form")
      setError(
        err instanceof Error ? err.message : "The payment could not be started."
      )
    }
  }, [
    session.selectedMethod,
    session.token,
    validate,
    persistContact,
    persistAddress,
    waitForOrder,
  ])

  const retry = React.useCallback(() => {
    idempotencyKey.current = api.newIdempotencyKey()
    setError(null)
    setPhase("form")
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase === "expired") {
    return (
      <div style={themeVars}>
        <CheckoutExpired config={config} />
      </div>
    )
  }

  if (phase === "paid" || phase === "settling") {
    return (
      <div style={themeVars}>
        <CheckoutSuccess
          config={config}
          orderName={orderName}
          amount={session.totals.total}
          currency={session.currency}
          settling={phase === "settling"}
        />
      </div>
    )
  }

  if (phase === "failed") {
    return (
      <div style={themeVars}>
        <CheckoutFailure config={config} onRetry={retry} />
      </div>
    )
  }

  return (
    <div style={themeVars}>
      <CheckoutFrame
        config={config}
        session={session}
        paymentMethods={methods}
        contact={contact}
        address={address}
        contactErrors={contactErrors}
        addressErrors={addressErrors}
        onContactChange={(patch) => {
          setContact((c) => ({ ...c, ...patch }))
          setContactErrors({})
          setError(null)
        }}
        onContactBlur={() => {
          void persistContact()
          void checkRecognition(contact.phone)
        }}
        nudges={initial.nudges}
        recognition={
          dismissedRecognition || !initial.config.recognition?.enabled
            ? undefined
            : recognition
        }
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
        onUseSavedAddress={handleUseSavedAddress}
        onDismissRecognition={() => setDismissedRecognition(true)}
        onAddressChange={(patch) => {
          setAddress((a) => ({ ...a, ...patch }))
          setAddressErrors({})
          setError(null)
        }}
        onAddressBlur={persistAddress}
        onSelectMethod={handleSelectMethod}
        onSelectShippingRate={handleSelectShippingRate}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        onPay={handlePay}
        quoting={quoting}
        busy={phase === "paying" || phase === "verifying"}
        error={error}
        modal={inModal}
        onClose={() => postToStorefront({ type: "pinggo:close" })}
      />
    </div>
  )
}
