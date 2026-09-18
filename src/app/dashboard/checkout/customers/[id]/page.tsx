import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { fetchCustomer } from "@/lib/checkout/admin-api"
import { formatMoney } from "@/lib/checkout/money"
import { PAYMENT_METHOD_LABELS } from "@/lib/checkout/types"

import {
  customerLabel,
  DateTime,
  ErrorPanel,
  Money,
  Panel,
  StatusBadge,
  Table,
  Td,
  Th,
} from "../../components/ui"

/** One shopper: what they've bought, and the addresses they check out to. */

export const dynamic = "force-dynamic"

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let detail
  try {
    detail = await fetchCustomer(id)
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load this customer — ${err.message}`
            : "Could not load this customer."
        }
      />
    )
  }

  const { customer, sessions } = detail
  const paid = sessions.filter((s) => s.status === "paid")

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/checkout/customers"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">
            {customerLabel(customer)}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {customer.phone ?? customer.email ?? "No contact on file"} · first seen{" "}
            <DateTime value={customer.createdAt} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-[20px] font-semibold text-foreground">
            {formatMoney(customer.totalSpent)}
          </p>
          <p className="text-[12px] text-muted-foreground">
            across {customer.totalOrders}{" "}
            {customer.totalOrders === 1 ? "order" : "orders"}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Panel padded={false}>
          <h2 className="px-5 py-3.5 text-sm font-semibold text-foreground">
            Checkouts
          </h2>
          {sessions.length === 0 ? (
            <p className="px-5 pb-4 text-[13px] text-muted-foreground">
              No checkouts recorded.
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th>Method</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session._id} className="transition-colors hover:bg-muted/40">
                    <Td>
                      <Link
                        href={`/dashboard/checkout/sessions/${session._id}`}
                        className="hover:underline"
                      >
                        <DateTime value={session.createdAt} />
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
          )}
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel>
            <h2 className="text-sm font-semibold text-foreground">Saved addresses</h2>
            {customer.savedAddresses.length === 0 ? (
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                None yet — addresses are saved after a successful order.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {customer.savedAddresses.map((address, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-border px-3 py-2.5 text-[13px] leading-relaxed"
                  >
                    {[
                      address.address1,
                      address.address2,
                      [address.city, address.zip].filter(Boolean).join(" "),
                      address.province,
                    ]
                      .filter(Boolean)
                      .map((line, i) => (
                        <span key={i} className="block">
                          {line}
                        </span>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <h2 className="text-sm font-semibold text-foreground">Summary</h2>
            <dl className="mt-3 flex flex-col gap-2 text-[13px]">
              <Row label="Paid checkouts" value={String(paid.length)} />
              <Row label="Total checkouts" value={String(sessions.length)} />
              <Row
                label="Average order"
                value={
                  customer.totalOrders > 0
                    ? formatMoney(
                        Math.round(customer.totalSpent / customer.totalOrders)
                      )
                    : "—"
                }
              />
              <Row label="Last seen" value="" />
              <dd className="-mt-2 text-right text-[13px] font-medium">
                <DateTime value={customer.lastSeenAt} />
              </dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
