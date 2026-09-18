import Link from "next/link"

import { fetchAbandoned } from "@/lib/checkout/admin-api"
import { formatMoney } from "@/lib/checkout/money"
import { PAYMENT_METHOD_LABELS } from "@/lib/checkout/types"

import {
  customerLabel,
  EmptyState,
  ErrorPanel,
  Money,
  PageHeader,
  Pagination,
  Panel,
  Table,
  Td,
  Th,
} from "../components/ui"
import { RelativeTime } from "./relative-time"

/**
 * /dashboard/checkout/abandoned — shoppers who got far enough to leave a
 * contact detail but didn't pay (§15).
 *
 * Deliberately only shows sessions carrying a phone or email. A list padded
 * with anonymous bounces has no recovery value and makes the whole feature feel
 * untrustworthy.
 *
 * Recovery messaging (WhatsApp, SMS, email) is intentionally not wired here —
 * it belongs with the automation engine, not the payment spine.
 */

export const dynamic = "force-dynamic"

export default async function AbandonedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.page) ? params.page[0] : params.page
  const page = Number(raw ?? 1) || 1

  let data
  try {
    data = await fetchAbandoned({ page, limit: 25 })
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load abandoned checkouts — ${err.message}`
            : "Could not load abandoned checkouts."
        }
      />
    )
  }

  const recoverable = data.items.reduce((sum, s) => sum + (s.totals?.total ?? 0), 0)
  const currency = data.items[0]?.currency ?? "INR"

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Abandoned checkouts"
        description="Shoppers who started checking out, left a contact detail, and didn't finish."
      />

      {data.items.length > 0 && (
        <Panel>
          <p className="text-[13px] text-muted-foreground">
            {/* Proportional figures: this is a standalone display number, not a
                column that has to align vertically. */}
            <span className="text-[17px] font-semibold text-foreground">
              {formatMoney(recoverable, currency)}
            </span>{" "}
            across {data.total.toLocaleString("en-IN")} abandoned{" "}
            {data.total === 1 ? "checkout" : "checkouts"} on this page&apos;s range.
          </p>
        </Panel>
      )}

      <Panel padded={false}>
        {data.items.length === 0 ? (
          <EmptyState
            title="Nothing abandoned"
            description="Checkouts that go quiet for 30 minutes show up here."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Contact</Th>
                  <Th>Cart</Th>
                  <Th>Method</Th>
                  <Th>Abandoned</Th>
                  <Th align="right">Value</Th>
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
                      {session.attribution?.source && (
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          via {session.attribution.source}
                          {session.attribution.campaign
                            ? ` · ${session.attribution.campaign}`
                            : ""}
                        </p>
                      )}
                    </Td>
                    <Td>
                      <span className="text-[12.5px]">
                        {session.contact?.phone || session.contact?.email || "—"}
                      </span>
                    </Td>
                    <Td>
                      {session.items?.length ? (
                        <span className="text-[12.5px]">
                          {session.items[0].title}
                          {session.items.length > 1 && (
                            <span className="text-muted-foreground">
                              {" "}
                              +{session.items.length - 1} more
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td>
                      {session.selectedMethod ? (
                        PAYMENT_METHOD_LABELS[session.selectedMethod]
                      ) : (
                        <span className="text-muted-foreground">Not chosen</span>
                      )}
                    </Td>
                    <Td>
                      <RelativeTime value={session.abandonedAt ?? session.lastActivityAt} />
                    </Td>
                    <Td align="right">
                      <Money
                        amount={session.totals?.total ?? 0}
                        currency={session.currency}
                        strong
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
              basePath="/dashboard/checkout/abandoned"
            />
          </>
        )}
      </Panel>
    </div>
  )
}

