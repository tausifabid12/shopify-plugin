import { fetchOverview } from "@/lib/checkout/admin-api"

import { ErrorPanel, PageHeader } from "./components/ui"
import { OverviewClient } from "./overview-client"

/**
 * /dashboard/checkout — the checkout platform's home.
 *
 * One call to `/checkout/overview` carries everything this page needs:
 * environment, storefront switch, gateway status, routing and any stuck orders.
 */

export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  let overview
  try {
    overview = await fetchOverview()
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load your checkout — ${err.message}`
            : "Could not load your checkout."
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Overview"
        description="Your own branded checkout, with Razorpay and PhonePe underneath."
      />
      <OverviewClient initial={overview} />
    </div>
  )
}
