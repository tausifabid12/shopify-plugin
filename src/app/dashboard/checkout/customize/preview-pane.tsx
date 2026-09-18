"use client"

import * as React from "react"
import { Monitor, Smartphone, Tablet } from "lucide-react"

import { CheckoutFrame } from "@/components/checkout/checkout-frame"
import { brandingToCssVars } from "@/lib/checkout/theme"
import {
  SAMPLE_ADDRESS,
  SAMPLE_CONTACT,
  SAMPLE_METHODS,
  SAMPLE_SESSION,
} from "@/lib/checkout/sample-session"
import type { CheckoutConfigPayload } from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

/**
 * Live preview (§5, §26).
 *
 * Renders the *actual* `CheckoutFrame` a shopper gets, with the merchant's
 * in-progress draft applied — not a mock-up. That is the whole value: a preview
 * built from separate markup drifts from the real thing within a release or
 * two, and then quietly lies to merchants.
 *
 * The device frame is a real CSS width rather than a zoom transform, so the
 * checkout's own responsive breakpoints do the work and what the merchant sees
 * at "Mobile" is what a phone renders.
 */

type Device = "desktop" | "tablet" | "mobile"

const DEVICES: { key: Device; label: string; width: number; icon: typeof Monitor }[] = [
  { key: "desktop", label: "Desktop", width: 1280, icon: Monitor },
  { key: "tablet", label: "Tablet", width: 834, icon: Tablet },
  { key: "mobile", label: "Mobile", width: 390, icon: Smartphone },
]

export function PreviewPane({
  config,
  className,
}: {
  config: CheckoutConfigPayload
  className?: string
}) {
  const [device, setDevice] = React.useState<Device>("desktop")
  const spec = DEVICES.find((d) => d.key === device)!

  const themeVars = React.useMemo(
    () => brandingToCssVars(config.branding),
    [config.branding]
  )

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {/* Device switcher */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">Live preview</span>
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {DEVICES.map((d) => {
            const Icon = d.icon
            const active = d.key === device
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setDevice(d.key)}
                aria-pressed={active}
                title={d.label}
                className={cn(
                  "flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{d.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Viewport */}
      <div className="min-h-0 flex-1 overflow-auto bg-[#e9eaeb] p-4">
        <div
          className="mx-auto overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-[max-width] duration-200"
          style={{ maxWidth: spec.width }}
        >
          {/*
            `@container` would be ideal here, but the checkout uses viewport
            breakpoints. Constraining the wrapper width gets the layout right
            for desktop/tablet; the mobile frame is narrow enough that the
            stacked treatment shows regardless.
          */}
          <div style={themeVars}>
            <CheckoutFrame
              config={config}
              session={SAMPLE_SESSION}
              paymentMethods={SAMPLE_METHODS}
              contact={SAMPLE_CONTACT}
              address={SAMPLE_ADDRESS}
              onContactChange={noop}
              onAddressChange={noop}
              onSelectMethod={noop}
              onPay={noop}
              inert
              embedded
            />
          </div>
        </div>

        <p className="mx-auto mt-3 max-w-md text-center text-[11px] text-muted-foreground">
          Sample products and customer details. Your real checkout uses the
          shopper&apos;s cart.
        </p>
      </div>
    </div>
  )
}

function noop() {
  // The preview is deliberately inert — clicking a radio here should not
  // mutate anything, and there is no session behind it to mutate.
}
