import { fetchOffers, fetchOverview } from "@/lib/checkout/admin-api"

import { ErrorPanel, PageHeader } from "../components/ui"
import { OffersClient } from "./offers-client"

/**
 * /dashboard/checkout/offers — the merchant side of the rules engine (§24).
 */

export const dynamic = "force-dynamic"

export default async function OffersPage() {
  let offers
  let environment: "test" | "live" = "test"

  try {
    const overview = await fetchOverview()
    environment = overview.environment
    offers = await fetchOffers(environment)
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load offers — ${err.message}`
            : "Could not load offers."
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Offers"
        description="Discount codes, automatic discounts, and the pay-online incentive that moves orders off cash on delivery."
      />
      <OffersClient initial={offers} environment={environment} />
    </div>
  )
}
