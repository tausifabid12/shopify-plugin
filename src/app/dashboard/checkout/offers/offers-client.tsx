"use client"

import * as React from "react"
import { Loader2, Plus, Tag, Trash2, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { formatMoney } from "@/lib/checkout/money"
import {
  OFFER_TYPE_HINTS,
  OFFER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/checkout/types"
import type {
  Offer,
  OfferInput,
  OfferType,
  PaymentEnvironment,
} from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

import {
  createOfferAction,
  deleteOfferAction,
  updateOfferAction,
} from "../actions"
import { EmptyState, Panel } from "../components/ui"

/**
 * Offers (§24) — the merchant side of the checkout rules engine.
 *
 * Amounts are entered in rupees and percentages in percent, then converted at
 * the boundary: money to paise, percentages to basis points. Everything below
 * this component is integer minor units, so this is the only place that deals
 * in decimals.
 */

const TYPES: OfferType[] = [
  "prepaid",
  "coupon",
  "automatic",
  "cod_fee",
  "free_shipping",
  "free_gift",
]

/** Types that carry no amount of their own. */
const VALUELESS: OfferType[] = ["free_shipping", "free_gift"]

const BLANK: OfferInput = {
  name: "",
  type: "prepaid",
  valueType: "fixed",
  value: 0,
  paymentMethods: [],
  enabled: true,
  priority: 0,
  stackable: true,
  environment: "test",
}

export function OffersClient({
  initial,
  environment,
}: {
  initial: Offer[]
  environment: PaymentEnvironment
}) {
  const [offers, setOffers] = React.useState(initial)
  const [editing, setEditing] = React.useState<OfferInput | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const startCreate = () => {
    setEditingId(null)
    setEditing({ ...BLANK, environment })
    setError(null)
  }

  const startEdit = (offer: Offer) => {
    setEditingId(offer._id)
    setError(null)
    const { _id, usageCount, createdAt, ...rest } = offer
    void _id
    void usageCount
    void createdAt
    setEditing(rest)
  }

  const save = async () => {
    if (!editing) return
    setBusy(true)
    setError(null)

    const result = editingId
      ? await updateOfferAction(editingId, editing)
      : await createOfferAction(editing)

    setBusy(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setOffers((list) =>
      editingId
        ? list.map((o) => (o._id === editingId ? result.data : o))
        : [result.data, ...list]
    )
    setEditing(null)
    setEditingId(null)
  }

  const remove = async (id: string) => {
    setBusy(true)
    const result = await deleteOfferAction(id)
    setBusy(false)
    if (result.ok) {
      setOffers((list) => list.filter((o) => o._id !== id))
      if (editingId === id) setEditing(null)
    } else {
      setError(result.error)
    }
  }

  const toggle = async (offer: Offer, enabled: boolean) => {
    const { _id, usageCount, createdAt, ...rest } = offer
    void _id
    void usageCount
    void createdAt
    const result = await updateOfferAction(offer._id, { ...rest, enabled })
    if (result.ok) {
      setOffers((list) => list.map((o) => (o._id === offer._id ? result.data : o)))
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          Editing <span className="font-semibold text-foreground">{environment}</span>{" "}
          mode offers.
        </p>
        {!editing && (
          <Button size="sm" onClick={startCreate}>
            <Plus />
            New offer
          </Button>
        )}
      </div>

      {editing && (
        <OfferForm
          value={editing}
          onChange={setEditing}
          onSave={save}
          onCancel={() => {
            setEditing(null)
            setEditingId(null)
            setError(null)
          }}
          busy={busy}
          isNew={!editingId}
        />
      )}

      <Panel padded={false}>
        {offers.length === 0 ? (
          <EmptyState
            title="No offers yet"
            description="A pay-online discount is the usual first one — it shifts orders away from cash on delivery."
          />
        ) : (
          <ul className="divide-y divide-border">
            {offers.map((offer) => (
              <li
                key={offer._id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-medium text-foreground">
                      {offer.name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Tag className="size-3" />
                      {OFFER_TYPE_LABELS[offer.type]}
                    </span>
                    {offer.code && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                        {offer.code}
                      </span>
                    )}
                    {!offer.stackable && (
                      <span className="text-[11px] text-muted-foreground">
                        exclusive
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    {describeValue(offer)}
                    {offer.minSubtotal
                      ? ` · on orders over ${formatMoney(offer.minSubtotal)}`
                      : ""}
                    {offer.paymentMethods.length > 0
                      ? ` · ${offer.paymentMethods
                          .map((m) => PAYMENT_METHOD_LABELS[m])
                          .join(", ")}`
                      : ""}
                  </p>

                  {offer.usageLimit !== undefined && (
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      Used {offer.usageCount} of {offer.usageLimit}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Switch
                    checked={offer.enabled}
                    disabled={busy}
                    onCheckedChange={(v) => toggle(offer, v)}
                  />
                  <Button variant="outline" size="sm" onClick={() => startEdit(offer)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    disabled={busy}
                    onClick={() => remove(offer._id)}
                    aria-label={`Delete ${offer.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function OfferForm({
  value,
  onChange,
  onSave,
  onCancel,
  busy,
  isNew,
}: {
  value: OfferInput
  onChange: (value: OfferInput) => void
  onSave: () => void
  onCancel: () => void
  busy: boolean
  isNew: boolean
}) {
  const patch = (p: Partial<OfferInput>) => onChange({ ...value, ...p })
  const isPercentage = value.valueType === "percentage"

  return (
    <Panel>
      <h2 className="text-sm font-semibold text-foreground">
        {isNew ? "New offer" : "Edit offer"}
      </h2>

      <div className="mt-4 flex flex-col gap-4">
        <Field label="Internal name" hint="Only you see this.">
          <Input
            value={value.name}
            placeholder="Prepaid ₹100 off"
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>

        <Field label="Type">
          <div className="grid gap-2 sm:grid-cols-2">
            {TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  patch({
                    type,
                    ...(VALUELESS.includes(type)
                      ? { valueType: "fixed" as const, value: 0 }
                      : {}),
                  })
                }
                aria-pressed={value.type === type}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  value.type === type
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-white hover:bg-muted/50"
                )}
              >
                <span className="block text-[13px] font-medium text-foreground">
                  {OFFER_TYPE_LABELS[type]}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                  {OFFER_TYPE_HINTS[type]}
                </span>
              </button>
            ))}
          </div>
        </Field>

        {value.type === "coupon" && (
          <Field label="Code" hint="Letters, numbers, hyphens. Shoppers type this.">
            <Input
              value={value.code ?? ""}
              placeholder="WELCOME10"
              className="font-mono uppercase"
              onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
            />
          </Field>
        )}

        {value.type === "free_gift" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Gift product variant"
              hint="Shopify variant ID or gid. Stock is decremented like any other line."
            >
              <Input
                value={value.giftVariantGid ?? ""}
                placeholder="gid://shopify/ProductVariant/1234567890"
                className="font-mono text-xs"
                spellCheck={false}
                onChange={(e) => patch({ giftVariantGid: e.target.value })}
              />
            </Field>
            <Field label="Quantity">
              <Input
                inputMode="numeric"
                value={String(value.giftQuantity ?? 1)}
                onChange={(e) =>
                  patch({
                    giftQuantity:
                      Number(e.target.value.replace(/\D/g, "")) || 1,
                  })
                }
              />
            </Field>
          </div>
        )}

        {!VALUELESS.includes(value.type) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount type">
              <select
                value={value.valueType}
                onChange={(e) =>
                  patch({ valueType: e.target.value as "fixed" | "percentage", value: 0 })
                }
                className="h-8 w-full rounded-lg border border-input bg-white px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="fixed">Fixed amount (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </Field>

            <Field
              label={
                value.type === "cod_fee"
                  ? isPercentage
                    ? "Fee (%)"
                    : "Fee (₹)"
                  : isPercentage
                    ? "Discount (%)"
                    : "Discount (₹)"
              }
            >
              <Input
                inputMode="decimal"
                value={displayValue(value)}
                onChange={(e) => patch({ value: parseValue(e.target.value, value.valueType) })}
              />
            </Field>

            {isPercentage && (
              <Field label="Maximum discount (₹)" hint="Optional cap.">
                <Input
                  inputMode="decimal"
                  value={value.maxDiscount ? String(value.maxDiscount / 100) : ""}
                  onChange={(e) =>
                    patch({ maxDiscount: toPaise(e.target.value) || undefined })
                  }
                />
              </Field>
            )}

            <Field label="Minimum order value (₹)" hint="Optional.">
              <Input
                inputMode="decimal"
                value={value.minSubtotal ? String(value.minSubtotal / 100) : ""}
                onChange={(e) =>
                  patch({ minSubtotal: toPaise(e.target.value) || undefined })
                }
              />
            </Field>
          </div>
        )}

        <Field
          label="Checkout message"
          hint="Shown to the shopper in the order summary."
        >
          <Input
            value={value.message ?? ""}
            placeholder="Pay online and save ₹100"
            onChange={(e) => patch({ message: e.target.value })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Total uses" hint="Optional. Leave blank for unlimited.">
            <Input
              inputMode="numeric"
              value={value.usageLimit ? String(value.usageLimit) : ""}
              onChange={(e) =>
                patch({ usageLimit: Number(e.target.value.replace(/\D/g, "")) || undefined })
              }
            />
          </Field>

          <Field label="Priority" hint="Lower runs first.">
            <Input
              inputMode="numeric"
              value={String(value.priority ?? 0)}
              onChange={(e) =>
                patch({ priority: Number(e.target.value.replace(/\D/g, "")) || 0 })
              }
            />
          </Field>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[13px] font-medium text-foreground">
              Combine with other offers
            </span>
            <p className="text-[11.5px] text-muted-foreground">
              Off means this offer applies alone. Where two exclusive offers both
              qualify, the shopper gets the larger one.
            </p>
          </div>
          <Switch
            checked={value.stackable}
            onCheckedChange={(v) => patch({ stackable: v })}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onSave} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {isNew ? "Create offer" : "Save offer"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    </Panel>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
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
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** Paise → rupees, basis points → percent, for display in the form. */
function displayValue(offer: OfferInput): string {
  if (!offer.value) return ""
  return offer.valueType === "percentage"
    ? String(offer.value / 100)
    : String(offer.value / 100)
}

/** Rupees → paise, percent → basis points. Both happen to be ×100. */
function parseValue(raw: string, type: "fixed" | "percentage"): number {
  void type
  return toPaise(raw)
}

function toPaise(raw: string): number {
  const parsed = Number(raw.replace(/[^\d.]/g, ""))
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100)
}

function describeValue(offer: Offer): string {
  if (offer.type === "free_shipping") return "Free shipping"
  if (offer.type === "free_gift") {
    return `Free gift ×${offer.giftQuantity ?? 1}`
  }
  const amount =
    offer.valueType === "percentage"
      ? `${offer.value / 100}%`
      : formatMoney(offer.value)
  return offer.type === "cod_fee" ? `${amount} fee` : `${amount} off`
}
