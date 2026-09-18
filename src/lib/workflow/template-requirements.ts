import { analyzeTemplate, type TemplateAnalysis } from "@/lib/workflow/template-analysis"

/**
 * What a WhatsApp template needs from a message step before the Webhooks V2
 * executor can send it. Mirrors the Pinggo flow builder's validation.
 */

export type TemplateRequirements = {
  analysis: TemplateAnalysis
  bodyKeys: string[]
  headerKeys: string[]
  needsHeaderMedia: boolean
  needsDynamicUrl: boolean
  needsCouponCode: boolean
  /** Carousel, authentication and flow-button templates need the full Pinggo flow builder. */
  supported: boolean
}

export function getTemplateRequirements(template: Record<string, unknown> | undefined): TemplateRequirements | null {
  if (!template) return null
  const analysis = analyzeTemplate(template as Parameters<typeof analyzeTemplate>[0])
  return {
    analysis,
    bodyKeys: Array.from({ length: analysis.bodyVariableCount }, (_, i) => `field_${i + 1}`),
    headerKeys: Array.from({ length: analysis.headerVariableCount }, (_, i) => `header_${i + 1}`),
    needsHeaderMedia: analysis.hasHeaderMedia,
    needsDynamicUrl: analysis.hasDynamicUrl,
    needsCouponCode: analysis.hasCopyCode,
    supported: !analysis.isCarousel && !analysis.isAuthentication && !analysis.hasFlowButton,
  }
}

/** Quick-reply buttons, in the shape the flow builder stores on template nodes. */
export function quickReplyButtons(template: Record<string, unknown> | undefined): { id: string; label: string }[] {
  const components = (template?.components ?? []) as Array<Record<string, unknown>>
  const buttons = components.find((c) => c.type === "BUTTONS")?.buttons
  if (!Array.isArray(buttons)) return []
  return buttons
    .filter((b): b is Record<string, unknown> => typeof b === "object" && b !== null && b.type === "QUICK_REPLY")
    .map((b) => ({ id: String(b.text ?? ""), label: String(b.text ?? "") }))
}
