import { getPinggoCredentials } from "@/lib/pinggo"
import { ShopifyAutomationProvider } from "./components/shopify-automation-provider"

/**
 * Layout wrapping all /dashboard/whatsapp/** routes.
 * Injects the ShopifyAutomationProvider so any page in this subtree can access
 * the admin-enabled Shopify events, the merchant's automations and templates.
 */
export default async function WhatsappLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { apiKey, userId } = await getPinggoCredentials()

    return (
        <ShopifyAutomationProvider
            apiKey={apiKey ?? ""}
            userId={userId ?? ""}
        >
            {children}
        </ShopifyAutomationProvider>
    )
}
