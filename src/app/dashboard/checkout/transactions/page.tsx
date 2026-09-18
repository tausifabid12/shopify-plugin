import Link from "next/link"

import { fetchTransactions } from "@/lib/checkout/admin-api"
import { PAYMENT_METHOD_LABELS } from "@/lib/checkout/types"

import {
  DateTime,
  EmptyState,
  ErrorPanel,
  Money,
  Mono,
  PageHeader,
  Pagination,
  Panel,
  StatusBadge,
  Table,
  Td,
  Th,
} from "../components/ui"

/**
 * /dashboard/checkout/transactions — the money ledger (§16).
 *
 * One row per verified payment. Gateway payment ids and bank references are
 * shown because this is the screen a merchant uses to reconcile against their
 * Razorpay or PhonePe settlement report.
 */

export const dynamic = "force-dynamic"

const STATUSES = [
  { value: undefined, label: "All" },
  { value: "success", label: "Successful" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partly refunded" },
]

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const page = Number(first(params.page) ?? 1) || 1
  const status = first(params.status)
  const search = first(params.search)

  let data
  try {
    data = await fetchTransactions({ page, limit: 25, status, search })
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load transactions — ${err.message}`
            : "Could not load transactions."
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Transactions"
        description="Every verified payment, with the gateway references you need for reconciliation."
      />

      <div className="flex flex-wrap items-center gap-1">
        {STATUSES.map((option) => {
          const selected = status === option.value
          const href = option.value
            ? `/dashboard/checkout/transactions?status=${option.value}`
            : "/dashboard/checkout/transactions"
          return (
            <Link
              key={option.label}
              href={href}
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

      <Panel padded={false}>
        {data.items.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Payments appear here once they're verified with the gateway."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Payment ID</Th>
                  <Th>Gateway</Th>
                  <Th>Method</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((transaction) => (
                  <tr
                    key={transaction._id}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <Td>
                      <Link
                        href={`/dashboard/checkout/transactions/${transaction._id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        <Mono>{transaction.providerPaymentId}</Mono>
                      </Link>
                      {transaction.providerReferenceId && (
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          RRN {transaction.providerReferenceId}
                        </p>
                      )}
                    </Td>
                    <Td className="capitalize">{transaction.provider}</Td>
                    <Td>{PAYMENT_METHOD_LABELS[transaction.method]}</Td>
                    <Td>
                      <StatusBadge status={transaction.status} />
                    </Td>
                    <Td>
                      <DateTime value={transaction.completedAt ?? transaction.createdAt} />
                    </Td>
                    <Td align="right">
                      <Money
                        amount={transaction.amount}
                        currency={transaction.currency}
                        strong
                      />
                      {transaction.amountRefunded > 0 && (
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          −{" "}
                          <Money
                            amount={transaction.amountRefunded}
                            currency={transaction.currency}
                          />{" "}
                          refunded
                        </p>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <Pagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              basePath="/dashboard/checkout/transactions"
              params={{ status, search }}
            />
          </>
        )}
      </Panel>
    </div>
  )
}
