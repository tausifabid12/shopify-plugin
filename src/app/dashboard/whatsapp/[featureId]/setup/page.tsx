import { notFound } from "next/navigation"

import { whatsappFeatureSections } from "@/lib/whatsapp-features"
import { AutomationSetup } from "../../components/automation-setup"

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
    <AutomationSetup
      featureId={feature.id}
      featureTitle={feature.title}
      shopifyTopic={feature.shopifyTopic}
    />
  )
}
