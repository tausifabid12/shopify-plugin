import { Plus } from "lucide-react"

export function AddFollowUpCard({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-5 py-5 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
      <p className="text-sm font-medium text-foreground">Follow-up messages</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Add a second or third message to nudge customers who haven&apos;t responded.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
      >
        <Plus className="size-4" />
        Add follow-up
      </button>
    </div>
  )
}
