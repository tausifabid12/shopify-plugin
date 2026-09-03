"use client"

import { useState } from "react"
import { ChevronDown, Clock, Search, Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { customUnitOptions, timingOptions, type MessageStep } from "@/lib/automation"
import type { IVariableDefinition } from "@/lib/pinggo-api"

function WhatsAppPreview({
    body,
    variables,
}: {
    body: string
    variables: IVariableDefinition[]
}) {
    const sampleMap: Record<string, string> = {}
    for (const v of variables) {
        sampleMap[v.path] = `[${v.label}]`
    }
    const rendered = body.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
        return sampleMap[key.trim()] ?? `{{${key}}}`
    })

    return (
        <div className="flex flex-col gap-3 rounded-xl bg-[#dfe6ea] p-4">
            <div className="flex items-center gap-2.5 border-b border-black/10 pb-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-[#00a884] text-[11px] font-bold text-white">
                    S
                </div>
                <span className="text-sm font-medium text-[#111b21]">Store</span>
                <span className="ml-auto text-[11px] text-[#667781]">9:41 AM</span>
            </div>
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

interface Props {
    step: MessageStep
    index: number
    onChange: (step: MessageStep) => void
    onRemove: () => void
    removable: boolean
    variables: IVariableDefinition[]
}

export function DynamicMessageStepEditor({
    step,
    index,
    onChange,
    onRemove,
    removable,
    variables,
}: Props) {
    const [customTiming, setCustomTiming] = useState(step.timing === "custom")
    const [varSearch, setVarSearch] = useState("")
    const [popoverOpen, setPopoverOpen] = useState(false)

    function insertVariable(path: string) {
        onChange({ ...step, body: `${step.body}{{${path}}}` })
        setPopoverOpen(false)
        setVarSearch("")
    }

    function updateTiming(timing: string) {
        setCustomTiming(timing === "custom")
        onChange({ ...step, timing })
    }

    const filtered = variables.filter(
        (v) =>
            v.path.toLowerCase().includes(varSearch.toLowerCase()) ||
            v.label.toLowerCase().includes(varSearch.toLowerCase())
    )

    const grouped = filtered.reduce<Record<string, IVariableDefinition[]>>((acc, v) => {
        const key = v.path.split(".")[0].replace(/\[.*\]/, "")
        if (!acc[key]) acc[key] = []
        acc[key].push(v)
        return acc
    }, {})

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
                    {/* Variable picker */}
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium">Insert variable</Label>

                        {variables.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                No variables — the admin must configure an example payload for this webhook.
                            </p>
                        ) : (
                            <>
                                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-white px-3 text-sm text-muted-foreground shadow-none transition-colors hover:bg-muted/30"
                                        >
                                            Select a variable to insert…
                                            <ChevronDown className="size-4 shrink-0" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" side="bottom" className="w-80 p-0">
                                        <div className="border-b border-border p-2">
                                            <div className="relative">
                                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    className="h-8 pl-8 text-xs shadow-none"
                                                    placeholder="Search variables…"
                                                    value={varSearch}
                                                    onChange={(e) => setVarSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-56 overflow-y-auto p-2">
                                            {Object.entries(grouped).map(([group, vars]) => (
                                                <div key={group} className="mb-2">
                                                    <p className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                        {group.replace(/_/g, " ")}
                                                    </p>
                                                    {vars.map((v) => (
                                                        <button
                                                            key={v.path}
                                                            type="button"
                                                            onClick={() => insertVariable(v.path)}
                                                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
                                                        >
                                                            <code className="shrink-0 font-mono text-[11px] text-[#008060]">
                                                                {`{{${v.path}}}`}
                                                            </code>
                                                            <span className="truncate text-xs text-muted-foreground">
                                                                {v.label}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                            {Object.keys(grouped).length === 0 && (
                                                <p className="py-6 text-center text-xs text-muted-foreground">
                                                    No variables match.
                                                </p>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Quick chips */}
                                <div className="flex flex-wrap gap-1.5">
                                    {variables.slice(0, 8).map((v) => (
                                        <button
                                            key={v.path}
                                            type="button"
                                            title={v.label}
                                            onClick={() => insertVariable(v.path)}
                                            className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[11px] text-[#008060] transition-colors hover:border-[#008060]/30 hover:bg-[#008060]/5"
                                        >
                                            {`{{${v.path}}}`}
                                        </button>
                                    ))}
                                    {variables.length > 8 && (
                                        <span className="self-center text-xs text-muted-foreground">
                                            +{variables.length - 8} more in dropdown
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
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
                            placeholder="Hi {{customer.first_name}}, your order {{name}} has been confirmed!"
                        />
                        <p className="text-xs text-muted-foreground">
                            Use the variable picker above to insert dynamic values.
                        </p>
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
                    <WhatsAppPreview body={step.body} variables={variables} />
                </div>
            </div>
        </div>
    )
}
