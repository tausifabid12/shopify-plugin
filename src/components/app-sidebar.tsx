"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Store,
} from "lucide-react"

import { logout } from "@/app/actions"
import { cn } from "@/lib/utils"

const mainNav = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "WhatsApp", href: "/dashboard/whatsapp", icon: MessageCircle },
  { title: "Payments", href: "/dashboard/payments", icon: CreditCard },
]

const secondaryNav = [
  { title: "Store", href: "/dashboard/store", icon: Store },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
]

function NavLink({
  href,
  icon: Icon,
  title,
  exact = false,
}: {
  href: string
  icon: React.ElementType
  title: string
  exact?: boolean
}) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

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
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-0.5">
          {mainNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.title}
              exact={item.href === "/dashboard"}
            />
          ))}
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
