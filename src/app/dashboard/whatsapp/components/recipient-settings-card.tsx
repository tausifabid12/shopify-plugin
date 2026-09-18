"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { IVendorWhatsappDetails } from "@/lib/pinggo-api"
import type { ITriggerVariable } from "@/lib/shopify-app-api"
import type { AutomationDraft } from "@/lib/workflow/automation-draft"
import { VariablePicker } from "./variable-picker"

/** Sender WhatsApp number and recipient phone field (Webhooks V2 contact settings). */
export function RecipientSettingsCard({
  draft,
  variables,
  vendorDetails,
  onChange,
}: {
  draft: AutomationDraft
  variables: ITriggerVariable[]
  vendorDetails: IVendorWhatsappDetails | null
  onChange: (patch: Partial<AutomationDraft>) => void
}) {
  const senders = (vendorDetails?.business ?? []).flatMap((business) =>
    business.phoneNumbers.map((phone) => ({ business, phone }))
  )
  const phoneVariables = variables.filter((v) => v.path.toLowerCase().includes("phone"))
  const selectedSender = senders.find((s) => s.phone.phoneNumberId === draft.phoneNumberId)

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium">Send from</Label>
        <p className="text-xs text-muted-foreground">Your WhatsApp Business number.</p>
        <Select
          value={draft.phoneNumberId}
          onValueChange={(id) => {
            const sender = senders.find((s) => s.phone.phoneNumberId === id)
            if (!sender) return
            onChange({
              businessId: sender.business.businessId,
              phoneNumberId: sender.phone.phoneNumberId,
              senderPhoneNumber: sender.phone.phoneNumber,
            })
          }}
        >
          <SelectTrigger className="h-9 w-full bg-background shadow-none">
            <SelectValue placeholder="Select a WhatsApp number">
              {selectedSender ? `${selectedSender.phone.phoneNumber} · ${selectedSender.business.businessName}` : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {senders.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                No WhatsApp number connected in PingGo.
              </div>
            ) : (
              senders.map(({ business, phone }) => (
                <SelectItem key={phone.phoneNumberId} value={phone.phoneNumberId}>
                  {phone.phoneNumber} · {business.businessName}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm font-medium">Customer phone number</Label>
        <p className="text-xs text-muted-foreground">
          The Shopify field holding the customer&apos;s WhatsApp number.
        </p>
        <div className="flex h-9">
          <VariablePicker
            className="h-9"
            value={draft.recipientPath}
            variables={phoneVariables.length > 0 ? phoneVariables : variables}
            onSelect={(path) => onChange({ recipientPath: path })}
            placeholder="Select a phone field"
          />
        </div>
      </div>
    </div>
  )
}
