"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { customUnitOptions, type MessageStep } from "@/lib/workflow/automation-draft"
import type { DelayUnit } from "@/lib/workflow/flow-types"

/** Delay before a message — becomes a Webhooks V2 delay node. */
export function StepTimingFields({
  step,
  isFirst,
  onChange,
}: {
  step: MessageStep
  isFirst: boolean
  onChange: (patch: Partial<MessageStep>) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">Send timing</Label>
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {isFirst ? "Wait after the event" : "Wait after the previous message"}
          </Label>
          <Input
            type="number"
            min="0"
            value={step.delayAmount}
            onChange={(e) => onChange({ delayAmount: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
            className="h-9 bg-background shadow-none"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Unit</Label>
          <Select
            value={step.delayUnit}
            onValueChange={(v) => v && onChange({ delayUnit: v as DelayUnit })}
          >
            <SelectTrigger className="h-9 w-full bg-background shadow-none">
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
      {step.delayAmount === 0 ? (
        <p className="text-xs text-muted-foreground">
          {isFirst
            ? "Sends as soon as the Shopify event is processed (usually within a minute)."
            : "Sends right after the previous message."}
        </p>
      ) : null}
    </div>
  )
}
