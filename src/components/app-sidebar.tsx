"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  ShoppingBag,
  Store,
} from "lucide-react"

import { logout } from "@/app/actions"
import { cn } from "@/lib/utils"

const CHECKOUT_ROOT = "/dashboard/checkout"
const WHATSAPP_ROOT = "/dashboard/whatsapp"
const WHATSAPP_TEMPLATES = `${WHATSAPP_ROOT}/templates`

const primaryNav: {
  title: string
  href: string
  icon: React.ElementType
  exact?: boolean
}[] = [{ title: "Home", href: "/dashboard", icon: LayoutDashboard, exact: true }]

const paymentsNav = { title: "Payments", href: "/dashboard/payments", icon: CreditCard }

const secondaryNav = [
  { title: "Store", href: "/dashboard/store", icon: Store },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
]

/**
 * Checkout sub-navigation.
 *
 * One fixed order, three groups, and the groups answer the only three questions
 * a merchant ever arrives with: how is it doing, what happened, how do I change
 * it. Inside "Activity" the items follow the money — a checkout starts, it is
 * abandoned or becomes an order, the order is paid, a payment may be refunded,
 * and behind all of it is a customer.
 */
const checkoutGroups: {
  label: string
  items: { title: string; href: string }[]
}[] = [
  {
    label: "Insights",
    items: [
      { title: "Overview", href: CHECKOUT_ROOT },
      { title: "Analytics", href: `${CHECKOUT_ROOT}/analytics` },
    ],
  },
  {
    label: "Activity",
    items: [
      { title: "Sessions", href: `${CHECKOUT_ROOT}/sessions` },
      { title: "Abandoned", href: `${CHECKOUT_ROOT}/abandoned` },
      { title: "Orders", href: `${CHECKOUT_ROOT}/orders` },
      { title: "Transactions", href: `${CHECKOUT_ROOT}/transactions` },
      { title: "Refunds", href: `${CHECKOUT_ROOT}/refunds` },
      { title: "Customers", href: `${CHECKOUT_ROOT}/customers` },
    ],
  },
  {
    label: "Setup",
    items: [
      { title: "Customize", href: `${CHECKOUT_ROOT}/customize` },
      { title: "Gateways", href: `${CHECKOUT_ROOT}/gateways` },
      { title: "Routing", href: `${CHECKOUT_ROOT}/routing` },
      { title: "Offers", href: `${CHECKOUT_ROOT}/offers` },
    ],
  },
]

/**
 * A nav entry owns its subtree, so a detail page keeps its parent lit. Section
 * roots (Home, checkout Overview) are exact — they'd otherwise match everything
 * below them. `exclude` carves out a child that has its own entry, so the two
 * never light up together.
 */
function isActive(
  pathname: string,
  href: string,
  exact = false,
  exclude: string[] = []
) {
  if (exclude.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    return false
  }
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

function NavLink({
  href,
  icon: Icon,
  title,
  exact = false,
  exclude,
}: {
  href: string
  icon: React.ElementType
  title: string
  exact?: boolean
  exclude?: string[]
}) {
  const pathname = usePathname()
  const active = isActive(pathname, href, exact, exclude)

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/15 text-white"
          : "text-white/60 hover:bg-white/8 hover:text-white/90"
      )}
    >
      <Icon className={cn("size-4 shrink-0 transition-colors", active ? "text-white" : "text-white/50 group-hover:text-white/80")} />
      {title}
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#00d4a1]" />
      )}
    </Link>
  )
}

/**
 * WhatsApp, plus the one page underneath it a merchant goes looking for by
 * name. Templates are read-only here — they're authored in PingGo web — but
 * they're the thing every automation depends on, so leaving them unlisted just
 * means merchants can't find out where they come from.
 *
 * Always expanded: one child isn't worth a disclosure control.
 */
function WhatsappSection() {
  const pathname = usePathname()
  const templatesActive = isActive(pathname, WHATSAPP_TEMPLATES)

  return (
    <div className="flex flex-col">
      <NavLink
        href={WHATSAPP_ROOT}
        icon={MessageCircle}
        title="WhatsApp"
        exclude={[WHATSAPP_TEMPLATES]}
      />

      <div className="mt-1 mb-1 ml-5 flex flex-col border-l border-white/10 pl-2">
        <Link
          href={WHATSAPP_TEMPLATES}
          className={cn(
            "flex items-center rounded-md px-2 py-1.5 text-[13px] transition-colors",
            templatesActive
              ? "bg-white/15 font-medium text-white"
              : "text-white/55 hover:bg-white/8 hover:text-white/90"
          )}
        >
          Templates
          {templatesActive && (
            <span className="ml-auto size-1.5 rounded-full bg-[#00d4a1]" />
          )}
        </Link>
      </div>
    </div>
  )
}

/**
 * Checkout is the one section deep enough to need a menu of its own, so it
 * carries its pages here rather than in a tab strip above the content: the
 * merchant can see every destination without first landing on the section, and
 * the order never shifts underneath them.
 */
function CheckoutSection() {
  const pathname = usePathname()
  const inSection = isActive(pathname, CHECKOUT_ROOT)

  // Open follows where the merchant is, and a manual toggle overrides that only
  // until they cross the section boundary: collapsing while inside sticks as
  // they move between checkout pages, and arriving in the section from outside
  // always opens the menu.
  const [override, setOverride] = React.useState<{
    inSection: boolean
    open: boolean
  } | null>(null)

  const open = override?.inSection === inSection ? override.open : inSection

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "group flex items-center rounded-lg pr-1 transition-colors",
          inSection ? "bg-white/10" : "hover:bg-white/8"
        )}
      >
        <Link
          href={CHECKOUT_ROOT}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            inSection ? "text-white" : "text-white/60 group-hover:text-white/90"
          )}
        >
          <ShoppingBag
            className={cn(
              "size-4 shrink-0 transition-colors",
              inSection ? "text-white" : "text-white/50 group-hover:text-white/80"
            )}
          />
          Checkout
        </Link>

        <button
          type="button"
          onClick={() => setOverride({ inSection, open: !open })}
          aria-expanded={open}
          aria-controls="checkout-subnav"
          aria-label={open ? "Collapse checkout menu" : "Expand checkout menu"}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform", open && "rotate-90")}
          />
        </button>
      </div>

      {open && (
        <div
          id="checkout-subnav"
          className="mt-1 mb-1 ml-5 flex flex-col gap-2.5 border-l border-white/10 pl-2"
        >
          {checkoutGroups.map((group) => (
            <div key={group.label} className="flex flex-col">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = isActive(
                  pathname,
                  item.href,
                  item.href === CHECKOUT_ROOT
                )

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-2 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-white/15 font-medium text-white"
                        : "text-white/55 hover:bg-white/8 hover:text-white/90"
                    )}
                  >
                    {item.title}
                    {active && (
                      <span className="ml-auto size-1.5 rounded-full bg-[#00d4a1]" />
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppSidebar({ userId }: { userId: string }) {
  return (
    <aside className="flex h-full w-55 shrink-0 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-15 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#008060]">
          <svg viewBox="0 0 24 24" className="size-4 fill-white">
            <path d="M15.337 6.293c-.15-.9-.674-1.68-1.424-2.18a2.99 2.99 0 0 0-3.826 0c-.75.5-1.274 1.28-1.424 2.18L7.5 6.75l-.75 10.5h10.5l-.75-10.5-1.163-.457ZM12 4.5a1.5 1.5 0 0 1 1.29.735c.207.343.296.747.247 1.147L12 5.925l-1.537.457a1.502 1.502 0 0 1 1.537-1.882Z" />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-white">PingGo</span>
          <span className="text-[11px] text-white/40">Shopify App</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="scrollbar-on-dark flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-0.5">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.title}
              exact={item.exact}
            />
          ))}

          <WhatsappSection />

          <CheckoutSection />

          <NavLink
            href={paymentsNav.href}
            icon={paymentsNav.icon}
            title={paymentsNav.title}
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">
            Account
          </p>
          {secondaryNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.title}
              exact
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 mb-1">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70">
            <Store className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-white/40">Connected as</p>
            <p className="truncate text-xs font-medium text-white/80">{userId}</p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/8 hover:text-white/80"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
