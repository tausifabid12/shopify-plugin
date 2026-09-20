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
 * The frame is laid out at the device's true CSS width, so the checkout's own
 * container queries do the work and "Mobile" really is what a phone renders.
 * It's then scaled down to fit the pane — scaling after layout, never instead
 * of it, which is the difference between a small desktop checkout and a
 * squashed one.
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

  // The frame renders at `spec.width` whatever the pane can spare, then shrinks
  // to fit. Both measurements have to be observed: the pane changes with the
  // window, and the frame's own height changes every time the merchant toggles
  // a row in the order summary.
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const frameRef = React.useRef<HTMLDivElement>(null)
  const [available, setAvailable] = React.useState(0)
  const [naturalHeight, setNaturalHeight] = React.useState(0)

  React.useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) =>
      setAvailable(entry.contentRect.width)
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    const node = frameRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) =>
      setNaturalHeight(entry.contentRect.height)
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Never scale up — a 390px phone frame blown up to fill a wide pane would be
  // a lie about text size.
  const scale = available > 0 ? Math.min(1, available / spec.width) : 1

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {/* Device switcher */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Live preview</span>
          {/* Says so when the frame isn't at 1:1, so nobody reads a shrunken
              preview as "my checkout text is tiny". */}
          {scale < 0.995 && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {Math.round(scale * 100)}%
            </span>
          )}
        </div>
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
      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-auto bg-[#ebebeb] px-6 py-5"
      >
        {/* Outer box occupies the *scaled* footprint, since a transform leaves
            layout untouched and would otherwise reserve the full 1280px. */}
        <div
          // Hidden until the first measurement lands, which is one frame. The
          // alternative is a visible flash of a 1280px frame overflowing a
          // 900px pane before the scale is known.
          className="mx-auto transition-opacity duration-150"
          style={{
            width: spec.width * scale,
            height: naturalHeight * scale,
            opacity: available > 0 && naturalHeight > 0 ? 1 : 0,
          }}
        >
          <div
            ref={frameRef}
            className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
            style={{
              width: spec.width,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
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
        </div>

        <p className="mx-auto mt-4 max-w-md text-center text-[11px] text-muted-foreground">
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
