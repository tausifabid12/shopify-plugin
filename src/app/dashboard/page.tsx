import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  KeyRound,
  MessageCircle,
  UserRound,
  Zap,
} from "lucide-react"

import { getPinggoCredentials } from "@/lib/pinggo"

const features = [
  {
    title: "WhatsApp Notifications",
    description:
      "Automate order updates, cart recovery, payment reminders, and delivery alerts over WhatsApp.",
    href: "/dashboard/whatsapp",
    icon: MessageCircle,
    color: "bg-emerald-50 text-emerald-600",
    badge: "33 automations",
  },
  {
    title: "Smart Checkout & Payments",
    description:
      "Accept UPI, cards, wallets, and generate smart payment links with automatic receipts.",
    href: "/dashboard/payments",
    icon: CreditCard,
    color: "bg-blue-50 text-blue-600",
    badge: "8 features",
  },
]

export default async function DashboardPage() {
  const { apiKey, userId } = await getPinggoCredentials()
  const maskedApiKey = apiKey
    ? `${apiKey.slice(0, 8)}••••${apiKey.slice(-4)}`
    : "—"

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-semibold text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your PingGo integration from one place.
        </p>
      </div>

      {/* Status banner */}
      <div className="flex items-center gap-3 rounded-xl border border-[#008060]/20 bg-[#f1fdf8] px-4 py-3.5">
        <CheckCircle2 className="size-5 shrink-0 text-[#008060]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1a3d31]">PingGo is connected and active</p>
          <p className="text-xs text-[#3d7a66] mt-0.5">Your store is receiving automation events.</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#008060]/10 px-2.5 py-0.5 text-xs font-medium text-[#008060]">
          <span className="size-1.5 rounded-full bg-[#008060] animate-pulse" />
          Live
        </span>
      </div>

      {/* Feature cards */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Features</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.href}
                className="group flex flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] transition-shadow hover:shadow-[0_4px_12px_0_rgb(0,0,0,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${f.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {f.badge}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                </div>
                <Link
                  href={f.href}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#008060] transition-colors hover:text-[#006e52]"
                >
                  Configure
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* Account info */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Account details</h2>
        <div className="rounded-xl border border-border bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
          <div className="flex items-center gap-4 border-b border-border px-5 py-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <UserRound className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="truncate font-mono text-sm font-medium text-foreground">{userId}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <KeyRound className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">API key</p>
              <p className="truncate font-mono text-sm font-medium text-foreground">{maskedApiKey}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Getting started tip */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-white px-5 py-4 shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
          <Zap className="size-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Getting started</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Features are off by default so you stay in control. Go to{" "}
            <Link href="/dashboard/whatsapp" className="font-medium text-[#008060] hover:underline">
              WhatsApp
            </Link>{" "}
            or{" "}
            <Link href="/dashboard/payments" className="font-medium text-[#008060] hover:underline">
              Payments
            </Link>{" "}
            to turn on what your store needs.
          </p>
        </div>
      </div>
    </div>
  )
}
