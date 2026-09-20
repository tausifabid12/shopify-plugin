/**
 * Shell for every /dashboard/checkout/** page.
 *
 * Navigation for this section lives in the app sidebar, so the content area is
 * left to the page itself: one heading per screen, no tab strip competing with
 * the sidebar for "where am I".
 *
 * The `has-data-editor` rules let a full-height editor (the customiser) pass
 * through this wrapper without a gap or a scroll trap; every other page keeps
 * the ordinary stacked spacing.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-col gap-5 has-data-editor:h-full has-data-editor:gap-0">
      {children}
    </div>
  )
}
