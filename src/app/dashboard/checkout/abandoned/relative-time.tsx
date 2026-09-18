"use client"

import * as React from "react"

/**
 * Relative timestamp — "15 min ago".
 *
 * Deliberately different from the absolute `DateTime` used everywhere else in
 * this dashboard. Recovery is time-sensitive in a way reconciliation is not:
 * "15 min ago" tells a merchant to act now, where a timestamp makes them do the
 * arithmetic.
 *
 * The clock is an external mutable source, so it is read through
 * `useSyncExternalStore` rather than synced into state from an effect. The
 * snapshot is bucketed to the minute, which keeps it stable between ticks —
 * React re-renders only when the minute actually changes, and never loops.
 *
 * On the server the snapshot is `null` and the absolute date renders instead:
 * "now" cannot be computed during a server render without baking one request's
 * clock into the output, and this way there is no hydration mismatch either.
 */

function subscribe(onStoreChange: () => void): () => void {
  // Twice the bucket width, so a label is never more than ~30s stale.
  const timer = setInterval(onStoreChange, 30_000)
  return () => clearInterval(timer)
}

const getSnapshot = () => Math.floor(Date.now() / 60_000)
const getServerSnapshot = () => null

export function RelativeTime({ value }: { value?: string }) {
  const nowMinute = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  if (!value) return <span className="text-muted-foreground">—</span>

  const absolute = new Date(value)

  return (
    <time
      dateTime={absolute.toISOString()}
      title={absolute.toLocaleString("en-IN")}
      className="whitespace-nowrap"
    >
      {nowMinute === null
        ? absolute.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
        : describe(nowMinute * 60_000 - absolute.getTime())}
    </time>
  )
}

function describe(elapsedMs: number): string {
  const minutes = Math.max(0, Math.round(elapsedMs / 60_000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hr ago`
  return `${Math.round(minutes / (60 * 24))} d ago`
}
