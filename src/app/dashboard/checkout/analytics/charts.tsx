"use client"

import * as React from "react"

import { formatMoney } from "@/lib/checkout/money"
import type { FunnelStep, TimeseriesPoint } from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

/**
 * Charts for checkout analytics.
 *
 * Hand-rolled SVG rather than a charting library: these are four simple forms,
 * and a library would add more bundle weight than the whole dashboard.
 *
 * Palette and chrome follow the validated reference instance — series blue
 * #2a78d6 and orange #eb6834 (validated as a pair against this white surface:
 * CVD ΔE 24.7, normal-vision ΔE 33.6, both ≥3:1 contrast). Text always wears the
 * app's own ink tokens, never a series colour, so identity is never carried by
 * colour alone.
 *
 * There is deliberately no dual-axis chart anywhere here. Counts and money are
 * different scales, so they get separate charts.
 */

const SERIES_1 = "#2a78d6" // blue  — primary series
const SERIES_2 = "#eb6834" // orange — secondary series
const GRIDLINE = "#e1e0d9"
const BASELINE = "#c3c2b7"
const AXIS_INK = "#898781"

// ─── Funnel ───────────────────────────────────────────────────────────────────

/**
 * Checkout funnel (§19).
 *
 * Single series, so no legend — the heading names it. The number that earns its
 * place is the step-to-step rate, not the share of total: a step converting at
 * 40% of everyone is healthy if the step before it was 45% and broken if it was
 * 95%.
 */
export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map((s) => s.count), 1)

  return (
    <ul className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const width = Math.max((step.count / max) * 100, step.count > 0 ? 1.5 : 0)
        const dropped = index > 0 ? steps[index - 1].count - step.count : 0

        return (
          <li key={step.key} className="group/step">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-foreground">
                {step.label}
              </span>
              <span className="flex items-baseline gap-2.5">
                <span className="text-[13px] font-semibold text-foreground tabular-nums">
                  {step.count.toLocaleString("en-IN")}
                </span>
                {index > 0 && (
                  <span
                    className="text-[11.5px] tabular-nums"
                    style={{ color: AXIS_INK }}
                    title={`${step.rateOfPrevious}% of the previous step`}
                  >
                    {step.rateOfPrevious}%
                  </span>
                )}
              </span>
            </div>

            <div
              className="mt-1.5 h-2.5 w-full overflow-hidden"
              style={{ background: GRIDLINE, borderRadius: 4 }}
            >
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${width}%`,
                  background: SERIES_1,
                  // 4px rounded data-end, anchored flat to the baseline edge.
                  borderRadius: "0 4px 4px 0",
                }}
              />
            </div>

            {dropped > 0 && (
              <p className="mt-1 text-[11px]" style={{ color: AXIS_INK }}>
                {dropped.toLocaleString("en-IN")} dropped off here
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// ─── Shared line-chart geometry ───────────────────────────────────────────────

const VIEW_W = 720
const VIEW_H = 220
const PAD = { top: 16, right: 16, bottom: 26, left: 48 }

interface Series {
  key: string
  label: string
  color: string
  values: number[]
}

function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

function useHoverIndex(count: number) {
  const ref = React.useRef<SVGSVGElement>(null)
  const [index, setIndex] = React.useState<number | null>(null)

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = ref.current
    if (!svg || count === 0) return
    const rect = svg.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    const x = ratio * VIEW_W
    const inner = VIEW_W - PAD.left - PAD.right
    const position = ((x - PAD.left) / inner) * (count - 1)
    setIndex(Math.max(0, Math.min(count - 1, Math.round(position))))
  }

  return { ref, index, onMove, clear: () => setIndex(null) }
}

/**
 * Line chart with a crosshair tooltip.
 *
 * One y-scale, always. `series` must share units — passing counts and currency
 * together would be the dual-axis mistake wearing a different hat.
 */
function LineChart({
  points,
  series,
  formatValue,
  formatExact,
  ariaLabel,
}: {
  points: TimeseriesPoint[]
  series: Series[]
  /** Axis and tooltip. May be abbreviated — axis ticks need to be short. */
  formatValue: (value: number) => string
  /** Table view. Always the exact figure: an abbreviated "₹1.2L" in the table
   *  would defeat the point of having a table. Defaults to `formatValue`. */
  formatExact?: (value: number) => string
  ariaLabel: string
}) {
  const { ref, index, onMove, clear } = useHoverIndex(points.length)

  if (points.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-muted-foreground">
        No activity in this period.
      </p>
    )
  }

  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 0))
  const innerW = VIEW_W - PAD.left - PAD.right
  const innerH = VIEW_H - PAD.top - PAD.bottom

  const x = (i: number) =>
    points.length === 1 ? PAD.left + innerW / 2 : PAD.left + (i / (points.length - 1)) * innerW
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH

  const ticks = [0, 0.5, 1].map((t) => t * max)

  // Show at most six date labels — more collide at dashboard widths.
  const labelEvery = Math.max(1, Math.ceil(points.length / 6))

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full touch-none"
        style={{ height: "auto" }}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={clear}
      >
        {/* Recessive grid */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={VIEW_W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={tick === 0 ? BASELINE : GRIDLINE}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill={AXIS_INK}
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {points.map((point, i) =>
          i % labelEvery === 0 ? (
            <text
              key={point.date}
              x={x(i)}
              y={VIEW_H - 8}
              textAnchor="middle"
              fontSize={10}
              fill={AXIS_INK}
            >
              {new Date(point.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </text>
          ) : null
        )}

        {/* Crosshair — a solid hairline. Dashing reads as "projection" or
            "threshold" and adds noise to what is only a pointer affordance. */}
        {index !== null && (
          <line
            x1={x(index)}
            x2={x(index)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            stroke={BASELINE}
            strokeWidth={1}
          />
        )}

        {/* Series */}
        {series.map((s) => {
          const path = s.values
            .map((value, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(value)}`)
            .join(" ")
          const area = `${path} L${x(s.values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`

          return (
            <g key={s.key}>
              {series.length === 1 && (
                <path d={area} fill={s.color} fillOpacity={0.1} />
              )}
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {index !== null && (
                <circle
                  cx={x(index)}
                  cy={y(s.values[index])}
                  r={4.5}
                  fill={s.color}
                  // 2px surface ring keeps overlapping markers legible.
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {index !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-lg border border-border bg-white px-3 py-2 shadow-md"
          style={{
            left: `${(x(index) / VIEW_W) * 100}%`,
            transform:
              x(index) > VIEW_W * 0.6 ? "translateX(-105%)" : "translateX(5%)",
          }}
        >
          <p className="text-[11.5px] font-medium text-muted-foreground">
            {new Date(points[index].date).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {series.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[12px] text-foreground">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
                <span className="text-[12px] font-semibold text-foreground tabular-nums">
                  {formatValue(s.values[index])}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        The tooltip enhances; it never gates. Every daily value is also readable
        here without a pointer — which is also what makes the chart usable by
        keyboard and screen reader.
      */}
      <details className="mt-3 group/table">
        <summary className="cursor-pointer list-none text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
          <span className="group-open/table:hidden">Show values</span>
          <span className="hidden group-open/table:inline">Hide values</span>
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead className="sticky top-0 bg-white">
              <tr>
                <th className="border-b border-border px-3 py-1.5 font-medium text-muted-foreground">
                  Date
                </th>
                {series.map((s) => (
                  <th
                    key={s.key}
                    className="border-b border-border px-3 py-1.5 text-right font-medium text-muted-foreground"
                  >
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point, i) => (
                <tr key={point.date}>
                  <td className="border-b border-border/60 px-3 py-1.5 tabular-nums">
                    {new Date(point.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </td>
                  {series.map((s) => (
                    <td
                      key={s.key}
                      className="border-b border-border/60 px-3 py-1.5 text-right tabular-nums"
                    >
                      {(formatExact ?? formatValue)(s.values[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

// ─── Public charts ────────────────────────────────────────────────────────────

/** Counts only — sessions against the ones that paid. */
export function ConversionChart({ points }: { points: TimeseriesPoint[] }) {
  const series: Series[] = [
    {
      key: "sessions",
      label: "Checkouts started",
      color: SERIES_1,
      values: points.map((p) => p.sessions),
    },
    {
      key: "paid",
      label: "Paid",
      color: SERIES_2,
      values: points.map((p) => p.paid),
    },
  ]

  return (
    <>
      <Legend series={series} />
      <LineChart
        points={points}
        series={series}
        formatValue={(v) => Math.round(v).toLocaleString("en-IN")}
        ariaLabel="Checkouts started and paid, by day"
      />
    </>
  )
}

/** Money only — kept in its own chart rather than sharing an axis with counts. */
export function RevenueChart({
  points,
  currency,
}: {
  points: TimeseriesPoint[]
  currency: string
}) {
  const series: Series[] = [
    {
      key: "revenue",
      label: "Revenue",
      color: SERIES_1,
      values: points.map((p) => p.revenue),
    },
  ]

  return (
    <LineChart
      points={points}
      series={series}
      formatValue={(v) => compactMoney(v, currency)}
      formatExact={(v) => formatMoney(v, currency)}
      ariaLabel="Revenue by day"
    />
  )
}

/** Legend — always present for two or more series, so identity is never colour alone. */
function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null
  return (
    <ul className="mb-3 flex flex-wrap items-center gap-4">
      {series.map((s) => (
        <li
          key={s.key}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground"
        >
          <span
            aria-hidden
            className="h-0.5 w-4 rounded-full"
            style={{ background: s.color }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

// ─── Breakdown bars ───────────────────────────────────────────────────────────

export function BreakdownBars({
  rows,
  currency,
  emptyLabel,
}: {
  rows: { key: string; label: string; amount: number; attempts: number; successRate: number }[]
  currency: string
  emptyLabel: string
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-muted-foreground">{emptyLabel}</p>
    )
  }

  const max = Math.max(...rows.map((r) => r.amount), 1)

  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-medium text-foreground">{row.label}</span>
            <span className="text-[13px] font-semibold text-foreground tabular-nums">
              {formatMoney(row.amount, currency)}
            </span>
          </div>
          <div
            className="mt-1.5 h-2 w-full overflow-hidden"
            style={{ background: GRIDLINE, borderRadius: 4 }}
          >
            <div
              className="h-full"
              style={{
                width: `${Math.max((row.amount / max) * 100, row.amount > 0 ? 1.5 : 0)}%`,
                background: SERIES_1,
                borderRadius: "0 4px 4px 0",
              }}
            />
          </div>
          <p className="mt-1 text-[11.5px]" style={{ color: AXIS_INK }}>
            {row.attempts.toLocaleString("en-IN")}{" "}
            {row.attempts === 1 ? "attempt" : "attempts"} ·{" "}
            <span
              className={cn(
                "font-medium",
                row.successRate >= 80
                  ? "text-emerald-700"
                  : row.successRate >= 50
                    ? "text-amber-700"
                    : "text-red-700"
              )}
            >
              {row.successRate}% success
            </span>
          </p>
        </li>
      ))}
    </ul>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Axis-friendly money: ₹1.2L rather than ₹1,20,000.00. */
function compactMoney(minor: number, currency: string): string {
  const major = minor / 100
  if (major >= 10_000_000) return `₹${(major / 10_000_000).toFixed(1)}Cr`
  if (major >= 100_000) return `₹${(major / 100_000).toFixed(1)}L`
  if (major >= 1_000) return `₹${(major / 1_000).toFixed(1)}k`
  if (major === 0) return "₹0"
  return formatMoney(minor, currency)
}
