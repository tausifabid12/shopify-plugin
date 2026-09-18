"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertCircle, Loader2, Lock, Pencil, Sparkles } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { FeatureItem } from "@/lib/feature-types"
import { useShopifyAutomations } from "./shopify-automation-provider"

export function FeatureGridCard({ feature }: { feature: FeatureItem }) {
  const { automationsByFeature, triggersByTopic, setAutomationEnabled, loading } =
    useShopifyAutomations()
  const Icon = feature.icon

  const automation = automationsByFeature[feature.id]
  // A Shopify-backed feature is only usable when the admin has enabled its event.
  const unavailable =
    !loading && Boolean(feature.shopifyTopic) && !triggersByTopic[feature.shopifyTopic!]

  // Persisted enabled state: the feature's Webhooks V2 automation is active.
  const persistedEnabled = feature.shopifyTopic ? automation?.status === "active" : false

  // Optimistic local state — starts null (unset) until context loads.
  const [optimisticEnabled, setOptimisticEnabled] = useState<boolean | null>(null)
  const [lastSynced, setLastSynced] = useState<boolean | null>(null)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync local state to server state once loading completes (and after reloads).
  if (!loading && lastSynced !== persistedEnabled) {
    setLastSynced(persistedEnabled)
    setOptimisticEnabled(persistedEnabled)
  }

  const enabled = optimisticEnabled ?? persistedEnabled

  async function handleToggle(checked: boolean) {
    setError(null)

    // No shopify topic — toggle is a pure local UI thing.
    if (!feature.shopifyTopic) {
      setOptimisticEnabled(checked)
      return
    }

    setOptimisticEnabled(checked)
    setToggling(true)

    try {
      await setAutomationEnabled(feature, checked)
    } catch (err) {
      setOptimisticEnabled(!checked)
      setError(err instanceof Error ? err.message : "Failed to save. Try again.")
      console.error("[FeatureGridCard] toggle failed", err)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div
      className={cn(
        "group flex flex-col rounded-xl border bg-card transition-all",
        "shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]",
        enabled
          ? "border-primary/25 shadow-[0_1px_8px_0_rgb(0,128,96,0.10)]"
          : "border-border hover:shadow-[0_4px_12px_0_rgb(0,0,0,0.08)]"
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
            enabled
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-border bg-muted/50 text-muted-foreground"
          )}
        >
          <Icon className="size-4" />
        </div>

        <div className="flex items-center gap-2">
          {toggling && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={toggling || loading || (unavailable && !enabled)}
            aria-label={`Toggle ${feature.title}`}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 px-4 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-sm font-semibold leading-snug text-foreground">
            {feature.title}
          </h3>
          {feature.tag ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {feature.tag}
            </span>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {feature.description}
        </p>

        {/* Inline error */}
        {error ? (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-2">
            <AlertCircle className="mt-px size-3.5 shrink-0 text-destructive" />
            <p className="text-[11px] leading-snug text-destructive">{error}</p>
          </div>
        ) : null}
      </div>

      {/* Footer action */}
      <div className="border-t border-border px-4 py-3">
        {enabled && automation ? (
          <Link
            href={`/dashboard/whatsapp/${feature.id}/setup`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            <Pencil className="size-3.5" />
            Configure message
          </Link>
        ) : unavailable ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5 shrink-0" />
            Not available for your store yet
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0" />
            Enable to configure this automation
          </p>
        )}
      </div>
    </div>
  )
}
