import { ExternalLink } from "lucide-react"

import { InlineAlert } from "@/components/inline-alert"

const PINGGO_DASHBOARD_URL = process.env.NEXT_PUBLIC_PINGGO_DASHBOARD_URL

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
      {PINGGO_DASHBOARD_URL && workflowId ? (
        <a
          href={`${PINGGO_DASHBOARD_URL.replace(/\/+$/, "")}/webhooks-v2/${workflowId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Open in PingGo
          <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </InlineAlert>
  )
}
