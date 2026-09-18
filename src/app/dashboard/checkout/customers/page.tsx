import Link from "next/link"

import { fetchCustomers } from "@/lib/checkout/admin-api"

import {
  customerLabel,
  DateTime,
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

/**
 * /dashboard/checkout/customers — shoppers, deduplicated by phone (§25).
 *
 * Ours rather than Shopify's, because we meet them at the checkout — often
 * before any Shopify customer record exists. The totals here count orders
 * placed through this checkout, not the store's whole history, which is why
 * they can differ from Shopify's own customer figures.
 */

export const dynamic = "force-dynamic"

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const page = Number(first(params.page) ?? 1) || 1
  const search = first(params.search)

  let data
  try {
    data = await fetchCustomers({ page, limit: 25, search })
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load customers — ${err.message}`
            : "Could not load customers."
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Customers"
        description="Everyone who has reached your checkout, with what they've spent through it."
      />

      <Panel padded={false}>
        {data.items.length === 0 ? (
          <EmptyState
            title="No customers yet"
            description="Shoppers appear here as soon as they enter a phone number at checkout."
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Contact</Th>
                  <Th>Saved addresses</Th>
                  <Th align="right">Orders</Th>
                  <Th align="right">Spent</Th>
                  <Th>Last seen</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((customer) => (
                  <tr key={customer._id} className="transition-colors hover:bg-muted/40">
                    <Td>
                      <Link
                        href={`/dashboard/checkout/customers/${customer._id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {customerLabel(customer)}
                      </Link>
                    </Td>
                    <Td>
                      <span className="text-[12.5px]">
                        {customer.phone || customer.email || "—"}
                      </span>
                    </Td>
                    <Td>
                      {customer.savedAddresses.length > 0 ? (
                        <span className="text-[12.5px]">
                          {customer.savedAddresses[0].city ?? "—"}
                          {customer.savedAddresses.length > 1 && (
                            <span className="text-muted-foreground">
                              {" "}
                              +{customer.savedAddresses.length - 1}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td align="right">{customer.totalOrders}</Td>
                    <Td align="right">
                      <Money amount={customer.totalSpent} strong />
                    </Td>
                    <Td>
                      <DateTime value={customer.lastSeenAt} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <Pagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              basePath="/dashboard/checkout/customers"
              params={{ search }}
            />
          </>
        )}
      </Panel>
    </div>
  )
}
