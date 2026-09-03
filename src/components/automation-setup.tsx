"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, Plus, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MessageStepEditor } from "@/components/message-step-editor"
import { createStep, type MessageStep } from "@/lib/automation"

export function AutomationSetup({ featureTitle }: { featureTitle: string }) {
  const [steps, setSteps] = useState<MessageStep[]>([
    {
      id: "step-primary",
      templateId: "order-confirmation",
      body: "Hi {{customerName}}, thanks for shopping at {{storeName}}. Your order {{orderNumber}} is confirmed and we will notify you once it ships.",
      timing: "immediately",
      customValue: "1",
      customUnit: "hours",
    },
  ])

  function updateStep(id: string, next: MessageStep) {
    setSteps((cur) => cur.map((s) => (s.id === id ? next : s)))
  }

  function addFollowUp() {
    setSteps((cur) => [...cur, createStep(cur.length)])
  }

  function removeStep(id: string) {
    setSteps((cur) => cur.filter((s) => s.id !== id))
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
        <h1 className="text-[22px] font-semibold text-foreground">
          {featureTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the message template, timing, and follow-up sequence.
        </p>
      </div>

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
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-[#008060] px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#006e52]"
        >
          <Save className="size-4" />
          Save automation
        </button>
      </div>
    </div>
  )
}
