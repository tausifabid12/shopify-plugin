import { CreditCard } from "lucide-react"

import { checkoutFeatureSections } from "@/lib/checkout-features"
import { FeatureSectionList } from "@/components/feature-section-list"

const totalFeatures = checkoutFeatureSections.reduce(
  (sum, s) => sum + s.items.length,
  0
)

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
              <CreditCard className="size-4 text-blue-600" />
            </div>
            <h1 className="text-[22px] font-semibold text-foreground">
              Smart Checkout &amp; Payments
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enable payment methods and checkout tools that fit your store.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          {totalFeatures} features
        </span>
      </div>

      {/* Feature sections — rendered client-side to keep icon refs off the boundary */}
      <FeatureSectionList />
    </div>
  )
}
