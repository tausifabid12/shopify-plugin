import Link from "next/link"

import { fetchAnalytics } from "@/lib/checkout/admin-api"
import { formatMoney } from "@/lib/checkout/money"
import { PAYMENT_METHOD_LABELS } from "@/lib/checkout/types"
import type { AnalyticsPreset, PaymentMethodKey } from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

import { ErrorPanel, PageHeader, Panel } from "../components/ui"
import { BreakdownBars, ConversionChart, FunnelChart, RevenueChart } from "./charts"

/**
 * /dashboard/checkout/analytics — checkout and payment performance (§19, §20).
 *
 * Every figure is aggregated from real documents; nothing on this page is
 * seeded or estimated (§33).
 *
 * Test and live are reported separately and never summed — a merchant's sandbox
 * traffic appearing in their revenue would make the whole page untrustworthy.
 */

export const dynamic = "force-dynamic"

const PRESETS: { value: AnalyticsPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
]

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const preset = (first(params.preset) as AnalyticsPreset | undefined) ?? "30d"

  let data
  try {
    data = await fetchAnalytics({ preset })
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load analytics — ${err.message}`
            : "Could not load analytics."
        }
      />
    )
  }

  const { payments, checkout, currency } = data

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Analytics"
        description={`Checkout and payment performance in ${data.range.environment} mode.`}
      />

      {/* Filters sit in one row above the charts. */}
      <div className="flex flex-wrap items-center gap-1">
        {PRESETS.map((option) => {
          const selected = preset === option.value
          return (
            <Link
              key={option.value}
              href={`/dashboard/checkout/analytics?preset=${option.value}`}
              className={
                selected
                  ? "rounded-lg bg-foreground px-2.5 py-1 text-[12.5px] font-medium text-background"
                  : "rounded-lg px-2.5 py-1 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              }
            >
              {option.label}
            </Link>
          )
        })}
      </div>

      {/*
        Headline figures. These are stat tiles rather than charts on purpose —
        a single number's job is to be read, and a chart around it would add
        decoration without adding information.
      */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Revenue"
          value={formatMoney(payments.totalRevenue, currency)}
          hint={
            payments.refundedAmount > 0
              ? `${formatMoney(payments.netRevenue, currency)} after refunds`
              : undefined
          }
          emphasis
        />
        <Stat
          label="Conversion rate"
          value={`${checkout.conversionRate}%`}
          hint={`${checkout.completed.toLocaleString("en-IN")} of ${checkout.sessions.toLocaleString("en-IN")} checkouts`}
        />
        <Stat
          label="Payment success rate"
          value={`${payments.paymentSuccessRate}%`}
          hint={`${payments.failedPayments.toLocaleString("en-IN")} failed`}
          tone={
            payments.paymentSuccessRate >= 85
              ? "good"
              : payments.paymentSuccessRate > 0
                ? "warn"
                : undefined
          }
        />
        <Stat
          label="Average order value"
          value={formatMoney(payments.averageOrderValue, currency)}
          hint={`${payments.successfulPayments.toLocaleString("en-IN")} paid`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Abandoned"
          value={checkout.abandoned.toLocaleString("en-IN")}
          hint={`${checkout.abandonmentRate}% of checkouts`}
        />
        <Stat
          label="Pending payments"
          value={payments.pendingPayments.toLocaleString("en-IN")}
          hint="Awaiting gateway confirmation"
        />
        <Stat
          label="Refunds"
          value={formatMoney(payments.refundedAmount, currency)}
          hint={`${payments.refundCount.toLocaleString("en-IN")} issued`}
        />
        <Stat
          label="Typical time to pay"
          value={formatDuration(checkout.medianTimeToPaySeconds)}
          hint="Median, checkout opened to paid"
        />
      </div>

      {/* Counts and money never share an axis, so they never share a chart. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-sm font-semibold text-foreground">Checkouts by day</h2>
          <div className="mt-4">
            <ConversionChart points={data.timeseries} />
          </div>
        </Panel>

        <Panel>
          <h2 className="text-sm font-semibold text-foreground">Revenue by day</h2>
          <div className="mt-4">
            <RevenueChart points={data.timeseries} currency={currency} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Panel>
          <h2 className="text-sm font-semibold text-foreground">Checkout funnel</h2>
          <p className="mt-1 mb-4 text-[12.5px] text-muted-foreground">
            The percentage is the share of the step before it — that&apos;s where
            the drop-off actually is.
          </p>
          <FunnelChart steps={data.funnel} />
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel>
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              By payment method
            </h2>
            <BreakdownBars
              rows={data.byMethod.map((row) => ({
                key: row.key,
                label:
                  PAYMENT_METHOD_LABELS[row.key as PaymentMethodKey] ?? row.key,
                amount: row.amount,
                attempts: row.attempts,
                successRate: row.successRate,
              }))}
              currency={currency}
              emptyLabel="No payments attempted in this period."
            />
          </Panel>

          <Panel>
            <h2 className="mb-4 text-sm font-semibold text-foreground">By gateway</h2>
            <BreakdownBars
              rows={data.byProvider.map((row) => ({
                key: row.key,
                label: row.key.charAt(0).toUpperCase() + row.key.slice(1),
                amount: row.amount,
                attempts: row.attempts,
                successRate: row.successRate,
              }))}
              currency={currency}
              emptyLabel="No gateway traffic in this period."
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  hint,
  emphasis,
  tone,
}: {
  label: string
  value: string
  hint?: string
  emphasis?: boolean
  tone?: "good" | "warn"
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-sm">
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-semibold tracking-[-0.02em] text-foreground",
          emphasis ? "text-[24px]" : "text-[20px]"
        )}
      >
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "mt-0.5 text-[11.5px]",
            // Tone is a hint, never the only signal — the label and number
            // carry the meaning on their own.
            tone === "good"
              ? "text-emerald-700"
              : tone === "warn"
                ? "text-amber-700"
                : "text-muted-foreground"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—"
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
