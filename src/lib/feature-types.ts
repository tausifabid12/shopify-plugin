import type { LucideIcon } from "lucide-react"

export type FeatureItem = {
  id: string
  title: string
  description: string
  icon: LucideIcon
  enabled?: boolean
  tag?: string
  /** Shopify webhook topic that triggers this feature, e.g. "orders/create" */
  shopifyTopic?: string
}

export type FeatureSection = {
  title: string
  description?: string
  items: FeatureItem[]
}
