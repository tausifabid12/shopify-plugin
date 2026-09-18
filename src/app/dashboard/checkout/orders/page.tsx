import Link from "next/link"

import { fetchOrders } from "@/lib/checkout/admin-api"

import {
  DateTime,
  EmptyState,
  ErrorPanel,
  Money,
  PageHeader,
  Pagination,
  Panel,
  StatusBadge,
  Table,
  Td,
  Th,
} from "../components/ui"
import { RetryButton } from "./retry-button"

/**
 * /dashboard/checkout/orders — orders written into Shopify after payment (§17).
 *
 * Failed rows are the point of this page. A payment we captured but couldn't
 * turn into a Shopify order is the one state in the whole platform that needs a
 * human, so those are surfaced first and given a retry control.
 */

export const dynamic = "force-dynamic"

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const page = Number(first(params.page) ?? 1) || 1
  const status = first(params.status)

  let data
  try {
    data = await fetchOrders({ page, limit: 25, status })
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load orders — ${err.message}`
            : "Could not load orders."
        }
      />
    )
  }

  const failed = data.items.filter((o) => o.syncStatus === "failed")

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Orders"
        description="Paid checkouts, and whether they made it into Shopify."
      />

      {failed.length > 0 && !status && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <path
              d="M12 9v4.5M12 17h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <p className="font-medium">
              {failed.length} paid {failed.length === 1 ? "order" : "orders"} on this
              page couldn&apos;t be created in Shopify
            </p>
            <p className="mt-0.5 text-[13px]">
              The customers were charged. Fix what Shopify rejected, then retry.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {[
          { value: undefined, label: "All" },
          { value: "created", label: "Created" },
          { value: "failed", label: "Failed" },
          { value: "pending", label: "Pending" },
        ].map((option) => {
          const selected = status === option.value
          const href = option.value
            ? `/dashboard/checkout/orders?status=${option.value}`
            : "/dashboard/checkout/orders"
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
            title="No orders yet"
            description="Orders are created in Shopify once a payment is verified."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => (
                  <tr key={order._id} className="transition-colors hover:bg-muted/40">
                    <Td>
                      {order.shopifyOrderName ? (
                        <span className="font-medium">{order.shopifyOrderName}</span>
                      ) : (
                        <span className="text-muted-foreground">Not created</span>
                      )}
                      <p className="mt-0.5">
                        <Link
                          href={`/dashboard/checkout/sessions/${order.sessionId}`}
                          className="text-[11.5px] text-muted-foreground hover:underline"
                        >
                          View checkout
                        </Link>
                      </p>
                      {order.lastError && (
                        <p className="mt-1 max-w-md text-[11.5px] text-amber-700">
                          {order.lastError}
                        </p>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={order.syncStatus} />
                      {order.attempts > 1 && (
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {order.attempts} tries
                        </span>
                      )}
                    </Td>
                    <Td>
                      <DateTime value={order.createdAt} />
                    </Td>
                    <Td align="right">
                      <Money amount={order.amount} currency={order.currency} strong />
                    </Td>
                    <Td align="right">
                      {order.syncStatus !== "created" && <RetryButton id={order._id} />}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <Pagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              basePath="/dashboard/checkout/orders"
              params={{ status }}
            />
          </>
        )}
      </Panel>
    </div>
  )
}
