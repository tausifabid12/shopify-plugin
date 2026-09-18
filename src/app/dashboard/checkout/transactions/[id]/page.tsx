import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { fetchTransaction } from "@/lib/checkout/admin-api"
import { formatMoney } from "@/lib/checkout/money"
import { PAYMENT_METHOD_LABELS } from "@/lib/checkout/types"

import {
  DateTime,
  ErrorPanel,
  Mono,
  Panel,
  StatusBadge,
} from "../../components/ui"
import { RefundPanel } from "./refund-panel"

/**
 * One transaction in full (§16, §18).
 *
 * Everything a merchant needs to reconcile the payment against their gateway's
 * settlement report, plus the refund controls.
 */

export const dynamic = "force-dynamic"

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let detail
  try {
    detail = await fetchTransaction(id)
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load this transaction — ${err.message}`
            : "Could not load this transaction."
        }
      />
    )
  }

  const { transaction, refunds, order, session } = detail

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/checkout/transactions"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Transactions
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">
              {formatMoney(transaction.amount, transaction.currency)}
            </h1>
            <StatusBadge status={transaction.status} />
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            <span className="capitalize">{transaction.provider}</span> ·{" "}
            {PAYMENT_METHOD_LABELS[transaction.method]} ·{" "}
            <DateTime value={transaction.completedAt ?? transaction.createdAt} />
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-5">
          <Panel>
            <h2 className="text-sm font-semibold text-foreground">
              Gateway references
            </h2>
            <dl className="mt-3 grid gap-2.5 text-[13px] sm:grid-cols-2">
              <Detail label="Payment ID" value={transaction.providerPaymentId} mono />
              <Detail label="Gateway order ID" value={transaction.providerOrderId} mono />
              <Detail
                label="Bank reference (RRN / UTR)"
                value={transaction.providerReferenceId}
                mono
              />
              <Detail
                label="Confirmed via"
                value={transaction.verifiedVia}
              />
              {transaction.feeAmount !== undefined && (
                <Detail
                  label="Gateway fee"
                  value={formatMoney(transaction.feeAmount, transaction.currency)}
                />
              )}
              <Detail label="Environment" value={transaction.environment} />
            </dl>

            {transaction.failureReason && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-[12.5px] text-red-700">
                {transaction.failureReason}
              </p>
            )}
          </Panel>

          <RefundPanel transaction={transaction} refunds={refunds} />
        </div>

        <div className="flex flex-col gap-5">
          <Panel>
            <h2 className="text-sm font-semibold text-foreground">Customer</h2>
            <dl className="mt-3 flex flex-col gap-2 text-[13px]">
              <SideRow label="Phone" value={session?.contact?.phone} />
              <SideRow label="Email" value={session?.contact?.email} />
            </dl>
            {session && (
              <Link
                href={`/dashboard/checkout/sessions/${session._id}`}
                className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline"
              >
                Open checkout →
              </Link>
            )}
          </Panel>

          <Panel>
            <h2 className="text-sm font-semibold text-foreground">Shopify order</h2>
            {order ? (
              <>
                <dl className="mt-3 flex flex-col gap-2 text-[13px]">
                  <SideRow
                    label="Order"
                    value={order.shopifyOrderName ?? "Not created"}
                  />
                </dl>
                {order.syncStatus !== "created" && (
                  <div className="mt-2">
                    <StatusBadge status={order.syncStatus} />
                    {order.lastError && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[12px] text-amber-900">
                        {order.lastError}
                      </p>
                    )}
                    <Link
                      href="/dashboard/checkout/orders"
                      className="mt-2 inline-block text-[13px] font-medium text-primary hover:underline"
                    >
                      Retry in Orders →
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                No order recorded for this payment.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string
  value?: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11.5px] text-muted-foreground">{label}</dt>
      <dd className="break-all">
        {value ? mono ? <Mono>{value}</Mono> : <span className="capitalize">{value}</span> : "—"}
      </dd>
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
