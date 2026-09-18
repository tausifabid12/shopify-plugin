import { ShoppingBag } from "lucide-react"

import { CheckoutNav } from "./components/checkout-nav"

/**
 * Shell for every /dashboard/checkout/** page.
 *
 * The section header and navigation live here so each page renders only its own
 * content, and so switching tabs doesn't re-paint the chrome.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50">
          <ShoppingBag className="size-4 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">
            Checkout &amp; Payments
          </h1>
        </div>
      </div>

      <CheckoutNav />

      {children}
    </div>
  )
}
