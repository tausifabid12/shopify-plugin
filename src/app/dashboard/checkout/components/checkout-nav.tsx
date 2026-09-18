"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

/**
 * Section navigation for the checkout platform (§25).
 *
 * Grouped the way a merchant thinks about the product rather than the way the
 * data model is shaped: what happened at the checkout, what happened to the
 * money, and how it is all configured.
 */

const GROUPS: { label: string; items: { title: string; href: string }[] }[] = [
  {
    label: "Checkout",
    items: [
      { title: "Overview", href: "/dashboard/checkout" },
      { title: "Sessions", href: "/dashboard/checkout/sessions" },
      { title: "Abandoned", href: "/dashboard/checkout/abandoned" },
      { title: "Customize", href: "/dashboard/checkout/customize" },
    ],
  },
  {
    label: "Payments",
    items: [
      { title: "Transactions", href: "/dashboard/checkout/transactions" },
      { title: "Orders", href: "/dashboard/checkout/orders" },
      { title: "Refunds", href: "/dashboard/checkout/refunds" },
      { title: "Customers", href: "/dashboard/checkout/customers" },
    ],
  },
  {
    label: "Setup",
    items: [
      { title: "Gateways", href: "/dashboard/checkout/gateways" },
      { title: "Routing", href: "/dashboard/checkout/routing" },
      { title: "Offers", href: "/dashboard/checkout/offers" },
      { title: "Analytics", href: "/dashboard/checkout/analytics" },
    ],
  },
]

export function CheckoutNav() {
  const pathname = usePathname()

  return (
    <nav className="-mx-1 flex items-center gap-1 overflow-x-auto pb-px">
      {GROUPS.map((group, index) => (
        <div key={group.label} className="flex items-center gap-1">
          {index > 0 && <span className="mx-1.5 h-4 w-px shrink-0 bg-border" />}
          {group.items.map((item) => {
            // Overview is an exact match; everything else owns its subtree so a
            // detail page keeps its tab lit.
            const active =
              item.href === "/dashboard/checkout"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/")

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.title}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
