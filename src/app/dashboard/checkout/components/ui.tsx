import Link from "next/link"

import { formatMoney } from "@/lib/checkout/money"
import { cn } from "@/lib/utils"

/**
 * Shared presentation for the checkout dashboard.
 *
 * Server components by default — these are read-only chrome, and keeping them
 * off the client bundle matters on list pages that render a hundred rows.
 */

// ─── Layout ───────────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function Panel({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-white shadow-sm",
        padded && "px-5 py-4",
        className
      )}
    >
      {children}
    </section>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
        <path
          d="M12 9v4.5M12 17h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{message}</span>
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  )
}

export function Th({
  children,
  align = "left",
  className,
}: {
  children?: React.ReactNode
  align?: "left" | "right"
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-border px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  align = "left",
  className,
}: {
  children?: React.ReactNode
  align?: "left" | "right"
  className?: string
}) {
  return (
    <td
      className={cn(
        "border-b border-border/70 px-4 py-3 align-middle text-[13px] text-foreground",
        align === "right" && "text-right tabular-nums",
        className
      )}
    >
      {children}
    </td>
  )
}

export function Money({
  amount,
  currency = "INR",
  muted,
  strong,
}: {
  amount: number
  currency?: string
  muted?: boolean
  strong?: boolean
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        strong && "font-semibold",
        muted && "text-muted-foreground"
      )}
    >
      {formatMoney(amount, currency)}
    </span>
  )
}

// ─── Status ───────────────────────────────────────────────────────────────────

type Tone = "success" | "danger" | "warning" | "neutral" | "info"

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  danger: "bg-red-50 text-red-700 ring-red-600/15",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-blue-50 text-blue-700 ring-blue-600/15",
}

/**
 * One vocabulary for every status in the platform, so "failed" looks the same
 * whether it came from a session, an attempt, a transaction or an order.
 */
const STATUS_TONES: Record<string, Tone> = {
  // sessions
  active: "info",
  payment_pending: "warning",
  payment_processing: "warning",
  paid: "success",
  failed: "danger",
  abandoned: "warning",
  expired: "neutral",
  cancelled: "neutral",
  // attempts
  created: "neutral",
  initiated: "info",
  pending: "warning",
  succeeded: "success",
  // transactions
  success: "success",
  processing: "warning",
  refunded: "neutral",
  partially_refunded: "warning",
  // orders
  creating: "warning",
  // refunds
}

const STATUS_LABELS: Record<string, string> = {
  payment_pending: "Payment pending",
  payment_processing: "Processing",
  partially_refunded: "Partly refunded",
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? "neutral"
  const label =
    STATUS_LABELS[status] ??
    status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        TONE_CLASSES[tone]
      )}
    >
      {label}
    </span>
  )
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

/** Absolute date/time — a payments dashboard is used for reconciliation, where
 *  "2 hours ago" is useless and a timestamp is not. */
export function DateTime({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const date = new Date(value)
  return (
    <span className="whitespace-nowrap tabular-nums" title={date.toISOString()}>
      {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
      <span className="ml-1.5 text-muted-foreground">
        {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </span>
  )
}

/**
 * How to name a shopper in a list.
 *
 * Phone before email, because an Indian checkout is built around the number —
 * it is the order contact, the WhatsApp handle, and what a merchant will search
 * by when a customer calls.
 */
export function customerLabel(contact?: {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
}): string {
  const name = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ").trim()
  return name || contact?.phone || contact?.email || "Unknown shopper"
}

export function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[12px] text-muted-foreground">{children}</span>
  )
}

export function Pagination({
  page,
  limit,
  total,
  basePath,
  params,
}: {
  page: number
  limit: number
  total: number
  basePath: string
  params?: Record<string, string | undefined>
}) {
  const pages = Math.max(1, Math.ceil(total / limit))
  if (pages <= 1) return null

  const href = (next: number) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) search.set(key, value)
    }
    search.set("page", String(next))
    return `${basePath}?${search.toString()}`
  }

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[13px]">
      <span className="text-muted-foreground">
        Page {page} of {pages} · {total.toLocaleString("en-IN")} total
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={href(page - 1)}
            className="rounded-lg border border-border px-2.5 py-1 font-medium transition-colors hover:bg-muted"
          >
            Previous
          </Link>
        )}
        {page < pages && (
          <Link
            href={href(page + 1)}
            className="rounded-lg border border-border px-2.5 py-1 font-medium transition-colors hover:bg-muted"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  )
}
