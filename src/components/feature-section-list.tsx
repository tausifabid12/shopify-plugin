"use client"

import { checkoutFeatureSections } from "@/lib/checkout-features"
import { FeatureToggleCard } from "./feature-toggle-card"

export function FeatureSectionList() {
  return (
    <div className="flex flex-col gap-10">
      {checkoutFeatureSections.map((section) => (
        <section key={section.title} className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
            {section.description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-0 rounded-xl border border-border bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] overflow-hidden">
            {section.items.map((feature, i) => (
              <FeatureToggleCard
                key={feature.id}
                feature={feature}
                isLast={i === section.items.length - 1}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
