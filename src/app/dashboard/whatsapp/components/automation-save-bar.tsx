import Link from "next/link"
import { AlertTriangle, ArrowLeft, Loader2, Save } from "lucide-react"

export function AutomationSaveBar({
  saving,
  saveError,
  saved,
  disabled,
  onSave,
}: {
  saving: boolean
  saveError: string | null
  saved: boolean
  disabled: boolean
  onSave: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <Link
        href="/dashboard/whatsapp"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
      >
        <ArrowLeft className="size-4" />
        Cancel
      </Link>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {saveError && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            {saveError}
          </p>
        )}
        {saved && !saveError && <p className="text-sm text-primary">Saved successfully</p>}
        <button
          type="button"
          onClick={onSave}
          disabled={saving || disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving…" : "Save automation"}
        </button>
      </div>
    </div>
  )
}
