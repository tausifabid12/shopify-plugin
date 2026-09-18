"use client"

import * as React from "react"
import { ArrowRight, Check, Loader2, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { PAYMENT_METHOD_LABELS } from "@/lib/checkout/types"
import type {
  CheckoutOverview,
  PaymentEnvironment,
  PaymentMethodKey,
  PaymentProviderKey,
  RouteRule,
} from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

import { saveRoutingAction } from "../actions"
import { Panel } from "../components/ui"

/**
 * Payment routing (§11).
 *
 * The shopper picks an instrument; this table decides which gateway serves it,
 * and which one takes over if the first is unreachable.
 *
 * Fallback is strictly about *reaching* a gateway — a timeout, an outage, a
 * missing credential. It never fires after a payment has been opened, because
 * at that point the shopper may already be looking at a payment screen and a
 * second attempt could take a second payment. The copy on this page says so,
 * because a merchant who misreads it as "retry failed payments" will expect
 * behaviour we deliberately do not have.
 */

const COD: PaymentMethodKey = "cod"

export function RoutingClient({
  overview,
  initialRules,
  environment,
}: {
  overview: CheckoutOverview
  initialRules: RouteRule[]
  environment: PaymentEnvironment
}) {
  const [rules, setRules] = React.useState<RouteRule[]>(initialRules)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState<
    { tone: "ok" | "error"; text: string } | null
  >(null)

  const connected = React.useMemo(
    () =>
      overview.credentials
        .filter((c) => c.environment === environment && c.enabled)
        .map((c) => c.provider),
    [overview.credentials, environment]
  )

  const supportsMethod = React.useCallback(
    (provider: PaymentProviderKey, method: PaymentMethodKey) =>
      overview.providers
        .find((p) => p.key === provider)
        ?.supportedMethods.includes(method) ?? false,
    [overview.providers]
  )

  const patch = (method: PaymentMethodKey, changes: Partial<RouteRule>) => {
    setRules((list) =>
      list.map((rule) => (rule.method === method ? { ...rule, ...changes } : rule))
    )
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    const result = await saveRoutingAction(environment, rules)
    setSaving(false)
    setMessage(
      result.ok
        ? { tone: "ok", text: "Routing saved." }
        : { tone: "error", text: result.error }
    )
  }

  const noGateways = connected.length === 0
  const enabledOnline = rules.filter((r) => r.enabled && r.method !== COD)

  return (
    <div className="flex flex-col gap-4">
      {noGateways && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">
              No gateways are connected in {environment} mode
            </p>
            <p className="mt-0.5 text-[13px]">
              Connect one on the Gateways tab before setting up routing —
              otherwise shoppers see no payment options at all.
            </p>
          </div>
        </div>
      )}

      <Panel padded={false}>
        <div className="divide-y divide-border">
          {rules
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((rule) => {
              const offline = rule.method === COD
              const eligible = connected.filter((p) => supportsMethod(p, rule.method))
              const unusable = rule.enabled && !offline && eligible.length === 0

              return (
                <div key={rule.method} className="flex flex-col gap-3 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(enabled) => patch(rule.method, { enabled })}
                      />
                      <div>
                        <p className="text-[13.5px] font-medium text-foreground">
                          {PAYMENT_METHOD_LABELS[rule.method]}
                        </p>
                        {offline && (
                          <p className="text-[11.5px] text-muted-foreground">
                            Settled on delivery — no gateway involved.
                          </p>
                        )}
                      </div>
                    </div>

                    {rule.enabled && !offline && (
                      <div className="flex flex-wrap items-center gap-2">
                        <ProviderSelect
                          label="Primary"
                          value={rule.primaryProvider}
                          options={eligible}
                          overview={overview}
                          onChange={(primaryProvider) =>
                            patch(rule.method, {
                              primaryProvider,
                              // A fallback identical to the primary would turn
                              // one outage into two identical failures.
                              fallbackProvider:
                                rule.fallbackProvider === primaryProvider
                                  ? undefined
                                  : rule.fallbackProvider,
                            })
                          }
                        />
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                        <ProviderSelect
                          label="Backup"
                          value={rule.fallbackProvider}
                          options={eligible.filter((p) => p !== rule.primaryProvider)}
                          overview={overview}
                          allowNone
                          onChange={(fallbackProvider) =>
                            patch(rule.method, { fallbackProvider })
                          }
                        />
                      </div>
                    )}
                  </div>

                  {rule.enabled && (
                    <Input
                      value={rule.description ?? ""}
                      placeholder={`Description shown under ${PAYMENT_METHOD_LABELS[rule.method]} (optional)`}
                      onChange={(e) =>
                        patch(rule.method, { description: e.target.value })
                      }
                      className="max-w-lg"
                    />
                  )}

                  {unusable && (
                    <p className="flex items-center gap-1.5 text-[12px] text-amber-700">
                      <TriangleAlert className="size-3.5" />
                      No connected gateway can process this method, so it
                      won&apos;t appear at checkout.
                    </p>
                  )}
                </div>
              )
            })}
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">
          The backup gateway is used when the primary can&apos;t be reached —
          not to retry a payment a customer already declined.
        </p>

        <div className="flex items-center gap-3">
          {message && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[12px] font-medium",
                message.tone === "ok" ? "text-emerald-700" : "text-destructive"
              )}
            >
              {message.tone === "ok" && <Check className="size-3.5" />}
              {message.text}
            </span>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Save routing
          </Button>
        </div>
      </div>

      {enabledOnline.length === 0 && !noGateways && (
        <p className="text-[12px] text-muted-foreground">
          No online payment methods are enabled — shoppers won&apos;t be able to
          pay.
        </p>
      )}
    </div>
  )
}

function ProviderSelect({
  label,
  value,
  options,
  overview,
  allowNone,
  onChange,
}: {
  label: string
  value?: PaymentProviderKey
  options: PaymentProviderKey[]
  overview: CheckoutOverview
  allowNone?: boolean
  onChange: (value: PaymentProviderKey | undefined) => void
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange((e.target.value || undefined) as PaymentProviderKey | undefined)
        }
        className="h-8 rounded-lg border border-input bg-white px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">{allowNone ? "None" : "Choose…"}</option>
        {options.map((provider) => (
          <option key={provider} value={provider}>
            {overview.providers.find((p) => p.key === provider)?.label ?? provider}
          </option>
        ))}
      </select>
    </label>
  )
}
