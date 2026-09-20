/**
 * Shell for every /dashboard/checkout/** page.
 *
 * Navigation for this section lives in the app sidebar, so the content area is
 * left to the page itself: one heading per screen, no tab strip competing with
 * the sidebar for "where am I".
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="flex flex-col gap-5">{children}</div>
}
