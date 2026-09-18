"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ITriggerVariable } from "@/lib/shopify-app-api"
import { cn } from "@/lib/utils"

/** Searchable, grouped picker over the Shopify event's variables. */
export function VariablePicker({
  value,
  variables,
  onSelect,
  onClear,
  placeholder = "Select a Shopify field…",
  className,
}: {
  value: string
  variables: ITriggerVariable[]
  onSelect: (path: string) => void
  onClear?: () => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = variables.find((v) => v.path === value)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = variables.filter(
      (v) => !q || v.path.toLowerCase().includes(q) || v.label.toLowerCase().includes(q)
    )
    const byGroup = new Map<string, ITriggerVariable[]>()
    for (const v of matches) byGroup.set(v.group, [...(byGroup.get(v.group) ?? []), v])
    return [...byGroup.entries()]
  }, [variables, query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-8 min-w-0 flex-1 items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-left text-sm hover:bg-muted/30",
              className
            )}
          >
            <span className={cn("truncate text-xs", value ? "text-foreground" : "text-muted-foreground")}>
              {selected ? `${selected.group} · ${selected.label}` : value ? `{{${value}}}` : placeholder}
            </span>
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <PopoverContent align="start" side="bottom" className="w-80 p-0">
        <div className="flex items-center gap-2 border-b border-border p-2">
          <Input
            autoFocus
            value={query}
            className="h-8 text-xs shadow-none"
            placeholder="Search fields…"
            onChange={(e) => setQuery(e.target.value)}
          />
          {value && onClear ? (
            <button
              type="button"
              onClick={() => {
                onClear()
                setOpen(false)
              }}
              aria-label="Clear field"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {groups.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">No matching fields.</p>
          ) : (
            groups.map(([group, items]) => (
              <div key={group} className="mb-2 last:mb-0">
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                {items.map((v) => (
                  <button
                    key={v.path}
                    type="button"
                    onClick={() => {
                      onSelect(v.path)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-muted/60",
                      v.path === value && "bg-accent text-accent-foreground"
                    )}
                  >
                    <span className="text-xs text-foreground">{v.label}</span>
                    <code className="truncate font-mono text-[10px] text-primary">{`{{${v.path}}}`}</code>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
