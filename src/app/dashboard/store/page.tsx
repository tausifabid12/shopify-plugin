import { CheckCircle2, Globe, Package, Store } from "lucide-react"

export default function StorePage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <Store className="size-4 text-muted-foreground" />
          </div>
          <h1 className="text-[22px] font-semibold text-foreground">Store</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Store details and connection status.
        </p>
      </div>

      {/* Connection status */}
      <div className="rounded-xl border border-border bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Connection status</h2>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: "Shopify connection", value: "Active", icon: Globe, good: true },
            { label: "PingGo integration", value: "Active", icon: Package, good: true },
            { label: "Webhooks", value: "Registered", icon: CheckCircle2, good: true },
          ].map(({ label, value, icon: Icon, good }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <span className="flex-1 text-sm text-foreground">{label}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {good && <span className="size-1.5 rounded-full bg-emerald-500" />}
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div className="rounded-xl border border-dashed border-border bg-white px-5 py-8 text-center shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <p className="text-sm font-medium text-foreground">Store management coming soon</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sync products, manage inventory, and configure fulfillment from here.
        </p>
      </div>
    </div>
  )
}
