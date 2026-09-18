import { Webhook } from "lucide-react"

import type { IShopifyAutomation, IShopifyTrigger } from "@/lib/shopify-app-api"
import { cn } from "@/lib/utils"

/** Shows which Shopify event triggers the automation and whether it is live. */
export function AutomationTriggerStrip({
  topic,
  trigger,
  automation,
}: {
  topic: string
  trigger?: IShopifyTrigger
  automation?: IShopifyAutomation
}) {
  const active = automation?.status === "active"

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Webhook className="size-4 shrink-0" />
        Triggered by
      </div>
      <span className="text-sm font-medium text-foreground">{trigger?.name ?? topic}</span>
      <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-foreground">{topic}</code>
      <div className="ml-auto flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {trigger?.variables.length ?? 0} Shopify fields
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <span className={cn("size-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground")} />
          {active ? "Live" : "Paused"}
        </span>
      </div>
    </div>
  )
}
