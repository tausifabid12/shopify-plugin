"use client"

import { useState } from "react"
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

import { DynamicMessageStepEditor } from "@/components/dynamic-message-step-editor"
import { useShopifyDefinitions } from "@/components/shopify-definitions-provider"
import { saveNotificationConfig } from "@/lib/pinggo-api"
import { createStep, type MessageStep } from "@/lib/automation"
import type { IVariableDefinition } from "@/lib/pinggo-api"

interface Props {
    featureTitle: string
    shopifyTopic?: string
}

export function DynamicAutomationSetup({ featureTitle, shopifyTopic }: Props) {
    const { definitionByTopic, loading, error, apiKey, notificationConfigs, reload } =
        useShopifyDefinitions()

    const [steps, setSteps] = useState<MessageStep[]>([
        {
            id: "step-primary",
            templateId: "custom",
            body: "",
            timing: "immediately",
            customValue: "1",
            customUnit: "hours",
        },
    ])
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    const definition = shopifyTopic ? definitionByTopic[shopifyTopic] : undefined
    const variables: IVariableDefinition[] = definition?.variables ?? []

    const existingConfig = shopifyTopic
        ? notificationConfigs.find((c) => c.shopifyTopic === shopifyTopic)
        : undefined

    function updateStep(id: string, next: MessageStep) {
        setSteps((cur) => cur.map((s) => (s.id === id ? next : s)))
    }

    function addFollowUp() {
        setSteps((cur) => [
            ...cur,
            { ...createStep(cur.length), body: "", templateId: "custom" },
        ])
    }

    function removeStep(id: string) {
        setSteps((cur) => cur.filter((s) => s.id !== id))
    }

    async function handleSave() {
        if (!shopifyTopic || !definition || !apiKey) {
            setSaveError("Missing configuration — ensure this feature has a Shopify topic.")
            return
        }
        setSaving(true)
        setSaveError(null)
        try {
            await saveNotificationConfig(apiKey, {
                webhookDefinitionId: definition._id,
                shopifyTopic,
                enabled: true,
                messageTemplate: steps[0]?.body ?? "",
                phoneNumberId: existingConfig?.phoneNumberId,
            })
            reload()
            setSaved(true)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to save automation."
            setSaveError(msg)
        } finally {
            setSaving(false)
        }
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
                    Configure the message template and timing for this automation.
                </p>
            </div>

            {/* Trigger info strip */}
            {shopifyTopic && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Webhook className="size-4 shrink-0" />
                        Triggered by
                    </div>
                    <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                        {shopifyTopic}
                    </code>
                    {definition && (
                        <span className="ml-auto inline-flex items-center rounded-full bg-[#008060]/10 px-2.5 py-0.5 text-xs font-medium text-[#008060]">
                            {variables.length} variables
                        </span>
                    )}
                    {!definition && !loading && (
                        <span className="ml-auto inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            No definition configured
                        </span>
                    )}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading available variables…
                </div>
            )}

            {/* API error */}
            {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {error} — Variables may be limited.
                </div>
            )}

            {/* Steps */}
            <div className="flex flex-col gap-4">
                {steps.map((step, index) => (
                    <DynamicMessageStepEditor
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
                        disabled={saving}
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
