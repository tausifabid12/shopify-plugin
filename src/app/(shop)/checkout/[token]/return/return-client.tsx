"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  CheckoutExpired,
  CheckoutFailure,
  CheckoutSuccess,
} from "@/components/checkout/checkout-result"
import { CkCard, CkSpinner } from "@/components/checkout/primitives"
import * as api from "@/lib/checkout/public-api"
import { CheckoutApiError } from "@/lib/checkout/public-api"
import { brandingToCssVars } from "@/lib/checkout/theme"
import type { CheckoutConfigPayload } from "@/lib/checkout/types"

/**
 * Landing page for gateway redirects.
 *
 * Reached when the shopper came back from a full-page redirect — PhonePe's
 * non-iframe flow, a UPI intent that bounced through a banking app, or any case
 * where the SDK could not stay in our tab.
 *
 * The URL says nothing trustworthy about the outcome. Gateways append their own
 * status parameters and shoppers can edit them, so all of that is ignored: we
 * ask our server, which asks the gateway (§31).
 */

const ORDER_WAIT_MS = 30_000
const POLL_INTERVAL_MS = 2_000

type Phase = "verifying" | "settling" | "paid" | "failed" | "expired"

export function ReturnClient({
  token,
  attemptRef,
  config,
}: {
  token: string
  attemptRef?: string
  config: CheckoutConfigPayload
}) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<Phase>("verifying")
  const [orderName, setOrderName] = React.useState<string>()
  const [amount, setAmount] = React.useState<number>()
  const [currency, setCurrency] = React.useState<string>()

  const themeVars = React.useMemo(
    () => brandingToCssVars(config.branding),
    [config.branding]
  )

  React.useEffect(() => {
    let cancelled = false

    async function resolveOutcome() {
      try {
        // Verify first when we know which attempt we came back from. Without a
        // reference we fall through to the status poll, which the webhook will
        // have settled anyway.
        if (attemptRef) {
          try {
            await api.verifyAttempt(token, attemptRef, {})
          } catch {
            // Verification can legitimately fail here — a shopper who abandoned
            // at the gateway comes back with nothing to verify. The status poll
            // below is the authority.
          }
        }

        const deadline = Date.now() + ORDER_WAIT_MS
        while (!cancelled && Date.now() < deadline) {
          const status = await api.fetchStatus(token)
          if (cancelled) return

          setAmount(status.total)
          setCurrency(status.currency)

          if (status.order?.status === "created") {
            setOrderName(status.order.name)
            setPhase("paid")
            return
          }
          if (status.paid) {
            setPhase("settling")
          } else if (
            status.status === "expired" ||
            status.status === "cancelled"
          ) {
            setPhase("expired")
            return
          } else if (status.status === "failed") {
            setPhase("failed")
            return
          }

          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        }

        if (cancelled) return

        // Timed out waiting. If the payment landed, say so — the order is
        // queued with retries behind it. If it never did, send them back to
        // try again rather than leaving them on a dead page.
        const final = await api.fetchStatus(token)
        setPhase(final.paid ? "paid" : "failed")
      } catch (err) {
        if (cancelled) return
        setPhase(err instanceof CheckoutApiError && err.expired ? "expired" : "failed")
      }
    }

    void resolveOutcome()
    return () => {
      cancelled = true
    }
  }, [token, attemptRef])

  if (phase === "verifying") {
    return (
      <div style={themeVars}>
        <Waiting label="Confirming your payment…" />
      </div>
    )
  }

  if (phase === "expired") {
    return (
      <div style={themeVars}>
        <CheckoutExpired config={config} />
      </div>
    )
  }

  if (phase === "failed") {
    return (
      <div style={themeVars}>
        <CheckoutFailure
          config={config}
          onRetry={() => router.replace(`/checkout/${encodeURIComponent(token)}`)}
        />
      </div>
    )
  }

  return (
    <div style={themeVars}>
      <CheckoutSuccess
        config={config}
        orderName={orderName}
        amount={amount}
        currency={currency}
        settling={phase === "settling"}
      />
    </div>
  )
}

function Waiting({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-svh w-full items-center justify-center px-4"
      style={{
        background: "var(--ck-bg)",
        color: "var(--ck-text)",
        fontFamily: "var(--ck-font)",
      }}
    >
      <CkCard padding="2.5rem" className="max-w-sm">
        <div className="flex flex-col items-center gap-4">
          <span style={{ color: "var(--ck-primary)" }}>
            <CkSpinner size={30} />
          </span>
          <p className="text-[15px] font-medium" style={{ color: "var(--ck-text)" }}>
            {label}
          </p>
          <p className="text-center text-[13px]" style={{ color: "var(--ck-muted)" }}>
            Please don&apos;t close this window.
          </p>
        </div>
      </CkCard>
    </div>
  )
}
