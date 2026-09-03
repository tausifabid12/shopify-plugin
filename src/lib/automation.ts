export type TemplateOption = {
  value: string
  label: string
  body: string
  variables: string[]
}

export type VariableOption = {
  value: string
  label: string
  sample: string
}

export type TimingOption = {
  value: string
  label: string
  custom?: boolean
}

export type MessageStep = {
  id: string
  templateId: string
  body: string
  timing: string
  customValue: string
  customUnit: "minutes" | "hours" | "days"
}

export const templates: TemplateOption[] = [
  {
    value: "order-confirmation",
    label: "Order confirmation",
    body: "Hi {{customerName}}, thanks for shopping at {{storeName}}. Your order {{orderNumber}} is confirmed and we will notify you once it ships.",
    variables: ["customerName", "storeName", "orderNumber"],
  },
  {
    value: "payment-confirmation",
    label: "Payment confirmation",
    body: "Hi {{customerName}}, your payment of {{orderTotal}} for order {{orderNumber}} has been received. A receipt has been sent to your WhatsApp.",
    variables: ["customerName", "orderTotal", "orderNumber"],
  },
  {
    value: "shipping-update",
    label: "Shipping update",
    body: "Hi {{customerName}}, your order {{orderNumber}} has shipped. Track your delivery here: {{trackingLink}}",
    variables: ["customerName", "orderNumber", "trackingLink"],
  },
  {
    value: "delivery-confirmation",
    label: "Delivery confirmation",
    body: "Hi {{customerName}}, your order {{orderNumber}} has been delivered. We hope you love it! Reply with any questions.",
    variables: ["customerName", "orderNumber"],
  },
  {
    value: "abandoned-cart",
    label: "Abandoned cart recovery",
    body: "Hi {{customerName}}, you left something in your cart. Use code {{discountCode}} for {{discountPercent}} off and complete your order today.",
    variables: ["customerName", "discountCode", "discountPercent"],
  },
  {
    value: "payment-reminder",
    label: "Payment reminder",
    body: "Hi {{customerName}}, a payment of {{orderTotal}} is due for order {{orderNumber}}. Pay securely here: {{paymentLink}}",
    variables: ["customerName", "orderTotal", "orderNumber", "paymentLink"],
  },
]

export const variables: VariableOption[] = [
  { value: "customerName", label: "Customer name", sample: "Aarav" },
  { value: "storeName", label: "Store name", sample: "PingGo Store" },
  { value: "orderNumber", label: "Order number", sample: "#10024" },
  { value: "orderTotal", label: "Order total", sample: "₹1,499" },
  { value: "trackingLink", label: "Tracking link", sample: "pinggo.app/track/10024" },
  { value: "discountCode", label: "Discount code", sample: "WELCOME10" },
  { value: "discountPercent", label: "Discount percent", sample: "10%" },
  { value: "paymentLink", label: "Payment link", sample: "pinggo.app/pay/10024" },
  { value: "etaDate", label: "Delivery ETA", sample: "Aug 21" },
]

export const timingOptions: TimingOption[] = [
  { value: "immediately", label: "Immediately" },
  { value: "1m", label: "After 1 minute" },
  { value: "5m", label: "After 5 minutes" },
  { value: "30m", label: "After 30 minutes" },
  { value: "1h", label: "After 1 hour" },
  { value: "6h", label: "After 6 hours" },
  { value: "1d", label: "After 1 day" },
  { value: "custom", label: "Custom delay", custom: true },
]

export const customUnitOptions = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
]

export function getTemplate(id: string) {
  return templates.find((template) => template.value === id) ?? templates[0]
}

export function getVariableSamples() {
  return Object.fromEntries(variables.map((variable) => [variable.value, variable.sample]))
}

export function renderMessage(body: string) {
  const samples = getVariableSamples()
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => samples[key] ?? `{{${key}}}`)
}

export function createStep(index: number): MessageStep {
  const template = templates[0]
  return {
    id: `step-${Date.now()}-${index}`,
    templateId: template.value,
    body: template.body,
    timing: "immediately",
    customValue: "1",
    customUnit: "hours",
  }
}
