"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useMemo,
    useCallback,
    type ReactNode,
} from "react";
import {
    fetchWebhooks,
    fetchWorkflowFolders,
    fetchWhatsappTemplates,
    fetchVendorWhatsappDetails,
    createWebhook,
    updateWebhookStatus,
    deleteWebhook,
    type IShopifyWebhook,
    type IWorkflowFolder,
    type IWhatsappTemplate,
    type IVendorWhatsappDetails,
} from "@/lib/pinggo-api";

/**
 * Prefix used to distinguish Shopify-plugin automations from a merchant's
 * regular webhooks-v2 webhooks. We only touch webhooks with this prefix.
 */
export const SHOPIFY_WEBHOOK_PREFIX = "Shopify: ";

interface ShopifyDefinitionsContextValue {
    /** Pinggo bearer token (from httpOnly cookie, passed down by the server layout) */
    apiKey: string;
    /** Pinggo user id */
    userId: string;

    /** All webhooks owned by this vendor */
    webhooks: IShopifyWebhook[];
    /** Webhooks created by this Shopify plugin, keyed by shopifyTopic */
    shopifyWebhooksByTopic: Record<string, IShopifyWebhook>;
    /** Workflow folders (first is used for new webhooks) */
    folders: IWorkflowFolder[];
    /** WhatsApp message templates */
    templates: IWhatsappTemplate[];
    /** Vendor WhatsApp details (businesses + phone numbers) */
    vendorDetails: IVendorWhatsappDetails | null;

    loading: boolean;
    error: string | null;
    reload: () => void;

    /** Enable/disable a Shopify automation (creates or activates/deletes a webhook). */
    setAutomationEnabled: (
        shopifyTopic: string,
        featureTitle: string,
        enabled: boolean
    ) => Promise<void>;
}

const ShopifyDefinitionsContext = createContext<ShopifyDefinitionsContextValue>({
    apiKey: "",
    userId: "",
    webhooks: [],
    shopifyWebhooksByTopic: {},
    folders: [],
    templates: [],
    vendorDetails: null,
    loading: true,
    error: null,
    reload: () => {},
    setAutomationEnabled: async () => {},
});

export function useShopifyDefinitions() {
    return useContext(ShopifyDefinitionsContext);
}

interface Props {
    children: ReactNode;
    apiKey: string;
    userId: string;
}

export function ShopifyDefinitionsProvider({ children, apiKey, userId }: Props) {
    const [webhooks, setWebhooks] = useState<IShopifyWebhook[]>([]);
    const [folders, setFolders] = useState<IWorkflowFolder[]>([]);
    const [templates, setTemplates] = useState<IWhatsappTemplate[]>([]);
    const [vendorDetails, setVendorDetails] = useState<IVendorWhatsappDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!apiKey || !userId) return;
        try {
            const [webhookList, folderList, templateList, vendor] = await Promise.all([
                fetchWebhooks(apiKey),
                fetchWorkflowFolders(apiKey),
                fetchWhatsappTemplates(apiKey, userId),
                fetchVendorWhatsappDetails(apiKey, userId),
            ]);
            setWebhooks(webhookList);
            setFolders(folderList);
            setTemplates(templateList);
            setVendorDetails(vendor);
            setError(null);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to load Shopify webhooks.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [apiKey, userId]);

    useEffect(() => {
        // Data-fetching on mount — load() is async and its setState calls run
        // in a .then/.catch, not synchronously in this effect body.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    // Key shopify-plugin webhooks by their Shopify topic.
    const shopifyWebhooksByTopic = useMemo<Record<string, IShopifyWebhook>>(() => {
        const result: Record<string, IShopifyWebhook> = {};
        for (const webhook of webhooks) {
            if (!webhook.name.startsWith(SHOPIFY_WEBHOOK_PREFIX)) continue;
            // The topic is encoded in the name: "Shopify: orders/create — Order confirmation messages"
            const rest = webhook.name.slice(SHOPIFY_WEBHOOK_PREFIX.length);
            const topic = rest.split(" — ")[0]?.trim();
            if (topic) result[topic] = webhook;
        }
        return result;
    }, [webhooks]);

    const setAutomationEnabled = useCallback(
        async (shopifyTopic: string, featureTitle: string, enabled: boolean) => {
            if (!apiKey || !userId) return;

            const existing = Object.values(shopifyWebhooksByTopic).find(
                (w) => w.name.includes(shopifyTopic)
            );

            if (enabled) {
                if (existing) {
                    // Re-enable an existing (previously disabled) webhook.
                    if (existing.status !== "active") {
                        await updateWebhookStatus(apiKey, existing._id, "active");
                    }
                } else {
                    const folderId = folders[0]?._id ?? "";
                    if (!folderId) {
                        throw new Error("No workflow folder available. Create one in Pinggo first.");
                    }
                    await createWebhook(apiKey, {
                        vendorUserId: userId,
                        folderId,
                        name: `${SHOPIFY_WEBHOOK_PREFIX}${shopifyTopic} — ${featureTitle}`,
                    });
                }
            } else if (existing) {
                await deleteWebhook(apiKey, existing._id);
            }

            await load();
        },
        [apiKey, userId, folders, shopifyWebhooksByTopic, load]
    );

    return (
        <ShopifyDefinitionsContext.Provider
            value={{
                apiKey,
                userId,
                webhooks,
                shopifyWebhooksByTopic,
                folders,
                templates,
                vendorDetails,
                loading,
                error,
                reload: load,
                setAutomationEnabled,
            }}
        >
            {children}
        </ShopifyDefinitionsContext.Provider>
    );
}
