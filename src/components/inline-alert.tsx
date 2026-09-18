import type { ReactNode } from "react"
import { AlertTriangle, Info } from "lucide-react"

import { cn } from "@/lib/utils"

/** Compact message banner using theme tokens (error or neutral notice). */
export function InlineAlert({
  variant = "notice",
  children,
  className,
}: {
  variant?: "error" | "notice"
  children: ReactNode
  className?: string
}) {
  const Icon = variant === "error" ? AlertTriangle : Info
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm",
        variant === "error"
          ? "border-destructive/20 bg-destructive/5 text-destructive"
          : "border-border bg-muted/50 text-foreground",
        className
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", variant === "notice" && "text-muted-foreground")} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
