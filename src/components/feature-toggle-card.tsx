"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import type { FeatureItem } from "@/lib/feature-types"

export function FeatureToggleCard({
  feature,
  isLast = false,
}: {
  feature: FeatureItem
  isLast?: boolean
}) {
  const [enabled, setEnabled] = useState(feature.enabled ?? false)
  const Icon = feature.icon

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-5 py-4 transition-colors",
        !isLast && "border-b border-border",
        enabled && "bg-[#f1fdf8]"
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
            enabled
              ? "border-[#008060]/20 bg-[#008060]/10 text-[#008060]"
              : "border-border bg-muted/50 text-muted-foreground"
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{feature.title}</span>
            {feature.tag ? (
              <span className="inline-flex items-center rounded-full bg-[#008060]/10 px-2 py-0.5 text-[11px] font-medium text-[#008060]">
                {feature.tag}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground leading-snug">{feature.description}</p>
        </div>
      </div>

      <Switch
        checked={enabled}
        onCheckedChange={setEnabled}
        aria-label={`Toggle ${feature.title}`}
        className="shrink-0 data-[state=checked]:bg-[#008060]"
      />
    </div>
  )
}
