import { ExternalLink } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { PINGGO_DASHBOARD_URL, pinggoHandoffHref } from "@/lib/pinggo-handoff"
import { cn } from "@/lib/utils"

/**
 * Links into PingGo web that sign the merchant in on the way.
 *
 * Both variants open in a new tab and say so with an icon: the merchant is
 * leaving the Shopify admin, and half-finished automation work is sitting on
 * the page behind them. Sending them away in the same tab would lose it.
 *
 * If `NEXT_PUBLIC_PINGGO_DASHBOARD_URL` isn't configured these render nothing
 * rather than a link to nowhere.
 */

const shared = {
  target: "_blank",
  rel: "noreferrer noopener",
} as const

export function PinggoButton({
  path,
  children,
  variant = "default",
  size = "lg",
  className,
}: {
  /** A PingGo web path, e.g. from `PINGGO_PATHS`. */
  path: string
  children: React.ReactNode
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  if (!PINGGO_DASHBOARD_URL) return null

  return (
    <a
      {...shared}
      href={pinggoHandoffHref(path)}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children}
      <ExternalLink data-icon="inline-end" />
    </a>
  )
}

export function PinggoLink({
  path,
  children,
  className,
}: {
  path: string
  children: React.ReactNode
  className?: string
}) {
  if (!PINGGO_DASHBOARD_URL) return null

  return (
    <a
      {...shared}
      href={pinggoHandoffHref(path)}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-primary hover:underline",
        className
      )}
    >
      {children}
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  )
}
