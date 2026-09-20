import { InlineAlert } from "@/components/inline-alert"
import { PinggoLink } from "@/components/pinggo-link"
import { PINGGO_PATHS } from "@/lib/pinggo-handoff"

/**
 * Shown when the automation's flow was customized in the Pinggo flow builder
 * beyond what this editor supports. Editing is blocked to protect that work.
 */
export function UnsupportedFlowNotice({ reason, workflowId }: { reason: string; workflowId?: string }) {
  return (
    <InlineAlert>
      <p className="font-medium">This automation was customized in the PingGo flow builder.</p>
      <p className="mt-1 text-muted-foreground">
        {reason} It keeps running as configured, but to avoid losing those changes it can only be
        edited in PingGo.
      </p>
      {workflowId ? (
        <PinggoLink path={PINGGO_PATHS.workflow(workflowId)} className="mt-2 text-sm">
          Open in PingGo
        </PinggoLink>
      ) : null}
    </InlineAlert>
  )
}
