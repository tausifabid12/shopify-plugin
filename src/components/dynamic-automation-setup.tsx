"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  Loader2,
  Plus,
  Save,
  Webhook,
} from "lucide-react"

import { MessageStepEditor } from "@/components/message-step-editor"
import { useShopifyDefinitions } from "@/components/shopify-definitions-provider"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createWebhookFlow,
  updateWebhookFlow,
  fetchWebhookFlow,
  type IWebhookFlow,
} from "@/lib/pinggo-api"
import {
  buildFlowFromSteps,
  emptyStep,
  stepsFromFlow,
  type MessageStep,
} from "@/lib/automation"
import { flattenSampleVariables, getShopifyTopicSample } from "@/lib/shopify-topics"

interface Props {
  featureTitle: string
  shopifyTopic?: string
}

export function DynamicAutomationSetup({ featureTitle, shopifyTopic }: Props) {
  const { apiKey, userId, shopifyWebhooksByTopic, loading, error, vendorDetails } =
    useShopifyDefinitions()

  const [steps, setSteps] = useState<MessageStep[]>([emptyStep()])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [flow, setFlow] = useState<IWebhookFlow | null>(null)
  const [recipientPath, setRecipientPath] = useState("customer.phone")

  const webhook = shopifyTopic ? shopifyWebhooksByTopic[shopifyTopic] : undefined
  const workflowId = webhook?.workflowId

  // Variables derived from the Shopify topic sample payload.
  const sample = shopifyTopic ? getShopifyTopicSample(shopifyTopic) : undefined
  const variables = sample ? flattenSampleVariables(sample) : []

  // Resolve sender account from the vendor's WhatsApp details.
  const primaryBusiness = vendorDetails?.business?.[0]
  const primaryPhone = primaryBusiness?.phoneNumbers?.[0]

  // Load existing flow once we know the workflow id.
  useEffect(() => {
    if (!apiKey || !workflowId) return
    let cancelled = false
    fetchWebhookFlow(apiKey, workflowId)
      .then((existing) => {
        if (cancelled) return
        setFlow(existing)
        if (existing?.nodes?.length) {
          setSteps(stepsFromFlow(existing))
        }
        const existingPhone = (existing?.contactSettings as Record<string, unknown>)?.contactPhoneNumber
        if (typeof existingPhone === "string" && existingPhone) {
          setRecipientPath(existingPhone)
        }
      })
      .catch(() => {
        if (!cancelled) setFlow(null)
      })
    return () => {
      cancelled = true
    }
  }, [apiKey, workflowId])

  function updateStep(id: string, next: MessageStep) {
    setSteps((cur) => cur.map((s) => (s.id === id ? next : s)))
  }

  function addFollowUp() {
    setSteps((cur) => [...cur, emptyStep()])
  }

  function removeStep(id: string) {
    setSteps((cur) => cur.filter((s) => s.id !== id))
  }

  async function handleSave() {
    if (!shopifyTopic || !apiKey || !userId || !workflowId) {
      setSaveError("Missing configuration — this automation isn't linked to a webhook yet.")
      return
    }

    const missingTemplate = steps.find((s) => !s.templateId)
    if (missingTemplate) {
      setSaveError("Select a WhatsApp template for every message.")
      return
    }

    if (!primaryBusiness?.businessId || !primaryPhone?.phoneNumberId) {
      setSaveError("No WhatsApp sender account configured. Connect a phone number in Pinggo first.")
      return
    }

    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const payload = buildFlowFromSteps({
        vendorId: userId,
        workflowId,
        name: featureTitle,
        steps,
        contactSettings: {
          businessId: primaryBusiness.businessId,
          phoneNumberId: primaryPhone.phoneNumberId,
          senderPhoneNumber: primaryPhone.phoneNumber,
          contactPhoneNumber: recipientPath,
          hasCountryCode: false,
          codeType: "isd",
          selectedCountry: "",
          webhookSample: sample,
        },
      })

      if (flow?._id) {
        await updateWebhookFlow(apiKey, flow._id, payload)
      } else {
        await createWebhookFlow(apiKey, payload)
      }
      setSaved(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save automation."
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!shopifyTopic) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard/whatsapp"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to WhatsApp
        </Link>
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          This feature isn&apos;t linked to a Shopify webhook yet.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <Link
          href="/dashboard/whatsapp"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to WhatsApp
        </Link>
        <h1 className="text-[22px] font-semibold text-foreground">{featureTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a WhatsApp template and map its variables to Shopify webhook fields.
        </p>
      </div>

      {/* Trigger info strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Webhook className="size-4 shrink-0" />
          Triggered by
        </div>
        <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
          {shopifyTopic}
        </code>
        <span className="ml-auto inline-flex items-center rounded-full bg-[#008060]/10 px-2.5 py-0.5 text-xs font-medium text-[#008060]">
          {variables.length} webhook fields
        </span>
      </div>

      {/* Recipient phone field */}
      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-white px-4 py-3 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <Label className="text-sm font-medium">Recipient phone number field</Label>
        <p className="text-xs text-muted-foreground">
          The webhook field that contains the customer&apos;s WhatsApp number.
        </p>
        <Select value={recipientPath} onValueChange={(v) => v && setRecipientPath(v)}>
          <SelectTrigger className="h-9 w-full bg-white shadow-none">
            <SelectValue placeholder="Select a phone field" />
          </SelectTrigger>
          <SelectContent>
            {variables
              .filter((v) => v.path.toLowerCase().includes("phone"))
              .map((v) => (
                <SelectItem key={v.path} value={v.path}>
                  {`{{${v.path}}}`}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      )}

      {/* API error */}
      {!loading && error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Steps */}
      <div className="flex flex-col gap-4">
        {steps.map((step, index) => (
          <MessageStepEditor
            key={step.id}
            step={step}
            index={index}
            removable={steps.length > 1}
            onChange={(next) => updateStep(step.id, next)}
            onRemove={() => removeStep(step.id)}
            variables={variables}
          />
        ))}
      </div>

      {/* Add follow-up */}
      <div className="rounded-xl border border-dashed border-border bg-white px-5 py-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
        <p className="text-sm font-medium text-foreground">Follow-up messages</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Add a second or third message to nudge customers who haven&apos;t responded.
        </p>
        <button
          type="button"
          onClick={addFollowUp}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
        >
          <Plus className="size-4" />
          Add follow-up
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border pt-5">
        <Link
          href="/dashboard/whatsapp"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
        >
          <ArrowLeft className="size-4" />
          Cancel
        </Link>

        <div className="flex items-center gap-3">
          {saveError && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {saveError}
            </p>
          )}
          {saved && !saveError && (
            <p className="text-sm text-[#008060]">Saved successfully</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !workflowId}
            className="inline-flex items-center gap-2 rounded-lg bg-[#008060] px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#006e52] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Saving…" : "Save automation"}
          </button>
        </div>
      </div>
    </div>
  )
}
