import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { getPinggoCredentials } from "@/lib/pinggo"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { apiKey, userId } = await getPinggoCredentials()

  if (!apiKey || !userId) {
    redirect("/")
  }

  return (
    <div className="flex h-svh overflow-hidden">
      {/* Fixed sidebar */}
      <AppSidebar userId={userId} />

      {/* Scrollable main content.
          Ordinary pages are read, so they get Shopify's comfortable measure and
          sit centred. An editor is *worked in* and wants the whole window — it
          opts out by marking its root `data-editor`, and the shell drops the
          gutter and the clamp for it rather than every page paying for the one
          exception. */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[#f6f6f7]">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-8 lg:px-8 has-data-editor:h-full has-data-editor:max-w-none has-data-editor:p-0">
          {children}
        </div>
      </main>
    </div>
  )
}
