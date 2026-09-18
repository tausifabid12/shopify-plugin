import Link from "next/link"

import { fetchSessions } from "@/lib/checkout/admin-api"
import { PAYMENT_METHOD_LABELS } from "@/lib/checkout/types"

import {
  customerLabel,
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

/**
 * /dashboard/checkout/sessions — every checkout, whatever happened to it (§14).
 *
 * The list a merchant opens when a customer says "I tried to order and it
 * didn't work". Each row links to the full timeline.
 */

export const dynamic = "force-dynamic"

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const page = Number(first(params.page) ?? 1) || 1
  const status = first(params.status)
  const search = first(params.search)

  let data
  try {
    data = await fetchSessions({ page, limit: 25, status, search })
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load checkout sessions — ${err.message}`
            : "Could not load checkout sessions."
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Checkout sessions"
        description="Every checkout that started on your store, and where it got to."
      />

      <StatusFilter active={status} />

      <Panel padded={false}>
        {data.items.length === 0 ? (
          <EmptyState
            title="No checkouts yet"
            description="Sessions appear here as soon as shoppers start checking out."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Status</Th>
                  <Th>Method</Th>
                  <Th>Started</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((session) => (
                  <tr key={session._id} className="transition-colors hover:bg-muted/40">
                    <Td>
                      <Link
                        href={`/dashboard/checkout/sessions/${session._id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {customerLabel(session.contact)}
                      </Link>
                    </Td>
                    <Td>
                      <StatusBadge status={session.status} />
                    </Td>
                    <Td>
                      {session.selectedMethod ? (
                        PAYMENT_METHOD_LABELS[session.selectedMethod]
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td>
                      <DateTime value={session.createdAt} />
                    </Td>
                    <Td align="right">
                      <Money
                        amount={session.totals?.total ?? 0}
                        currency={session.currency}
                        strong={session.status === "paid"}
                        muted={session.status !== "paid"}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <Pagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              basePath="/dashboard/checkout/sessions"
              params={{ status, search }}
            />
          </>
        )}
      </Panel>
    </div>
  )
}

const STATUSES = [
  { value: undefined, label: "All" },
  { value: "paid", label: "Paid" },
  { value: "abandoned", label: "Abandoned" },
  { value: "failed", label: "Failed" },
  { value: "active", label: "In progress" },
  { value: "expired", label: "Expired" },
]

function StatusFilter({ active }: { active?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {STATUSES.map((option) => {
        const selected = active === option.value
        const href = option.value
          ? `/dashboard/checkout/sessions?status=${option.value}`
          : "/dashboard/checkout/sessions"

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
  )
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
