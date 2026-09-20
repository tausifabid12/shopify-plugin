"use client"

import * as React from "react"
import { Check, CloudUpload, Loader2, RotateCcw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CheckoutConfigPayload, CheckoutConfigState } from "@/lib/checkout/types"
import { cn } from "@/lib/utils"

import {
  discardDraftAction,
  publishAction,
  saveDraftAction,
} from "../actions"
import { PreviewPane } from "./preview-pane"
import { SettingsPanel } from "./settings-panel"

/**
 * Checkout customiser (§5).
 *
 * Draft/published is the whole safety model: edits land in the draft, the
 * preview renders the draft, and shoppers keep seeing `published` until the
 * merchant deliberately pushes the button. Nobody breaks their live checkout by
 * dragging a colour slider.
 *
 * The draft autosaves on idle so work is never lost to a closed tab, but
 * autosaving is explicitly NOT publishing — the two are different verbs and the
 * UI keeps them visibly apart.
 */

const AUTOSAVE_DELAY_MS = 1200

type SaveState = "idle" | "saving" | "saved" | "error"

export function Customizer({ initial }: { initial: CheckoutConfigState }) {
  const [draft, setDraft] = React.useState<CheckoutConfigPayload>(initial.draft)
  const [publishedSnapshot, setPublishedSnapshot] = React.useState(initial.published)
  const [saveState, setSaveState] = React.useState<SaveState>("idle")
  const [error, setError] = React.useState<string | null>(null)
  const [publishing, setPublishing] = React.useState(false)
  const [justPublished, setJustPublished] = React.useState(false)

  // Skips the autosave that would otherwise fire from the initial render.
  const hydrated = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const hasUnpublished = React.useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(publishedSnapshot),
    [draft, publishedSnapshot]
  )

  // ── Autosave the draft ──────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }

    if (timer.current) clearTimeout(timer.current)
    setSaveState("saving")
    setJustPublished(false)

    timer.current = setTimeout(async () => {
      const result = await saveDraftAction(draft)
      if (result.ok) {
        setSaveState("saved")
        setError(null)
      } else {
        setSaveState("error")
        setError(result.error)
      }
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [draft])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleChange = React.useCallback((patch: Partial<CheckoutConfigPayload>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }, [])

  const handlePublish = React.useCallback(async () => {
    setPublishing(true)
    setError(null)

    // Flush any pending autosave first, or we would publish the last saved
    // draft rather than what the merchant is looking at.
    if (timer.current) clearTimeout(timer.current)
    const saved = await saveDraftAction(draft)
    if (!saved.ok) {
      setPublishing(false)
      setError(saved.error)
      return
    }

    const result = await publishAction()
    setPublishing(false)

    if (result.ok) {
      setPublishedSnapshot(draft)
      setSaveState("saved")
      setJustPublished(true)
    } else {
      setError(result.error)
    }
  }, [draft])

  const handleDiscard = React.useCallback(async () => {
    if (!publishedSnapshot) return
    setError(null)
    const result = await discardDraftAction()
    if (result.ok) {
      setDraft(result.data.draft)
      setSaveState("idle")
    } else {
      setError(result.error)
    }
  }, [publishedSnapshot])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    // Fills the viewport minus the dashboard's own padding, so the preview gets
    // every pixel it can. The section nav sits in the sidebar, not above this.
    <div className="flex h-[calc(100svh-5rem)] min-h-136 flex-col overflow-hidden rounded-xl border border-border bg-white">
      {/* Save bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Checkout customization
          </h2>
          <SaveIndicator state={saveState} justPublished={justPublished} />
        </div>

        <div className="flex items-center gap-2">
          {hasUnpublished && publishedSnapshot && (
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              <RotateCcw />
              Discard changes
            </Button>
          )}
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing || (!hasUnpublished && Boolean(publishedSnapshot))}
          >
            {publishing ? <Loader2 className="animate-spin" /> : <CloudUpload />}
            {publishedSnapshot ? "Publish changes" : "Publish checkout"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex shrink-0 items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-900">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!publishedSnapshot && (
        <div className="shrink-0 border-b border-border bg-muted/40 px-4 py-2.5 text-[12px] text-muted-foreground">
          Your checkout isn&apos;t live yet. Publish it here, then turn on the
          storefront takeover from the checkout overview.
        </div>
      )}

      {/* Two-pane body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="min-h-0 overflow-y-auto border-b border-border lg:border-r lg:border-b-0">
          <SettingsPanel config={draft} onChange={handleChange} />
        </div>

        <PreviewPane config={draft} className="min-h-0" />
      </div>
    </div>
  )
}

function SaveIndicator({
  state,
  justPublished,
}: {
  state: SaveState
  justPublished: boolean
}) {
  if (justPublished) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
        <Check className="size-3.5" />
        Published — shoppers see this now
      </span>
    )
  }

  const map: Record<SaveState, { label: string; className: string } | null> = {
    idle: null,
    saving: { label: "Saving draft…", className: "text-muted-foreground" },
    saved: { label: "Draft saved", className: "text-muted-foreground" },
    error: { label: "Couldn't save", className: "text-destructive" },
  }

  const current = map[state]
  if (!current) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-medium",
        current.className
      )}
    >
      {state === "saving" && <Loader2 className="size-3 animate-spin" />}
      {current.label}
    </span>
  )
}
