/**
 * Layout for the public storefront surface (the hosted checkout).
 *
 * Intentionally bare. The dashboard layout reads the PingGo session cookie and
 * redirects to sign-in when it is absent — correct for a merchant, catastrophic
 * for a shopper. Keeping these routes in their own group means a checkout can
 * never inherit that behaviour.
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh">{children}</div>
}
