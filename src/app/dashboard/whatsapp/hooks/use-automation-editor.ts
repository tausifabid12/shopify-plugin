"use client"

import { useEffect, useState } from "react"

import { createWebhookFlow, fetchWebhookFlow, updateWebhookFlow } from "@/lib/pinggo-api"
import type { AutomationDraft } from "@/lib/workflow/automation-draft"
import { emptyDraft } from "@/lib/workflow/automation-draft"
import { validateDraft } from "@/lib/workflow/draft-validation"
import { buildFlowFromDraft } from "@/lib/workflow/flow-builder"
import { parseFlowToDraft } from "@/lib/workflow/flow-parser"
import { useShopifyAutomations } from "../components/shopify-automation-provider"

/** Normalized recipient field produced by the server for every Shopify topic. */
export const DEFAULT_RECIPIENT_PATH = "shopify.contact.phone"

type LoadState = "loading" | "ready" | "error"

/**
 * Loads a feature's Webhooks V2 message flow into an editable draft and saves
 * it back through the production message-flow API.
 */
export function useAutomationEditor({ featureId, featureTitle }: { featureId: string; featureTitle: string }) {
  const { apiKey, userId, automationsByFeature, triggersByTopic, vendorDetails, loading: contextLoading } =
    useShopifyAutomations()

  const automation = automationsByFeature[featureId]
  const trigger = automation ? triggersByTopic[automation.shopifyTopic] : undefined
  const workflowId = automation?.workflowId

  const [draft, setDraft] = useState<AutomationDraft>(() => emptyDraft(DEFAULT_RECIPIENT_PATH))
  const [flowId, setFlowId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!apiKey || !workflowId) return
    let cancelled = false
    fetchWebhookFlow(apiKey, workflowId)
      .then((flow) => {
        if (cancelled) return
        const parsed = parseFlowToDraft(flow, DEFAULT_RECIPIENT_PATH)
        setFlowId(flow?._id ?? null)
        if (parsed.supported) {
          setDraft(parsed.draft)
          setUnsupportedReason(null)
        } else {
          setUnsupportedReason(parsed.reason)
        }
        setLoadState("ready")
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : "Failed to load the saved automation.")
        setLoadState("error")
      })
    return () => {
      cancelled = true
    }
  }, [apiKey, workflowId])

  // Default the sender to the vendor's first WhatsApp number.
  const primaryBusiness = vendorDetails?.business?.[0]
  const primaryPhone = primaryBusiness?.phoneNumbers?.[0]
  if (loadState === "ready" && !draft.phoneNumberId && primaryBusiness && primaryPhone) {
    setDraft((d) => ({
      ...d,
      businessId: primaryBusiness.businessId,
      phoneNumberId: primaryPhone.phoneNumberId,
      senderPhoneNumber: primaryPhone.phoneNumber,
    }))
  }

  function updateDraft(patch: Partial<AutomationDraft>) {
    setDraft((d) => ({ ...d, ...patch }))
    setSavedAt(null)
  }

  async function save() {
    if (!apiKey || !userId || !workflowId) {
      setSaveError("This automation isn't enabled yet — enable it from the WhatsApp page first.")
      return
    }
    if (unsupportedReason) return

    const validationError = validateDraft(draft)
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const payload = buildFlowFromDraft({
        vendorId: userId,
        workflowId,
        name: featureTitle,
        draft,
        webhookSample: trigger?.sample,
      })

      let id = flowId
      if (!id) {
        // Another tab (or the Pinggo dashboard) may have created the flow meanwhile.
        const existing = await fetchWebhookFlow(apiKey, workflowId)
        id = existing?._id ?? null
      }
      const saved = id ? await updateWebhookFlow(apiKey, id, payload) : await createWebhookFlow(apiKey, payload)
      setFlowId(saved?._id ?? id)
      setSavedAt(new Date())
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save automation.")
    } finally {
      setSaving(false)
    }
  }

  return {
    automation,
    trigger,
    draft,
    updateDraft,
    loading: contextLoading || (Boolean(workflowId) && loadState === "loading"),
    loadError,
    unsupportedReason,
    saving,
    saveError,
    savedAt,
    save,
  }
}
