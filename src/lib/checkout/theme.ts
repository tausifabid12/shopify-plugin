import type { CSSProperties } from "react"
import type {
  CheckoutBranding,
  CheckoutConfigPayload,
  CheckoutFieldConfig,
  CheckoutFieldKey,
  CheckoutLayout,
} from "./types"

/**
 * Turns a merchant's saved design into something renderable.
 *
 * The checkout is styled entirely through CSS custom properties rather than
 * Tailwind colour classes, because the palette is per-merchant and only known
 * at runtime. Components reference `var(--ck-*)`; this file is the only thing
 * that decides what those resolve to.
 *
 * That also makes the customiser's live preview honest: it renders the same
 * components with a different variable set, so what a merchant previews is
 * literally what a shopper gets, not an approximation of it.
 */

/** CSS variables for one branding config, applied to the checkout root. */
export function brandingToCssVars(branding: CheckoutBranding): CSSProperties {
  const radius = Math.max(0, Math.min(branding.borderRadius ?? 8, 32))

  return {
    "--ck-primary": branding.primaryColor,
    "--ck-secondary": branding.secondaryColor,
    "--ck-button": branding.buttonColor,
    "--ck-button-text": branding.buttonTextColor,
    "--ck-bg": branding.backgroundColor,
    "--ck-surface": branding.surfaceColor,
    "--ck-text": branding.textColor,
    "--ck-muted": branding.mutedTextColor,
    "--ck-border": branding.borderColor,
    "--ck-font": fontStack(branding.fontFamily),
    "--ck-radius": `${radius}px`,
    // Derived: inputs and small chips read better a touch tighter than cards.
    "--ck-radius-sm": `${Math.max(0, Math.round(radius * 0.65))}px`,
    // A translucent wash of the brand colour, for selected states. Works on
    // both light and dark surfaces without needing a second configured colour.
    "--ck-primary-wash": `color-mix(in srgb, ${branding.primaryColor} 8%, transparent)`,
    "--ck-primary-edge": `color-mix(in srgb, ${branding.primaryColor} 45%, transparent)`,
    "--ck-focus-ring": `color-mix(in srgb, ${branding.primaryColor} 30%, transparent)`,
  } as CSSProperties
}

/** Wraps the merchant's font choice in a stack that degrades sensibly. */
function fontStack(family?: string): string {
  const fallback =
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  if (!family || family === "system-ui") return fallback
  const quoted = /\s/.test(family) && !family.includes('"') ? `"${family}"` : family
  return `${quoted}, ${fallback}`
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export interface LayoutSpec {
  /** Summary beside the form, or stacked with it. */
  twoColumn: boolean
  /** On a stacked layout, whether the summary comes first. */
  summaryFirst: boolean
  /** Vertical rhythm between sections. */
  gap: string
  /** Padding inside each card. */
  cardPadding: string
  /** Cards get a visible edge, or sit flat on the background. */
  bordered: boolean
  /** Section headings are shown. */
  showSectionHeadings: boolean
  /** Control height — bigger targets for thumb-driven layouts. */
  controlHeight: string
  maxWidth: string
}

const LAYOUTS: Record<CheckoutLayout, LayoutSpec> = {
  two_column: {
    twoColumn: true,
    summaryFirst: false,
    gap: "1.5rem",
    cardPadding: "1.5rem",
    bordered: true,
    showSectionHeadings: true,
    controlHeight: "2.75rem",
    maxWidth: "64rem",
  },
  single_column: {
    twoColumn: false,
    summaryFirst: true,
    gap: "1.25rem",
    cardPadding: "1.25rem",
    bordered: true,
    showSectionHeadings: true,
    controlHeight: "2.75rem",
    maxWidth: "36rem",
  },
  compact: {
    twoColumn: true,
    summaryFirst: false,
    gap: "0.875rem",
    cardPadding: "1rem",
    bordered: true,
    showSectionHeadings: true,
    controlHeight: "2.5rem",
    maxWidth: "60rem",
  },
  mobile_first: {
    twoColumn: false,
    summaryFirst: false,
    gap: "1rem",
    cardPadding: "1.125rem",
    bordered: false,
    showSectionHeadings: true,
    // Deliberately taller: this layout exists for thumbs, and 48px is the
    // smallest target that reliably works one-handed.
    controlHeight: "3rem",
    maxWidth: "32rem",
  },
  minimal: {
    twoColumn: false,
    summaryFirst: false,
    gap: "1.5rem",
    cardPadding: "0",
    bordered: false,
    showSectionHeadings: false,
    controlHeight: "2.75rem",
    maxWidth: "34rem",
  },
}

export function layoutSpec(layout: CheckoutLayout): LayoutSpec {
  return LAYOUTS[layout] ?? LAYOUTS.two_column
}

// ─── Fields ───────────────────────────────────────────────────────────────────

/** Visible fields in the merchant's configured order. */
export function visibleFields(fields: CheckoutFieldConfig[]): CheckoutFieldConfig[] {
  return [...fields]
    .filter((f) => f.visibility !== "hidden")
    .sort((a, b) => a.order - b.order)
}

export function fieldConfig(
  fields: CheckoutFieldConfig[],
  key: CheckoutFieldKey
): CheckoutFieldConfig | undefined {
  return fields.find((f) => f.key === key)
}

export function isFieldVisible(
  fields: CheckoutFieldConfig[],
  key: CheckoutFieldKey
): boolean {
  return fieldConfig(fields, key)?.visibility !== "hidden"
}

export function isFieldRequired(
  fields: CheckoutFieldConfig[],
  key: CheckoutFieldKey
): boolean {
  return fieldConfig(fields, key)?.visibility === "required"
}

/** Which fields belong to the contact step versus the address step. */
export const CONTACT_FIELDS: CheckoutFieldKey[] = ["phone", "email"]
export const ADDRESS_FIELDS: CheckoutFieldKey[] = [
  "firstName",
  "lastName",
  "address1",
  "address2",
  "city",
  "province",
  "zip",
  "country",
]

// ─── Copy ─────────────────────────────────────────────────────────────────────

/** Merchant copy where set, sensible defaults where not. */
export function content(config: CheckoutConfigPayload) {
  const c = config.content ?? {}
  return {
    checkoutHeading: c.checkoutHeading || "Checkout",
    contactHeading: c.contactHeading || "Contact",
    addressHeading: c.addressHeading || "Delivery address",
    paymentHeading: c.paymentHeading || "Payment",
    summaryHeading: c.summaryHeading || "Order summary",
    payButtonLabel: c.payButtonLabel || "Pay",
    trustMessage: c.trustMessage || "Secure payment",
    successMessage: c.successMessage || "Thank you! Your order is confirmed.",
    failureMessage:
      c.failureMessage || "That payment didn't go through. You can try another method.",
    footerNote: c.footerNote || "",
  }
}
