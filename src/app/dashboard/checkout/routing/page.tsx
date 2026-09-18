import { fetchOverview, fetchRouting } from "@/lib/checkout/admin-api"

import { ErrorPanel, PageHeader } from "../components/ui"
import { RoutingClient } from "./routing-client"

/**
 * /dashboard/checkout/routing — which gateway serves which payment method (§11).
 */

export const dynamic = "force-dynamic"

export default async function RoutingPage() {
  let overview
  let routing

  try {
    overview = await fetchOverview()
    routing = await fetchRouting(overview.environment)
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load payment routing — ${err.message}`
            : "Could not load payment routing."
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Payment routing"
        description={`Customers choose how to pay; you choose who processes it. Editing ${routing.environment} mode.`}
      />
      <RoutingClient
        overview={overview}
        initialRules={routing.rules}
        environment={routing.environment}
      />
    </div>
  )
}
