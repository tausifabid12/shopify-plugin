"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import {
    fetchEnabledDefinitions,
    fetchNotificationConfigs,
    type IShopifyWebhookDefinition,
    type IShopifyNotificationConfig,
} from "@/lib/pinggo-api";

interface ShopifyDefinitionsContextValue {
    /** All enabled webhook definitions from the admin */
    definitions: IShopifyWebhookDefinition[];
    /** Map from shopifyTopic → definition for fast lookup */
    definitionByTopic: Record<string, IShopifyWebhookDefinition>;
    /** Per-user saved notification configs */
    notificationConfigs: IShopifyNotificationConfig[];
    loading: boolean;
    error: string | null;
    reload: () => void;
    /** Credentials passed down so client components can call the API */
    apiKey: string;
    userId: string;
}

const ShopifyDefinitionsContext = createContext<ShopifyDefinitionsContextValue>({
    definitions: [],
    definitionByTopic: {},
    notificationConfigs: [],
    loading: true,
    error: null,
    reload: () => { },
    apiKey: "",
    userId: "",
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
    const [definitions, setDefinitions] = useState<IShopifyWebhookDefinition[]>([]);
    const [notificationConfigs, setNotificationConfigs] = useState<
        IShopifyNotificationConfig[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!apiKey || !userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [defs, configs] = await Promise.all([
                fetchEnabledDefinitions(apiKey, userId),
                fetchNotificationConfigs(apiKey, userId),
            ]);
            setDefinitions(defs);
            setNotificationConfigs(configs);
        } catch (err: any) {
            setError(err.message ?? "Failed to load Shopify webhook definitions.");
        } finally {
            setLoading(false);
        }
    }, [apiKey, userId]);

    useEffect(() => {
        load();
    }, [load]);

    const definitionByTopic: Record<string, IShopifyWebhookDefinition> =
        Object.fromEntries(definitions.map((d) => [d.shopifyTopic, d]));

    return (
        <ShopifyDefinitionsContext.Provider
            value={{
                definitions,
                definitionByTopic,
                notificationConfigs,
                loading,
                error,
                reload: load,
                apiKey,
                userId,
            }}
        >
            {children}
        </ShopifyDefinitionsContext.Provider>
    );
}
