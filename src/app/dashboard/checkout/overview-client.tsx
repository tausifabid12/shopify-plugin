"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  CircleCheck,
  CircleDashed,
  Loader2,
  Palette,
  TriangleAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { PAYMENT_METHOD_LABELS } from "@/lib/checkout/types"
import type { CheckoutOverview } from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

import { setCheckoutEnabledAction, setEnvironmentAction } from "./actions"

/**
 * Checkout overview — the merchant's control panel for the storefront takeover.
 *
 * Two switches here change what real shoppers experience, so both are treated
 * as consequential: turning the checkout on is gated behind having published a
 * design, and going live is gated behind an explicit acknowledgement (§27).
 */

export function OverviewClient({ initial }: { initial: CheckoutOverview }) {
  const [overview, setOverview] = React.useState(initial)
  const [busy, setBusy] = React.useState<null | "enable" | "environment">(null)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmLive, setConfirmLive] = React.useState(false)

  const liveGatewayReady = overview.credentials.some(
    (c) => c.environment === "live" && c.enabled
  )

  const toggleCheckout = async (enabled: boolean) => {
    setBusy("enable")
    setError(null)
    const result = await setCheckoutEnabledAction(enabled)
    setBusy(null)
    if (result.ok) {
      setOverview((o) => ({ ...o, checkoutEnabled: result.data.enabled }))
    } else {
      setError(result.error)
    }
  }

  const switchEnvironment = async (toLive: boolean) => {
    if (toLive && !confirmLive) {
      setConfirmLive(true)
      return
    }
    setBusy("environment")
    setError(null)
    const result = await setEnvironmentAction(toLive ? "live" : "test", true)
    setBusy(null)
    setConfirmLive(false)
    if (result.ok) {
      setOverview((o) => ({ ...o, environment: result.data.environment }))
    } else {
      setError(result.error)
    }
  }

  const enabledRoutes = overview.routing.filter((r) => r.enabled)

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/*
        Money taken but no Shopify order — the one state that needs a person.
        It sits above everything else for that reason.
      */}
      {overview.alerts.stuckOrders > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {overview.alerts.stuckOrders} paid{" "}
              {overview.alerts.stuckOrders === 1 ? "order" : "orders"} could not be
              created in Shopify
            </p>
            <p className="mt-0.5 text-[13px]">
              The payments went through. Open the order, fix what Shopify
              rejected, and retry it.
            </p>
          </div>
        </div>
      )}

      {/* Storefront takeover */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              Checkout on your storefront
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {overview.checkoutEnabled
                ? "Shoppers who click Buy now go to your custom checkout."
                : "Shoppers still use Shopify's default checkout."}
            </p>
            {!overview.hasPublishedConfig && (
              <p className="mt-2 text-[12px] font-medium text-amber-700">
                Publish a checkout design before turning this on.
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {busy === "enable" && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={overview.checkoutEnabled}
              disabled={busy !== null || !overview.hasPublishedConfig}
              onCheckedChange={toggleCheckout}
            />
          </div>
        </div>
      </Card>

      {/* Test / live */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Payment mode</h2>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  overview.environment === "live"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-100 text-amber-900"
                )}
              >
                {overview.environment === "live" ? "LIVE" : "TEST"}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {overview.environment === "live"
                ? "Real payments are being taken from customers."
                : "Payments use your gateway's sandbox. No money moves."}
            </p>
          </div>

          <Button
            variant={overview.environment === "live" ? "outline" : "default"}
            size="sm"
            disabled={
              busy !== null || (overview.environment !== "live" && !liveGatewayReady)
            }
            onClick={() => switchEnvironment(overview.environment !== "live")}
          >
            {busy === "environment" && <Loader2 className="animate-spin" />}
            {overview.environment === "live" ? "Switch to test" : "Go live"}
          </Button>
        </div>

        {overview.environment !== "live" && !liveGatewayReady && (
          <p className="mt-3 text-[12px] text-muted-foreground">
            Connect and enable a gateway in live mode before going live.
          </p>
        )}

        {confirmLive && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3.5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-amber-900">
              <TriangleAlert className="size-4" />
              Live payment mode
            </p>
            <p className="mt-1.5 text-[13px] text-amber-900">
              Payments will now charge real customers, and orders will be created
              in your Shopify store for real money.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmLive(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => switchEnvironment(true)}>
                Enable live mode
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Design */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Checkout design</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {overview.hasPublishedConfig
                ? `Published — version ${overview.configVersion}.`
                : "Not published yet."}
            </p>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/dashboard/checkout/customize" />}>
            <Palette />
            Customize
            <ArrowRight />
          </Button>
        </div>
      </Card>

      {/* Gateways */}
      <Card>
        <h2 className="text-sm font-semibold text-foreground">Payment gateways</h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {overview.providers.map((provider) => {
            const credential = overview.credentials.find(
              (c) => c.provider === provider.key && c.environment === overview.environment
            )
            const connected = Boolean(credential?.connected && credential.enabled)

            return (
              <div
                key={provider.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    {provider.label}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    {connected ? (
                      <>
                        <CircleCheck className="size-3.5 text-emerald-600" />
                        Connected
                      </>
                    ) : (
                      <>
                        <CircleDashed className="size-3.5" />
                        Not connected
                      </>
                    )}
                  </p>
                </div>
                {credential?.verificationError && (
                  <span title={credential.verificationError}>
                    <TriangleAlert className="size-4 shrink-0 text-amber-600" />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Routing */}
      <Card>
        <h2 className="text-sm font-semibold text-foreground">Payment routing</h2>
        {enabledRoutes.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            No payment methods enabled yet — shoppers won&apos;t be able to pay.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {enabledRoutes.map((rule) => (
              <li
                key={rule.method}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <span className="font-medium text-foreground">
                  {PAYMENT_METHOD_LABELS[rule.method]}
                </span>
                <span className="text-muted-foreground">
                  {rule.primaryProvider ?? "—"}
                  {rule.fallbackProvider && (
                    <span className="text-muted-foreground/70">
                      {" "}
                      → {rule.fallbackProvider}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-white px-5 py-4 shadow-sm">
      {children}
    </section>
  )
}
