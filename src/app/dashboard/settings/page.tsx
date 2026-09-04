import { Settings, UserRound } from "lucide-react"

import { getPinggoCredentials } from "@/lib/pinggo"

export default async function SettingsPage() {
  const { userId } = await getPinggoCredentials()

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <Settings className="size-4 text-muted-foreground" />
          </div>
          <h1 className="text-[22px] font-semibold text-foreground">Settings</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your app preferences and credentials.
        </p>
      </div>

      {/* Credentials card */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">PingGo credentials</h2>
        <div className="rounded-xl border border-border bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <UserRound className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">PingGo user ID</p>
                <p className="truncate font-mono text-sm font-medium text-foreground">{userId}</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          To update your credentials, sign out and reconnect your account.
        </p>
      </div>

      {/* Coming soon */}
      <div className="rounded-xl border border-dashed border-border bg-white px-5 py-8 text-center shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <p className="text-sm font-medium text-foreground">More settings coming soon</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Notification preferences, branding, and more will appear here.
        </p>
      </div>
    </div>
  )
}
