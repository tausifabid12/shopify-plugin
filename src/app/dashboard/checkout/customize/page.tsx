import { fetchConfig } from "@/lib/checkout/admin-api"

import { ErrorPanel } from "../components/ui"
import { Customizer } from "./customizer"

/**
 * /dashboard/checkout/customize — the checkout builder (§5).
 *
 * Loads the merchant's draft on the server so the customiser opens with their
 * work already in place, then hands over to the client for editing and preview.
 */

export const dynamic = "force-dynamic"

export default async function CustomizeCheckoutPage() {
  let config
  try {
    config = await fetchConfig()
  } catch (err) {
    return (
      <ErrorPanel
        message={
          err instanceof Error
            ? `Could not load your checkout design — ${err.message}`
            : "Could not load your checkout design."
        }
      />
    )
  }

  return <Customizer initial={config} />
}
