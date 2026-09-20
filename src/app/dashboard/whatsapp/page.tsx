"use client"

import { MessageCircle } from "lucide-react"

import { whatsappFeatureSections } from "@/lib/whatsapp-features"
import { FeatureSectionGrid } from "./components/feature-section-grid"
import { TemplatesRequiredBanner } from "./components/templates-required-banner"

const totalFeatures = whatsappFeatureSections.reduce(
  (sum, s) => sum + s.items.length,
  0
)

export default function WhatsAppPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50">
              <MessageCircle className="size-4 text-emerald-600" />
            </div>
            <h1 className="text-[22px] font-semibold text-foreground">
              WhatsApp Notifications
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enable automations to start messaging customers at the right moments.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          {totalFeatures} automations
        </span>
      </div>

      <TemplatesRequiredBanner />

      {/* Feature sections — rendered client-side to keep icon refs off the boundary */}
      <FeatureSectionGrid />
    </div>
  )
}
