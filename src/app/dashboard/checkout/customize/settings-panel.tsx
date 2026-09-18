"use client"

import * as React from "react"
import { ChevronDown, GripVertical } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { FIELD_LABELS, LAYOUT_LABELS } from "@/lib/checkout/types"
import type {
  CheckoutBanner,
  CheckoutBranding,
  CheckoutConfigPayload,
  CheckoutContent,
  CheckoutFieldConfig,
  CheckoutFieldVisibility,
  CheckoutLayout,
  OrderSummaryConfig,
  TrustElementConfig,
} from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

/**
 * The customiser's settings column (§4, §5, §23).
 *
 * Every control writes straight into the draft held by the parent, which
 * re-renders the preview on the next frame. There is no "apply" step, because a
 * customiser that needs one stops being a customiser.
 *
 * Nothing here publishes. The draft/published split means a merchant can push
 * the colour sliders around all afternoon without a shopper seeing any of it.
 */

export interface SettingsPanelProps {
  config: CheckoutConfigPayload
  onChange: (patch: Partial<CheckoutConfigPayload>) => void
}

export function SettingsPanel({ config, onChange }: SettingsPanelProps) {
  const patchBranding = (patch: Partial<CheckoutBranding>) =>
    onChange({ branding: { ...config.branding, ...patch } })

  const patchContent = (patch: Partial<CheckoutContent>) =>
    onChange({ content: { ...config.content, ...patch } })

  const patchSummary = (patch: Partial<OrderSummaryConfig>) =>
    onChange({ orderSummary: { ...config.orderSummary, ...patch } })

  const patchTrust = (patch: Partial<TrustElementConfig>) =>
    onChange({ trust: { ...config.trust, ...patch } })

  return (
    <div className="flex flex-col">
      <Section title="Branding" defaultOpen>
        <Row label="Store name">
          <Input
            value={config.branding.storeName ?? ""}
            placeholder="Shown when no logo is set"
            onChange={(e) => patchBranding({ storeName: e.target.value })}
          />
        </Row>

        <Row
          label="Logo URL"
          hint="Paste a hosted image URL — your Shopify files work well."
        >
          <Input
            value={config.branding.logoUrl ?? ""}
            placeholder="https://cdn.shopify.com/…/logo.png"
            onChange={(e) => patchBranding({ logoUrl: e.target.value || undefined })}
          />
        </Row>

        <Row label="Font">
          <NativeSelect
            value={config.branding.fontFamily}
            onChange={(v) => patchBranding({ fontFamily: v })}
            options={[
              { value: "system-ui", label: "System default" },
              { value: "Inter", label: "Inter" },
              { value: "Poppins", label: "Poppins" },
              { value: "Lato", label: "Lato" },
              { value: "Georgia", label: "Georgia" },
            ]}
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Custom fonts fall back to the system stack unless the family is
            already available on the page.
          </p>
        </Row>

        <Row label={`Corner radius — ${config.branding.borderRadius}px`}>
          <input
            type="range"
            min={0}
            max={24}
            step={1}
            value={config.branding.borderRadius}
            onChange={(e) => patchBranding({ borderRadius: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </Row>
      </Section>

      <Section title="Colours">
        <div className="grid grid-cols-2 gap-3">
          <ColorControl
            label="Primary"
            value={config.branding.primaryColor}
            onChange={(v) => patchBranding({ primaryColor: v })}
          />
          <ColorControl
            label="Button"
            value={config.branding.buttonColor}
            onChange={(v) => patchBranding({ buttonColor: v })}
          />
          <ColorControl
            label="Button text"
            value={config.branding.buttonTextColor}
            onChange={(v) => patchBranding({ buttonTextColor: v })}
          />
          <ColorControl
            label="Page background"
            value={config.branding.backgroundColor}
            onChange={(v) => patchBranding({ backgroundColor: v })}
          />
          <ColorControl
            label="Card surface"
            value={config.branding.surfaceColor}
            onChange={(v) => patchBranding({ surfaceColor: v })}
          />
          <ColorControl
            label="Text"
            value={config.branding.textColor}
            onChange={(v) => patchBranding({ textColor: v })}
          />
          <ColorControl
            label="Muted text"
            value={config.branding.mutedTextColor}
            onChange={(v) => patchBranding({ mutedTextColor: v })}
          />
          <ColorControl
            label="Borders"
            value={config.branding.borderColor}
            onChange={(v) => patchBranding({ borderColor: v })}
          />
        </div>

        <ContrastHint
          background={config.branding.buttonColor}
          foreground={config.branding.buttonTextColor}
        />
      </Section>

      <Section title="Layout">
        <div className="grid gap-2">
          {(Object.keys(LAYOUT_LABELS) as CheckoutLayout[]).map((layout) => (
            <button
              key={layout}
              type="button"
              onClick={() => patchBranding({ layout })}
              aria-pressed={config.branding.layout === layout}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                config.branding.layout === layout
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-white hover:bg-muted/50"
              )}
            >
              <LayoutGlyph layout={layout} active={config.branding.layout === layout} />
              <span className="text-sm font-medium">{LAYOUT_LABELS[layout]}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Text &amp; messages">
        <Row label="Contact heading">
          <Input
            value={config.content.contactHeading ?? ""}
            placeholder="Contact"
            onChange={(e) => patchContent({ contactHeading: e.target.value })}
          />
        </Row>
        <Row label="Address heading">
          <Input
            value={config.content.addressHeading ?? ""}
            placeholder="Delivery address"
            onChange={(e) => patchContent({ addressHeading: e.target.value })}
          />
        </Row>
        <Row label="Payment heading">
          <Input
            value={config.content.paymentHeading ?? ""}
            placeholder="Payment"
            onChange={(e) => patchContent({ paymentHeading: e.target.value })}
          />
        </Row>
        <Row label="Pay button">
          <Input
            value={config.content.payButtonLabel ?? ""}
            placeholder="Pay"
            onChange={(e) => patchContent({ payButtonLabel: e.target.value })}
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            The amount is appended automatically.
          </p>
        </Row>
        <Row label="Trust message">
          <Input
            value={config.content.trustMessage ?? ""}
            placeholder="Secure payment"
            onChange={(e) => patchContent({ trustMessage: e.target.value })}
          />
        </Row>
        <Row label="Success message">
          <Input
            value={config.content.successMessage ?? ""}
            placeholder="Thank you! Your order is confirmed."
            onChange={(e) => patchContent({ successMessage: e.target.value })}
          />
        </Row>
        <Row label="Failure message">
          <Input
            value={config.content.failureMessage ?? ""}
            placeholder="That payment didn't go through."
            onChange={(e) => patchContent({ failureMessage: e.target.value })}
          />
        </Row>
        <Row label="Footer note">
          <Input
            value={config.content.footerNote ?? ""}
            placeholder="Questions? Call us on…"
            onChange={(e) => patchContent({ footerNote: e.target.value })}
          />
        </Row>
      </Section>

      <Section title="Customer fields">
        <FieldEditor
          fields={config.fields}
          onChange={(fields) => onChange({ fields })}
        />
      </Section>

      <Section title="Order summary">
        <ToggleRow
          label="Product images"
          checked={config.orderSummary.showProductImages}
          onChange={(v) => patchSummary({ showProductImages: v })}
        />
        <ToggleRow
          label="Quantities"
          checked={config.orderSummary.showQuantity}
          onChange={(v) => patchSummary({ showQuantity: v })}
        />
        <ToggleRow
          label="Discount row"
          checked={config.orderSummary.showDiscount}
          onChange={(v) => patchSummary({ showDiscount: v })}
        />
        <ToggleRow
          label="Shipping row"
          checked={config.orderSummary.showShipping}
          onChange={(v) => patchSummary({ showShipping: v })}
        />
        <ToggleRow
          label="Tax row"
          checked={config.orderSummary.showTax}
          onChange={(v) => patchSummary({ showTax: v })}
        />
        <ToggleRow
          label="Collapse on mobile"
          hint="Keeps the pay button above the fold on phones."
          checked={config.orderSummary.collapsedOnMobile}
          onChange={(v) => patchSummary({ collapsedOnMobile: v })}
        />
      </Section>

      <Section title="Returning customers">
        <ToggleRow
          label="Recognise returning customers"
          hint="Offers their saved address when they enter a known phone number."
          checked={config.recognition?.enabled ?? false}
          onChange={(enabled) =>
            onChange({
              recognition: { ...config.recognition, enabled },
            })
          }
        />

        {config.recognition?.enabled && (
          <>
            <ToggleRow
              label="Verify phone with WhatsApp OTP"
              hint="Protects saved addresses, but adds a step and costs a message per checkout."
              checked={config.recognition?.requireOtp ?? false}
              onChange={(requireOtp) =>
                onChange({
                  recognition: { ...config.recognition, requireOtp },
                })
              }
            />

            {config.recognition?.requireOtp && (
              <Row
                label="WhatsApp template name"
                hint="Your approved authentication template. WhatsApp won't deliver a code without one."
              >
                <Input
                  value={config.recognition?.otpTemplateName ?? ""}
                  placeholder="checkout_otp"
                  onChange={(e) =>
                    onChange({
                      recognition: {
                        ...config.recognition,
                        otpTemplateName: e.target.value,
                      },
                    })
                  }
                />
              </Row>
            )}

            {config.recognition?.requireOtp &&
              !config.recognition?.otpTemplateName?.trim() && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
                  Publishing is blocked until you enter a template name —
                  verification would otherwise fail while a shopper waits for a
                  code.
                </p>
              )}
          </>
        )}
      </Section>

      <Section title="Promotional banners">
        <BannerEditor
          banners={config.banners ?? []}
          onChange={(banners) => onChange({ banners })}
        />
        <p className="text-[11px] text-muted-foreground">
          Offers with a minimum order value also show automatically as
          &ldquo;add ₹500 more&rdquo; prompts — those tend to work better than a
          fixed banner, because they&apos;re specific to the shopper&apos;s cart.
        </p>
      </Section>

      <Section title="Trust elements">
        <ToggleRow
          label="Secure payment badge"
          checked={config.trust.showSecureBadge}
          onChange={(v) => patchTrust({ showSecureBadge: v })}
        />
        <ToggleRow
          label="Payment method logos"
          checked={config.trust.showPaymentLogos}
          onChange={(v) => patchTrust({ showPaymentLogos: v })}
        />
        <BadgeEditor
          badges={config.trust.badges}
          onChange={(badges) => patchTrust({ badges })}
        />
      </Section>
    </div>
  )
}

// ─── Field editor ─────────────────────────────────────────────────────────────

/**
 * Controls which details the checkout asks for (§6).
 *
 * Reordering is by explicit up/down rather than drag: the list is short, and
 * keyboard-accessible drag-and-drop is a lot of machinery for ten rows.
 */
function FieldEditor({
  fields,
  onChange,
}: {
  fields: CheckoutFieldConfig[]
  onChange: (fields: CheckoutFieldConfig[]) => void
}) {
  const ordered = [...fields].sort((a, b) => a.order - b.order)

  const move = (index: number, delta: number) => {
    const next = [...ordered]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next.map((f, i) => ({ ...f, order: i })))
  }

  const setVisibility = (key: string, visibility: CheckoutFieldVisibility) => {
    onChange(ordered.map((f) => (f.key === key ? { ...f, visibility } : f)))
  }

  return (
    <div className="flex flex-col gap-1.5">
      {ordered.map((field, index) => (
        <div
          key={field.key}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5"
        >
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`Move ${FIELD_LABELS[field.key]} up`}
              className="text-muted-foreground hover:text-foreground disabled:opacity-25"
            >
              <ChevronDown className="size-3 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === ordered.length - 1}
              aria-label={`Move ${FIELD_LABELS[field.key]} down`}
              className="text-muted-foreground hover:text-foreground disabled:opacity-25"
            >
              <ChevronDown className="size-3" />
            </button>
          </div>

          <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40" />

          <span className="flex-1 truncate text-sm">{FIELD_LABELS[field.key]}</span>

          <NativeSelect
            value={field.visibility}
            onChange={(v) => setVisibility(field.key, v as CheckoutFieldVisibility)}
            className="w-28"
            options={[
              { value: "required", label: "Required" },
              { value: "optional", label: "Optional" },
              { value: "hidden", label: "Hidden" },
            ]}
          />
        </div>
      ))}

      <p className="mt-1 text-[11px] text-muted-foreground">
        Ask for less and more people finish. Phone alone is enough to reach a
        customer about their order.
      </p>
    </div>
  )
}

// ─── Trust badges ─────────────────────────────────────────────────────────────

function BadgeEditor({
  badges,
  onChange,
}: {
  badges: TrustElementConfig["badges"]
  onChange: (badges: TrustElementConfig["badges"]) => void
}) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {badges.map((badge, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={badge.label}
            placeholder="e.g. 7-day returns"
            onChange={(e) => {
              const next = [...badges]
              next[index] = { ...next[index], label: e.target.value }
              onChange(next)
            }}
          />
          <button
            type="button"
            onClick={() => onChange(badges.filter((_, i) => i !== index))}
            className="shrink-0 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        </div>
      ))}

      {badges.length < 4 && (
        <button
          type="button"
          onClick={() => onChange([...badges, { label: "" }])}
          className="self-start text-xs font-medium text-primary hover:underline"
        >
          + Add badge
        </button>
      )}
    </div>
  )
}

// ─── Banners ──────────────────────────────────────────────────────────────────

function BannerEditor({
  banners,
  onChange,
}: {
  banners: CheckoutBanner[]
  onChange: (banners: CheckoutBanner[]) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {banners.map((banner, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={banner.text}
            placeholder="Free delivery on orders over ₹999"
            onChange={(e) => {
              const next = [...banners]
              next[index] = { ...next[index], text: e.target.value }
              onChange(next)
            }}
          />
          <NativeSelect
            value={banner.tone}
            className="w-28"
            onChange={(tone) => {
              const next = [...banners]
              next[index] = {
                ...next[index],
                tone: tone as CheckoutBanner["tone"],
              }
              onChange(next)
            }}
            options={[
              { value: "info", label: "Info" },
              { value: "success", label: "Success" },
              { value: "warning", label: "Warning" },
            ]}
          />
          <button
            type="button"
            onClick={() => onChange(banners.filter((_, i) => i !== index))}
            className="shrink-0 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        </div>
      ))}

      {/* Three is already more than a shopper reads. */}
      {banners.length < 3 && (
        <button
          type="button"
          onClick={() => onChange([...banners, { text: "", tone: "info" }])}
          className="self-start text-xs font-medium text-primary hover:underline"
        >
          + Add banner
        </button>
      )}
    </div>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen))

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>}
    </div>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  // A free-text hex needs validating before it reaches the preview, or one
  // half-typed "#00" repaints the whole checkout black.
  const [draft, setDraft] = React.useState(value)

  // Re-seed when the value changes from outside (a discard, say). Adjusting
  // state during render rather than in an effect: React re-runs this component
  // immediately without committing the stale paint, so the input never flashes
  // the old colour.
  const [lastValue, setLastValue] = React.useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value)
  }

  const commit = (next: string) => {
    setDraft(next)
    if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(next)) onChange(next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(draft) ? draft : "#000000"}
          onChange={(e) => commit(e.target.value)}
          aria-label={`${label} colour`}
          className="size-8 shrink-0 cursor-pointer rounded-lg border border-border bg-white p-0.5"
        />
        <Input
          value={draft}
          onChange={(e) => commit(e.target.value)}
          className="font-mono text-xs"
          spellCheck={false}
        />
      </div>
    </div>
  )
}

function NativeSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-white px-2 text-sm outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function LayoutGlyph({ layout, active }: { layout: CheckoutLayout; active: boolean }) {
  const stroke = active ? "var(--color-primary)" : "var(--color-muted-foreground)"
  const common = { stroke, strokeWidth: 1.4, fill: "none" } as const

  return (
    <svg width="32" height="24" viewBox="0 0 32 24" aria-hidden className="shrink-0">
      <rect x="0.7" y="0.7" width="30.6" height="22.6" rx="2.5" {...common} opacity={0.35} />
      {layout === "two_column" || layout === "compact" ? (
        <>
          <rect x="3.5" y="4" width="15" height="16" rx="1.5" {...common} />
          <rect x="21" y="4" width="7.5" height="10" rx="1.5" {...common} />
        </>
      ) : layout === "minimal" ? (
        <>
          <line x1="6" y1="7" x2="26" y2="7" {...common} />
          <line x1="6" y1="12" x2="26" y2="12" {...common} />
          <line x1="6" y1="17" x2="19" y2="17" {...common} />
        </>
      ) : (
        <>
          <rect x="7" y="3.5" width="18" height="6" rx="1.5" {...common} />
          <rect x="7" y="11" width="18" height="9.5" rx="1.5" {...common} />
        </>
      )}
    </svg>
  )
}

/**
 * Warns when the pay button's text would be unreadable on its background.
 *
 * Merchants pick brand colours, not accessible pairs, and an invisible pay
 * button is the most expensive possible styling mistake.
 */
function ContrastHint({
  background,
  foreground,
}: {
  background: string
  foreground: string
}) {
  const ratio = contrastRatio(background, foreground)
  if (ratio === null || ratio >= 4.5) return null

  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
      Your pay button text has low contrast against its background
      {ratio ? ` (${ratio.toFixed(1)}:1)` : ""}. Aim for at least 4.5:1 so it
      stays readable in sunlight.
    </p>
  )
}

function contrastRatio(a: string, b: string): number | null {
  const lumA = relativeLuminance(a)
  const lumB = relativeLuminance(b)
  if (lumA === null || lumB === null) return null
  const [light, dark] = lumA > lumB ? [lumA, lumB] : [lumB, lumA]
  return (light + 0.05) / (dark + 0.05)
}

function relativeLuminance(hex: string): number | null {
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!match) return null

  let value = match[1]
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("")
  }

  const channels = [0, 2, 4].map((i) => {
    const channel = parseInt(value.slice(i, i + 2), 16) / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
