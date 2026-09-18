"use client"

import Link from "next/link"
import { Loader2 } from "lucide-react"

import { InlineAlert } from "@/components/inline-alert"
import { emptyStep, type MessageStep } from "@/lib/workflow/automation-draft"
import { useAutomationEditor } from "../hooks/use-automation-editor"
import { AddFollowUpCard } from "./add-follow-up-card"
import { BackToWhatsappLink } from "./back-to-whatsapp-link"
import { AutomationSaveBar } from "./automation-save-bar"
import { AutomationTriggerStrip } from "./automation-trigger-strip"
import { ConditionsCard } from "./conditions-card"
import { MessageStepEditor } from "./message-step-editor"
import { RecentActivityCard } from "./recent-activity-card"
import { RecipientSettingsCard } from "./recipient-settings-card"
import { useShopifyAutomations } from "./shopify-automation-provider"
import { UnsupportedFlowNotice } from "./unsupported-flow-notice"

interface Props {
  featureId: string
  featureTitle: string
  shopifyTopic?: string
}

export function AutomationSetup({ featureId, featureTitle, shopifyTopic }: Props) {
  const { vendorDetails, error: contextError } = useShopifyAutomations()
  const editor = useAutomationEditor({ featureId, featureTitle })
  const { automation, trigger, draft, updateDraft } = editor
  const variables = trigger?.variables ?? []

  if (!shopifyTopic) {
    return (
      <div className="flex flex-col gap-6">
        <BackToWhatsappLink />
        <InlineAlert>This feature isn&apos;t linked to a Shopify event yet.</InlineAlert>
      </div>
    )
  }

  const setSteps = (steps: MessageStep[]) => updateDraft({ steps })
  const readOnly = Boolean(editor.unsupportedReason)

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <BackToWhatsappLink />
        <h1 className="text-[22px] font-semibold text-foreground">{featureTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose when to send, pick WhatsApp templates and fill them with Shopify data.
        </p>
      </div>

      <AutomationTriggerStrip topic={shopifyTopic} trigger={trigger} automation={automation} />

      {editor.loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : null}

      {!editor.loading && contextError ? <InlineAlert variant="error">{contextError}</InlineAlert> : null}
      {editor.loadError ? <InlineAlert variant="error">{editor.loadError}</InlineAlert> : null}

      {!editor.loading && !contextError && !automation ? (
        <InlineAlert>
          This automation isn&apos;t enabled yet.{" "}
          <Link href="/dashboard/whatsapp" className="font-medium text-primary hover:underline">
            Enable it
          </Link>{" "}
          to configure its messages.
        </InlineAlert>
      ) : null}

      {!editor.loading && automation && !trigger ? (
        <InlineAlert>
          The Shopify event <code className="font-mono">{shopifyTopic}</code> is currently disabled by the
          administrator, so its fields can&apos;t be listed.
        </InlineAlert>
      ) : null}

      {editor.unsupportedReason ? (
        <UnsupportedFlowNotice reason={editor.unsupportedReason} workflowId={automation?.workflowId} />
      ) : null}

      {!editor.loading && automation && !readOnly && !editor.loadError ? (
        <>
          <RecipientSettingsCard
            draft={draft}
            variables={variables}
            vendorDetails={vendorDetails}
            onChange={updateDraft}
          />

          <ConditionsCard draft={draft} variables={variables} onChange={updateDraft} />

          <div className="flex flex-col gap-4">
            {draft.steps.map((step, index) => (
              <MessageStepEditor
                key={step.id}
                step={step}
                index={index}
                removable={draft.steps.length > 1}
                onChange={(next) => setSteps(draft.steps.map((s) => (s.id === step.id ? next : s)))}
                onRemove={() => setSteps(draft.steps.filter((s) => s.id !== step.id))}
                variables={variables}
              />
            ))}
          </div>

          <AddFollowUpCard
            onAdd={() => setSteps([...draft.steps, { ...emptyStep(), delayAmount: 1, delayUnit: "hours" }])}
          />
        </>
      ) : null}

      {automation ? <RecentActivityCard automation={automation} /> : null}

      <AutomationSaveBar
        saving={editor.saving}
        saveError={editor.saveError}
        saved={Boolean(editor.savedAt)}
        disabled={!automation || readOnly || editor.loading || Boolean(editor.loadError)}
        onSave={editor.save}
      />
    </div>
  )
}
