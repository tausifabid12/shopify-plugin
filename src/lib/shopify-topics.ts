/**
 * Shopify webhook topic sample payloads.
 *
 * These mirror the real Shopify webhook payload shapes so the Shopify plugin can
 * offer the same "webhook variables" (JSON paths) that Pinggo's webhooks-v2
 * feature uses. When a merchant enables an automation, the sample payload is
 * sent as the webhook sample so the backend can resolve `{{path}}` variables at
 * runtime.
 */

export type ShopifyTopic = string;

export interface IShopifyTopicSample {
  topic: string;
  label: string;
  sample: Record<string, unknown>;
}

export const shopifyTopicSamples: IShopifyTopicSample[] = [
  {
    topic: "orders/create",
    label: "Order created",
    sample: {
      id: 820982911946154500,
      name: "#1001",
      email: "jon@example.com",
      total_price: "199.00",
      subtotal_price: "199.00",
      currency: "USD",
      financial_status: "paid",
      fulfillment_status: null,
      order_number: 1001,
      created_at: "2024-01-01T10:00:00-05:00",
      customer: {
        id: 115310627314723954,
        email: "jon@example.com",
        first_name: "Jon",
        last_name: "Doe",
        phone: "+16135550123",
      },
      shipping_address: {
        first_name: "Jon",
        last_name: "Doe",
        address1: "123 Shopify St",
        city: "Ottawa",
        province: "Ontario",
        zip: "K1N 6N5",
        country: "Canada",
      },
      line_items: [
        {
          id: 866550311766439000,
          title: "Widget",
          quantity: 1,
          price: "199.00",
          sku: "WIDGET-01",
        },
      ],
    },
  },
  {
    topic: "orders/paid",
    label: "Order paid",
    sample: {
      id: 820982911946154500,
      name: "#1001",
      email: "jon@example.com",
      total_price: "199.00",
      currency: "USD",
      financial_status: "paid",
      order_number: 1001,
      customer: {
        id: 115310627314723954,
        email: "jon@example.com",
        first_name: "Jon",
        last_name: "Doe",
        phone: "+16135550123",
      },
    },
  },
  {
    topic: "orders/updated",
    label: "Order updated",
    sample: {
      id: 820982911946154500,
      name: "#1001",
      email: "jon@example.com",
      total_price: "199.00",
      currency: "USD",
      fulfillment_status: "fulfilled",
      order_number: 1001,
      customer: {
        id: 115310627314723954,
        first_name: "Jon",
        last_name: "Doe",
        phone: "+16135550123",
      },
    },
  },
  {
    topic: "orders/cancelled",
    label: "Order cancelled",
    sample: {
      id: 820982911946154500,
      name: "#1001",
      email: "jon@example.com",
      cancel_reason: "customer",
      cancelled_at: "2024-01-01T12:00:00-05:00",
      order_number: 1001,
      customer: {
        id: 115310627314723954,
        first_name: "Jon",
        last_name: "Doe",
        phone: "+16135550123",
      },
    },
  },
  {
    topic: "fulfillments/create",
    label: "Fulfillment created",
    sample: {
      id: 255858046906943000,
      status: "success",
      tracking_number: "1Z999AA123456",
      tracking_company: "UPS",
      order_id: 820982911946154500,
      line_items: [
        { id: 866550311766439000, title: "Widget", quantity: 1 },
      ],
      shipment_status: null,
      tracking_url: "https://www.ups.com/track?loc=en_US&tracknum=1Z999AA123456",
    },
  },
  {
    topic: "fulfillments/update",
    label: "Fulfillment updated",
    sample: {
      id: 255858046906943000,
      status: "success",
      tracking_number: "1Z999AA123456",
      tracking_company: "UPS",
      shipment_status: "delivered",
      tracking_url: "https://www.ups.com/track?loc=en_US&tracknum=1Z999AA123456",
    },
  },
  {
    topic: "refunds/create",
    label: "Refund created",
    sample: {
      id: 509562969690577800,
      order_id: 820982911946154500,
      created_at: "2024-01-01T12:00:00-05:00",
      note: "Refund for returned items",
      total_duties_set: null,
      transactions: [{ amount: "199.00", currency: "USD" }],
    },
  },
  {
    topic: "checkouts/create",
    label: "Checkout created",
    sample: {
      id: 820982911946154500,
      token: "d0e5c6e4b2e1a5d0f2f9a7c8b5d3e1",
      email: "jon@example.com",
      abandoned_checkout_url: "https://example.myshopify.com/cart/checkout/1",
      total_price: "199.00",
      currency: "USD",
      customer: {
        id: 115310627314723954,
        email: "jon@example.com",
        first_name: "Jon",
        last_name: "Doe",
        phone: "+16135550123",
      },
    },
  },
  {
    topic: "checkouts/update",
    label: "Checkout updated",
    sample: {
      id: 820982911946154500,
      token: "d0e5c6e4b2e1a5d0f2f9a7c8b5d3e1",
      email: "jon@example.com",
      abandoned_checkout_url: "https://example.myshopify.com/cart/checkout/1",
      total_price: "199.00",
      currency: "USD",
    },
  },
];

export function getShopifyTopicSample(topic: string): Record<string, unknown> | undefined {
  return shopifyTopicSamples.find((t) => t.topic === topic)?.sample;
}

/**
 * Flatten a sample payload into JSON-path variable definitions, mirroring the
 * webhooks-v2 variable selector format.
 */
export function flattenSampleVariables(
  sample: Record<string, unknown>
): { path: string; label: string }[] {
  const results: { path: string; label: string }[] = [];

  function recurse(value: unknown, path: string) {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => recurse(item, path ? `${path}.${i}` : String(i)));
      return;
    }
    if (typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        recurse(child, path ? `${path}.${key}` : key);
      }
      return;
    }
    results.push({ path, label: path.split(".").pop() ?? path });
  }

  recurse(sample, "");
  return results;
}
