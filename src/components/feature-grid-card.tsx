"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, Loader2, Pencil, Sparkles } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { FeatureItem } from "@/lib/feature-types"
import { useShopifyDefinitions } from "@/components/shopify-definitions-provider"
import { saveNotificationConfig } from "@/lib/pinggo-api"

export function FeatureGridCard({ feature }: { feature: FeatureItem }) {
  const { notificationConfigs, definitionByTopic, apiKey, loading, reload } =
    useShopifyDefinitions()
  const Icon = feature.icon

  // Derive the persisted enabled state from the loaded configs
  const persistedEnabled = feature.shopifyTopic
    ? (notificationConfigs.find((c) => c.shopifyTopic === feature.shopifyTopic)?.enabled ?? false)
    : false

  // Optimistic local state — starts as null (unset) until context loads
  const [optimisticEnabled, setOptimisticEnabled] = useState<boolean | null>(null)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Once context finishes loading, sync local state to server state
  useEffect(() => {
    if (!loading) {
      setOptimisticEnabled(persistedEnabled)
    }
  }, [loading, persistedEnabled])

  // What the UI actually shows
  const enabled = optimisticEnabled ?? persistedEnabled

  async function handleToggle(checked: boolean) {
    setError(null)

    // No shopify topic — toggle is a pure local UI thing
    if (!feature.shopifyTopic) {
      setOptimisticEnabled(checked)
      return
    }

    // No API key — we're not connected yet
    if (!apiKey) {
      setError("Not connected to PingGo.")
      return
    }

    // Definitions haven't loaded yet or this topic has no definition configured
    const definition = definitionByTopic[feature.shopifyTopic]
    if (!definition) {
      setError("No webhook definition found for this feature. Contact support.")
      return
    }

    // Flip optimistically immediately so the UI responds
    setOptimisticEnabled(checked)
    setToggling(true)

    try {
      const existingConfig = notificationConfigs.find(
        (c) => c.shopifyTopic === feature.shopifyTopic
      )
      await saveNotificationConfig(apiKey, {
        webhookDefinitionId: definition._id,
        shopifyTopic: feature.shopifyTopic,
        enabled: checked,
        messageTemplate: existingConfig?.messageTemplate ?? "",
        phoneNumberId: existingConfig?.phoneNumberId,
      })
      reload()
    } catch (err) {
      // Roll back the optimistic flip
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
        "group flex flex-col rounded-xl border bg-white transition-all",
        "shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]",
        enabled
          ? "border-[#008060]/25 shadow-[0_1px_8px_0_rgb(0,128,96,0.10)]"
          : "border-border hover:shadow-[0_4px_12px_0_rgb(0,0,0,0.08)]"
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
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

        <div className="flex items-center gap-2">
          {toggling && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={toggling || loading}
            aria-label={`Toggle ${feature.title}`}
            className="data-[state=checked]:bg-[#008060]"
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
            <span className="inline-flex items-center rounded-full bg-[#008060]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#008060]">
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
        {enabled ? (
          <Link
            href={`/dashboard/whatsapp/${feature.id}/setup`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#008060] transition-colors hover:text-[#006e52]"
          >
            <Pencil className="size-3.5" />
            Configure message
          </Link>
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
