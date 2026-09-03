import { getPinggoCredentials } from "@/lib/pinggo"
import { ShopifyDefinitionsProvider } from "@/components/shopify-definitions-provider"

/**
 * Layout wrapping all /dashboard/whatsapp/** routes.
 * Injects the ShopifyDefinitionsProvider so any page in this subtree
 * can access live webhook definitions and variables from the Pinggo admin.
 */
export default async function WhatsappLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { apiKey, userId } = await getPinggoCredentials()

    return (
        <ShopifyDefinitionsProvider
            apiKey={apiKey ?? ""}
            userId={userId ?? ""}
        >
            {children}
        </ShopifyDefinitionsProvider>
    )
}
