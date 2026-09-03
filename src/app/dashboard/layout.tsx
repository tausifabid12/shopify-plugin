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

      {/* Scrollable main content */}
      <main className="flex flex-1 flex-col overflow-y-auto bg-[#f6f6f7]">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
