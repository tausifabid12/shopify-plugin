"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {
    fetchVendorWhatsappDetails,
    fetchWhatsappTemplates,
    type IVendorWhatsappDetails,
    type IWhatsappTemplate,
} from "@/lib/pinggo-api";
import {
    fetchShopifyAutomations,
    fetchShopifyStore,
    fetchShopifyTriggers,
    setShopifyAutomationStatus,
    type IShopifyAutomation,
    type IShopifyStore,
    type IShopifyTrigger,
} from "@/lib/shopify-app-api";
import type { FeatureItem } from "@/lib/feature-types";

interface ShopifyAutomationContextValue {
    /** Pinggo bearer token (from httpOnly cookie, passed down by the server layout) */
    apiKey: string;
    /** Pinggo user id */
    userId: string;

    /** Admin-enabled Shopify events, keyed by topic */
    triggersByTopic: Record<string, IShopifyTrigger>;
    /** Provisioned automations, keyed by feature id */
    automationsByFeature: Record<string, IShopifyAutomation>;
    store: IShopifyStore | null;
    /** Approved WhatsApp message templates */
    templates: IWhatsappTemplate[];
    /** Vendor WhatsApp details (businesses + phone numbers) */
    vendorDetails: IVendorWhatsappDetails | null;

    loading: boolean;
    error: string | null;
    reload: () => Promise<void>;

    /** Enables (provisioning + Shopify subscription) or pauses a feature's automation. */
    setAutomationEnabled: (feature: FeatureItem, enabled: boolean) => Promise<void>;
}

const ShopifyAutomationContext = createContext<ShopifyAutomationContextValue>({
    apiKey: "",
    userId: "",
    triggersByTopic: {},
    automationsByFeature: {},
    store: null,
    templates: [],
    vendorDetails: null,
    loading: true,
    error: null,
    reload: async () => {},
    setAutomationEnabled: async () => {},
});

export function useShopifyAutomations() {
    return useContext(ShopifyAutomationContext);
}

interface Props {
    children: ReactNode;
    apiKey: string;
    userId: string;
}

export function ShopifyAutomationProvider({ children, apiKey, userId }: Props) {
    const [triggers, setTriggers] = useState<IShopifyTrigger[]>([]);
    const [automations, setAutomations] = useState<IShopifyAutomation[]>([]);
    const [store, setStore] = useState<IShopifyStore | null>(null);
    const [templates, setTemplates] = useState<IWhatsappTemplate[]>([]);
    const [vendorDetails, setVendorDetails] = useState<IVendorWhatsappDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!apiKey || !userId) return;
        try {
            const [triggerList, automationList, linkedStore, templateList, vendor] = await Promise.all([
                fetchShopifyTriggers(apiKey),
                fetchShopifyAutomations(apiKey),
                fetchShopifyStore(apiKey),
                fetchWhatsappTemplates(apiKey, userId),
                fetchVendorWhatsappDetails(apiKey, userId),
            ]);
            setTriggers(triggerList ?? []);
            setAutomations(automationList ?? []);
            setStore(linkedStore ?? null);
            setTemplates(templateList.filter((t) => t.status === "APPROVED"));
            setVendorDetails(vendor);
            setError(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load automations.");
        } finally {
            setLoading(false);
        }
    }, [apiKey, userId]);

    useEffect(() => {
        // Data-fetching on mount — load() is async and its setState calls run
        // after awaiting, not synchronously in this effect body.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const triggersByTopic = useMemo(
        () => Object.fromEntries(triggers.map((t) => [t.topic, t])),
        [triggers]
    );

    const automationsByFeature = useMemo(
        () => Object.fromEntries(automations.map((a) => [a.featureKey, a])),
        [automations]
    );

    const setAutomationEnabled = useCallback(
        async (feature: FeatureItem, enabled: boolean) => {
            if (!apiKey || !feature.shopifyTopic) return;
            const updated = await setShopifyAutomationStatus(apiKey, feature.id, {
                enabled,
                shopifyTopic: feature.shopifyTopic,
                name: feature.title,
            });
            setAutomations((current) => [
                ...current.filter((a) => a.featureKey !== updated.featureKey),
                updated,
            ]);
        },
        [apiKey]
    );

    return (
        <ShopifyAutomationContext.Provider
            value={{
                apiKey,
                userId,
                triggersByTopic,
                automationsByFeature,
                store,
                templates,
                vendorDetails,
                loading,
                error,
                reload: load,
                setAutomationEnabled,
            }}
        >
            {children}
        </ShopifyAutomationContext.Provider>
    );
}
