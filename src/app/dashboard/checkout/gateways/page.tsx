import { fetchCredentials, fetchOverview } from "@/lib/checkout/admin-api"

import { ErrorPanel, PageHeader } from "../components/ui"
import { GatewaysClient } from "./gateways-client"

/**
 * /dashboard/checkout/gateways — connect Razorpay and PhonePe (§8).
 */

export const dynamic = "force-dynamic"

export default async function GatewaysPage() {
  let credentials
  let environment: "test" | "live" = "test"

  try {
    const [creds, overview] = await Promise.all([fetchCredentials(), fetchOverview()])
    credentials = creds
    environment = overview.environment
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load your gateways — ${err.message}`
            : "Could not load your gateways."
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Payment gateways"
        description="Connect your own Razorpay and PhonePe accounts. Payouts go straight to you — we never hold your money."
      />
      <GatewaysClient initial={credentials} activeEnvironment={environment} />
    </div>
  )
}
