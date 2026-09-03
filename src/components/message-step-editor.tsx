"use client"

import { useState } from "react"
import { Clock, Trash2 } from "lucide-react"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  customUnitOptions,
  getTemplate,
  renderMessage,
  templates,
  timingOptions,
  variables,
  type MessageStep,
} from "@/lib/automation"
import { cn } from "@/lib/utils"

function WhatsAppPreview({ body }: { body: string }) {
  const rendered = renderMessage(body)
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-[#dfe6ea] p-4">
      {/* Chat header */}
      <div className="flex items-center gap-2.5 border-b border-black/10 pb-3">
        <div className="flex size-7 items-center justify-center rounded-full bg-[#00a884] text-[11px] font-bold text-white">
          S
        </div>
        <span className="text-sm font-medium text-[#111b21]">Store</span>
        <span className="ml-auto text-[11px] text-[#667781]">9:41 AM</span>
      </div>
      {/* Bubble */}
      <div className="max-w-[88%] self-start rounded-xl rounded-tl-none bg-white px-3.5 py-2.5 shadow-sm">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#111b21]">
          {rendered || (
            <span className="italic text-[#aaa]">Start typing your message…</span>
          )}
        </p>
      </div>
    </div>
  )
}

export function MessageStepEditor({
  step,
  index,
  onChange,
  onRemove,
  removable,
}: {
  step: MessageStep
  index: number
  onChange: (step: MessageStep) => void
  onRemove: () => void
  removable: boolean
}) {
  const [customTiming, setCustomTiming] = useState(step.timing === "custom")
  const template = getTemplate(step.templateId)

  function updateTemplate(templateId: string) {
    const next = getTemplate(templateId)
    onChange({ ...step, templateId, body: next.body })
  }

  function insertVariable(variable: string) {
    onChange({ ...step, body: `${step.body}{{${variable}}}` })
  }

  function updateTiming(timing: string) {
    setCustomTiming(timing === "custom")
    onChange({ ...step, timing })
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 items-center justify-center rounded-full bg-[#008060] text-[11px] font-semibold text-white">
            {index + 1}
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Message {index + 1}
          </h3>
        </div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove message"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        {/* Left: editor */}
        <div className="flex flex-col gap-4">
          {/* Template */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Message template</Label>
            <Select value={step.templateId} onValueChange={updateTemplate}>
              <SelectTrigger className="h-9 bg-white shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variable chips */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Insert variable</Label>
            <div className="flex flex-wrap gap-1.5">
              {template.variables.map((v) => {
                const def = variables.find((x) => x.value === v)
                return (
                  <button
                    key={v}
                    type="button"
                    title={def?.label}
                    onClick={() => insertVariable(v)}
                    className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[11px] text-[#008060] transition-colors hover:border-[#008060]/30 hover:bg-[#008060]/5"
                  >
                    {`{{${v}}}`}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Click a variable to append it to the message.
            </p>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`body-${step.id}`} className="text-sm font-medium">
              Message content
            </Label>
            <Textarea
              id={`body-${step.id}`}
              value={step.body}
              onChange={(e) => onChange({ ...step, body: e.target.value })}
              className="min-h-27 bg-white shadow-none"
              placeholder="Hi {{customerName}}, your order {{orderNumber}} is confirmed!"
            />
          </div>

          {/* Timing */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`timing-${step.id}`} className="text-sm font-medium">
              Send timing
            </Label>
            <Select value={step.timing} onValueChange={updateTiming}>
              <SelectTrigger id={`timing-${step.id}`} className="h-9 bg-white shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timingOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {customTiming && (
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`cv-${step.id}`} className="text-sm font-medium">
                  Delay amount
                </Label>
                <Input
                  id={`cv-${step.id}`}
                  type="number"
                  min="1"
                  value={step.customValue}
                  onChange={(e) => onChange({ ...step, customValue: e.target.value })}
                  className="h-9 bg-white shadow-none"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`cu-${step.id}`} className="text-sm font-medium">
                  Unit
                </Label>
                <Select
                  value={step.customUnit}
                  onValueChange={(v) =>
                    onChange({ ...step, customUnit: v as MessageStep["customUnit"] })
                  }
                >
                  <SelectTrigger id={`cu-${step.id}`} className="h-9 bg-white shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {customUnitOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Clock className="size-4 text-muted-foreground" />
            Message preview
          </div>
          <WhatsAppPreview body={step.body} />
        </div>
      </div>
    </div>
  )
}
