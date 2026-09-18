import Link from "next/link"

import { fetchRefunds } from "@/lib/checkout/admin-api"

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
 * /dashboard/checkout/refunds — every refund issued (§18).
 *
 * Refunds are started from a transaction, so this page is a ledger rather than
 * a workspace: it answers "what have we sent back, and did it land".
 */

export const dynamic = "force-dynamic"

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.page) ? params.page[0] : params.page
  const page = Number(raw ?? 1) || 1

  let data
  try {
    data = await fetchRefunds({ page, limit: 25 })
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load refunds — ${err.message}`
            : "Could not load refunds."
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Refunds"
        description="Money returned to customers. Start a refund from its transaction."
      />

      <Panel padded={false}>
        {data.items.length === 0 ? (
          <EmptyState
            title="No refunds yet"
            description="Open a transaction and use Refund to send money back."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Gateway</Th>
                  <Th>Status</Th>
                  <Th>Reason</Th>
                  <Th>Date</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((refund) => (
                  <tr key={refund._id} className="transition-colors hover:bg-muted/40">
                    <Td>
                      <Link
                        href={`/dashboard/checkout/transactions/${refund.transactionId}`}
                        className="hover:underline"
                      >
                        <Mono>{refund.refundRef}</Mono>
                      </Link>
                      {refund.providerRefundId && (
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {refund.providerRefundId}
                        </p>
                      )}
                    </Td>
                    <Td className="capitalize">{refund.provider}</Td>
                    <Td>
                      <StatusBadge status={refund.status} />
                      {refund.failureReason && (
                        <p className="mt-0.5 max-w-xs text-[11.5px] text-destructive">
                          {refund.failureReason}
                        </p>
                      )}
                    </Td>
                    <Td>
                      {refund.reason || <span className="text-muted-foreground">—</span>}
                    </Td>
                    <Td>
                      <DateTime value={refund.processedAt ?? refund.createdAt} />
                    </Td>
                    <Td align="right">
                      <Money amount={refund.amount} currency={refund.currency} strong />
                      {refund.isFull && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Full</p>
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
              basePath="/dashboard/checkout/refunds"
            />
          </>
        )}
      </Panel>
    </div>
  )
}
