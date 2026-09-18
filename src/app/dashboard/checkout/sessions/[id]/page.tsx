import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { fetchSession } from "@/lib/checkout/admin-api"
import { formatMoney } from "@/lib/checkout/money"
import { PAYMENT_METHOD_LABELS } from "@/lib/checkout/types"
import type { TimelineEvent } from "@/lib/checkout/types"

import {
  customerLabel,
  DateTime,
  ErrorPanel,
  Money,
  Mono,
  Panel,
  StatusBadge,
  Table,
  Td,
  Th,
} from "../../components/ui"

/**
 * One checkout, in full (§21).
 *
 * This is the page a merchant opens when something went wrong and they need to
 * know exactly what: which gateway was tried, what it said, whether the webhook
 * arrived, and whether the Shopify order was created. The timeline is the
 * answer to "the customer says they paid but there's no order".
 */

export const dynamic = "force-dynamic"

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let detail
  try {
    detail = await fetchSession(id)
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load this checkout — ${err.message}`
            : "Could not load this checkout."
        }
      />
    )
  }

  const { session, attempts, transactions, order, timeline } = detail
  const currency = session.currency

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/checkout/sessions"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Checkout sessions
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">
              {customerLabel(session.contact)}
            </h1>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Started <DateTime value={session.createdAt} /> ·{" "}
            <Mono>{session.token}</Mono>
          </p>
        </div>
        <p className="text-[20px] font-semibold text-foreground">
          {formatMoney(session.totals?.total ?? 0, currency)}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-5">
          {/* Items */}
          <Panel padded={false}>
            <h2 className="px-5 py-3.5 text-sm font-semibold text-foreground">
              Items
            </h2>
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th align="right">Qty</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {session.items?.map((item) => (
                  <tr key={item.variantGid}>
                    <Td>
                      <span className="font-medium">{item.title}</span>
                      {item.variantTitle && (
                        <span className="ml-1.5 text-muted-foreground">
                          {item.variantTitle}
                        </span>
                      )}
                    </Td>
                    <Td align="right">{item.quantity}</Td>
                    <Td align="right">
                      <Money amount={item.lineTotal} currency={currency} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="flex flex-col gap-1.5 px-5 py-3.5 text-[13px]">
              <TotalRow
                label="Subtotal"
                value={formatMoney(session.totals?.subtotal ?? 0, currency)}
              />
              {(session.totals?.discount ?? 0) > 0 && (
                <TotalRow
                  label="Discount"
                  value={`− ${formatMoney(session.totals.discount, currency)}`}
                />
              )}
              {(session.totals?.shipping ?? 0) > 0 && (
                <TotalRow
                  label="Shipping"
                  value={formatMoney(session.totals.shipping, currency)}
                />
              )}
              {(session.totals?.tax ?? 0) > 0 && (
                <TotalRow label="Tax" value={formatMoney(session.totals.tax, currency)} />
              )}
              <div className="mt-1 flex items-center justify-between border-t border-border pt-2 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatMoney(session.totals?.total ?? 0, currency)}
                </span>
              </div>
            </dl>
          </Panel>

          {/* Payment attempts */}
          <Panel padded={false}>
            <h2 className="px-5 py-3.5 text-sm font-semibold text-foreground">
              Payment attempts
            </h2>
            {attempts.length === 0 ? (
              <p className="px-5 pb-4 text-[13px] text-muted-foreground">
                The shopper never reached the payment step.
              </p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>Method</Th>
                    <Th>Gateway</Th>
                    <Th>Status</Th>
                    <Th align="right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr key={attempt._id}>
                      <Td>
                        <Mono>{attempt.attemptRef}</Mono>
                        {attempt.isFallback && (
                          <span className="ml-2 text-[11px] text-amber-700">
                            fallback
                          </span>
                        )}
                        {attempt.failureReason && (
                          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                            {attempt.failureReason}
                          </p>
                        )}
                      </Td>
                      <Td>{PAYMENT_METHOD_LABELS[attempt.method]}</Td>
                      <Td className="capitalize">{attempt.provider}</Td>
                      <Td>
                        <StatusBadge status={attempt.status} />
                      </Td>
                      <Td align="right">
                        <Money amount={attempt.amount} currency={attempt.currency} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>

          {/* Timeline */}
          <Panel padded={false}>
            <h2 className="px-5 py-3.5 text-sm font-semibold text-foreground">
              Timeline
            </h2>
            <Timeline events={timeline} />
          </Panel>
        </div>

        {/* Side */}
        <div className="flex flex-col gap-5">
          <Panel>
            <h2 className="text-sm font-semibold text-foreground">Customer</h2>
            <dl className="mt-3 flex flex-col gap-2 text-[13px]">
              <SideRow label="Phone" value={session.contact?.phone} />
              <SideRow label="Email" value={session.contact?.email} />
            </dl>

            {session.shippingAddress && (
              <>
                <h3 className="mt-4 text-[12px] font-semibold text-muted-foreground uppercase">
                  Delivery
                </h3>
                <address className="mt-1.5 text-[13px] leading-relaxed not-italic text-foreground">
                  {[
                    [session.shippingAddress.firstName, session.shippingAddress.lastName]
                      .filter(Boolean)
                      .join(" "),
                    session.shippingAddress.address1,
                    session.shippingAddress.address2,
                    [session.shippingAddress.city, session.shippingAddress.zip]
                      .filter(Boolean)
                      .join(" "),
                    session.shippingAddress.province,
                  ]
                    .filter(Boolean)
                    .map((line, i) => (
                      <span key={i} className="block">
                        {line}
                      </span>
                    ))}
                </address>
              </>
            )}
          </Panel>

          <Panel>
            <h2 className="text-sm font-semibold text-foreground">Order</h2>
            {order ? (
              <dl className="mt-3 flex flex-col gap-2 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Shopify</dt>
                  <dd>
                    {order.shopifyOrderName ? (
                      <span className="font-medium">{order.shopifyOrderName}</span>
                    ) : (
                      <StatusBadge status={order.syncStatus} />
                    )}
                  </dd>
                </div>
                {order.lastError && (
                  <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-[12px] text-amber-900">
                    {order.lastError}
                  </p>
                )}
              </dl>
            ) : (
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                No order — this checkout was never paid.
              </p>
            )}
          </Panel>

          {transactions.length > 0 && (
            <Panel>
              <h2 className="text-sm font-semibold text-foreground">Transaction</h2>
              {transactions.map((transaction) => (
                <dl
                  key={transaction._id}
                  className="mt-3 flex flex-col gap-2 text-[13px]"
                >
                  <SideRow label="Gateway" value={transaction.provider} />
                  <SideRow label="Payment ID" value={transaction.providerPaymentId} />
                  <SideRow label="Bank ref" value={transaction.providerReferenceId} />
                  <div className="pt-1">
                    <Link
                      href={`/dashboard/checkout/transactions/${transaction._id}`}
                      className="text-[13px] font-medium text-primary hover:underline"
                    >
                      Open transaction →
                    </Link>
                  </div>
                </dl>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Bits ─────────────────────────────────────────────────────────────────────

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

function SideRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium" title={value}>
        {value || "—"}
      </dd>
    </div>
  )
}

/** Tone per event family, so a failure is findable by eye in a long list. */
function eventTone(type: string): string {
  if (type.endsWith("failed") || type.includes("verification_failed")) {
    return "bg-red-500"
  }
  if (type.endsWith("succeeded") || type === "order.created" || type === "payment.verified") {
    return "bg-emerald-500"
  }
  if (type.startsWith("webhook")) return "bg-blue-400"
  return "bg-border"
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="px-5 pb-4 text-[13px] text-muted-foreground">
        Nothing recorded yet.
      </p>
    )
  }

  return (
    <ol className="flex flex-col px-5 pb-4">
      {events.map((event, index) => (
        <li key={index} className="relative flex gap-3 pb-4 last:pb-0">
          {index < events.length - 1 && (
            <span
              aria-hidden
              className="absolute top-3 left-[3.5px] h-full w-px bg-border"
            />
          )}
          <span
            aria-hidden
            className={`relative mt-[5px] size-2 shrink-0 rounded-full ${eventTone(event.type)}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-foreground">{event.message}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground tabular-nums">
              {new Date(event.createdAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
