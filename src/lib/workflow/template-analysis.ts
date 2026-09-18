/**
 * Mirror of Pinggo's `analyzeTemplate` helper (webhooks-v2 template-node-handler).
 * The backend message-flow executor reads this analysis to know how many body /
 * header variables a WhatsApp template has, so it can resolve `{{1}}..{{n}}`
 * placeholders from the mapped webhook variables.
 */

export interface TemplateAnalysis {
  hasHeader: boolean;
  headerFormat: string | null;
  hasHeaderMedia: boolean;
  headerVariableCount: number;
  bodyVariableCount: number;
  isCarousel: boolean;
  hasButtons: boolean;
  buttonCount: number;
  hasDynamicUrl: boolean;
  hasCopyCode: boolean;
  hasOtpButton: boolean;
  hasQuickReply: boolean;
  hasFlowButton: boolean;
  flowButtons: Array<{ index: number; text: string; flow_id: string; navigate_screen: string }>;
  category: string;
  isAuthentication: boolean;
}

type Component = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function analyzeTemplate(template: {
  components?: Component[];
  category?: string;
}): TemplateAnalysis {
  const components: Component[] = template?.components ?? [];

  const headerComponent = components.find((c) => c.type === "HEADER");
  const bodyComponent = components.find((c) => c.type === "BODY");
  const buttonsComponent = components.find((c) => c.type === "BUTTONS");

  const carouselComponent = components.find((c) => c.type === "CAROUSEL");
  const carouselCards = isRecord(carouselComponent) && Array.isArray(carouselComponent.cards)
    ? (carouselComponent.cards as Component[])
    : [];
  const isCarousel = !!carouselComponent;

  const headerFormat = str(headerComponent?.format).toLowerCase() || null;

  const analysis: TemplateAnalysis = {
    hasHeader: !!headerComponent,
    headerFormat,
    hasHeaderMedia: ["IMAGE", "VIDEO", "DOCUMENT"].includes(str(headerComponent?.format)),
    headerVariableCount: 0,
    bodyVariableCount: 0,
    isCarousel,
    hasButtons: !!buttonsComponent,
    buttonCount: Array.isArray(buttonsComponent?.buttons)
      ? (buttonsComponent?.buttons as unknown[]).length
      : 0,
    hasDynamicUrl: false,
    hasCopyCode: false,
    hasOtpButton: false,
    hasQuickReply: false,
    hasFlowButton: false,
    flowButtons: [],
    category: str(template?.category) || "MARKETING",
    isAuthentication: template?.category === "AUTHENTICATION",
  };

  if (str(headerComponent?.format) === "TEXT" && typeof headerComponent?.text === "string") {
    const matches = headerComponent.text.match(/\{\{\d+\}\}/g);
    analysis.headerVariableCount = matches?.length || 0;
  }

  if (typeof bodyComponent?.text === "string") {
    const matches = bodyComponent.text.match(/\{\{\d+\}\}/g);
    analysis.bodyVariableCount = matches?.length || 0;
  } else if (isCarousel && carouselCards.length > 0) {
    analysis.bodyVariableCount = carouselCards.reduce((max: number, card: Component) => {
      const cardBody = (card?.components as Component[] | undefined)?.find((c) => c.type === "BODY");
      const count = (typeof cardBody?.text === "string" ? cardBody.text.match(/\{\{\d+\}\}/g)?.length : 0) ?? 0;
      return Math.max(max, count);
    }, 0);
  }

  const allButtons: unknown[] = Array.isArray(buttonsComponent?.buttons)
    ? (buttonsComponent?.buttons as unknown[])
    : [];
  allButtons.forEach((rawButton) => {
    if (!isRecord(rawButton)) return;
    const button = rawButton as Record<string, unknown>;
    const type = str(button.type);
    const example = button.example;
    if (type === "URL" && Array.isArray(example) && example.length > 0) analysis.hasDynamicUrl = true;
    if (type === "COPY_CODE") analysis.hasCopyCode = true;
    if (type === "OTP") analysis.hasOtpButton = true;
    if (type === "QUICK_REPLY") analysis.hasQuickReply = true;
    if (type === "FLOW") {
      analysis.hasFlowButton = true;
      analysis.flowButtons.push({
        index: analysis.flowButtons.length,
        text: str(button.text),
        flow_id: str(button.flow_id),
        navigate_screen: str(button.navigate_screen),
      });
    }
  });

  return analysis;
}
