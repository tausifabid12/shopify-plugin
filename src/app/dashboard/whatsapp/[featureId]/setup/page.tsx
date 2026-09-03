import { notFound } from "next/navigation"

import { DynamicAutomationSetup } from "@/components/dynamic-automation-setup"
import { whatsappFeatureSections } from "@/lib/whatsapp-features"

export default async function AutomationSetupPage({
  params,
}: {
  params: Promise<{ featureId: string }>
}) {
  const { featureId } = await params
  const feature = whatsappFeatureSections
    .flatMap((s) => s.items)
    .find((item) => item.id === featureId)

  if (!feature) notFound()

  return (
    <DynamicAutomationSetup
      featureTitle={feature.title}
      shopifyTopic={feature.shopifyTopic}
    />
  )
}
