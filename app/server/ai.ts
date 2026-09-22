import type { SqlDatabase } from "./database";
import type { Template } from "../model";

export function getAiConfig() {
  const processEnv = (typeof process !== "undefined" ? process.env : {}) as Record<
    string,
    string | undefined
  >;
  const globalEnv = ((typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).env) ||
    {}) as Record<string, string | undefined>;

  const apiKey = String(processEnv.OPENAI_API_KEY || globalEnv.OPENAI_API_KEY || "").trim();
  const model = String(processEnv.OPENAI_MODEL || globalEnv.OPENAI_MODEL || "gpt-4o").trim();
  const fallbackModel = String(
    processEnv.OPENAI_FALLBACK_MODEL || globalEnv.OPENAI_FALLBACK_MODEL || "gpt-4o-mini",
  ).trim();
  const falKey = String(processEnv.FAL_KEY || globalEnv.FAL_KEY || "").trim();

  return {
    apiKey,
    model,
    fallbackModel,
    falKey,
    hasOpenAi: Boolean(apiKey),
    hasFal: Boolean(falKey),
  };
}

export type AiTemplateRequest = {
  businessName: string;
  businessType?: string;
  themePrompt: string;
  category?: string;
  brandColors?: { primary: string; secondary?: string; accent?: string };
};

export type GeneratedTemplateResult = {
  template: Template;
  headlineEn: string;
  headlineAr: string;
  promoBadge: string;
  marketingCopy: string;
  suggestedSections: string[];
  bannerBg: string;
};

/**
 * Generates an end-to-end retail flyer template layout for a specific business
 * using OpenAI ChatGPT API, with high quality retail fallback.
 */
export async function generateTemplateWithAi(
  params: AiTemplateRequest,
): Promise<GeneratedTemplateResult> {
  const config = getAiConfig();
  const prompt = `You are a professional retail graphic designer specializing in high-converting promotional flyers for UAE supermarkets, hypermarkets, and retail stores.
Design a promotional flyer template for the following business:
- Business Name: ${params.businessName}
- Business Type: ${params.businessType || "Supermarket / Retail Store"}
- Promotion Theme/Campaign: ${params.themePrompt}
- Category: ${params.category || "General Promotion"}
- Brand Colors: Primary ${params.brandColors?.primary || "#166534"}, Accent ${params.brandColors?.accent || "#f5d54b"}

Respond strictly with valid JSON with the following structure (no markdown fences, no raw text):
{
  "name": "Template Display Name",
  "style": "bold | fresh | festive | minimal | modern | energetic",
  "primaryColorHex": "#rrggbb",
  "accentColorHex": "#rrggbb",
  "columns": 3,
  "capacity": 6,
  "headlineEn": "English promotional headline",
  "headlineAr": "Arabic headline with authentic retail phrasing (e.g. عروض نهاية الأسبوع or توفير لا يقاوم)",
  "promoBadge": "MEGA SALE | UP TO 50% OFF | BUY 2 GET 1 | WEEKEND SPECIAL",
  "marketingCopy": "Catchy 1-line subhead for UAE shoppers",
  "suggestedSections": ["hero", "special_offer", "grid", "footer"],
  "category": "Supermarket | Grocery | Clearance | Weekend Sale | Ramadan | Eid | Seasonal | Gift Market"
}`;

  if (config.hasOpenAi) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert retail flyer art director. Always return strict valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const tId = "ai-" + crypto.randomUUID().slice(0, 8);
          return {
            template: {
              id: tId,
              name: parsed.name || `${params.businessName} · ${params.themePrompt}`,
              color: parsed.primaryColorHex?.startsWith("#")
                ? parsed.primaryColorHex
                : params.brandColors?.primary || "#166534",
              accent: parsed.accentColorHex?.startsWith("#")
                ? parsed.accentColorHex
                : "#f5d54b",
              columns: Math.min(4, Math.max(2, Number(parsed.columns) || 3)),
              capacity: Math.min(12, Math.max(4, Number(parsed.capacity) || 6)),
              style: parsed.style || "bold",
              category: parsed.category || params.category || "General Promotion",
              description: `AI generated for ${params.businessName} (${params.themePrompt})`,
            },
            headlineEn: parsed.headlineEn || "MEGA SAVINGS FESTIVAL",
            headlineAr: parsed.headlineAr || "عروض التوفير الكبرى",
            promoBadge: parsed.promoBadge || "SPECIAL OFFER",
            marketingCopy: parsed.marketingCopy || "Unbeatable prices on all your weekly essentials",
            suggestedSections: Array.isArray(parsed.suggestedSections)
              ? parsed.suggestedSections
              : ["hero", "grid", "footer"],
            bannerBg: parsed.primaryColorHex || "#166534",
          };
        }
      }
    } catch {
      // Fall through to algorithmic generator
    }
  }

  // Graceful high-quality algorithmic template fallback
  return generateAlgorithmicTemplate(params);
}

function generateAlgorithmicTemplate(params: AiTemplateRequest): GeneratedTemplateResult {
  const lower = (params.themePrompt + " " + (params.category || "")).toLowerCase();
  let primaryColor = params.brandColors?.primary || "#166534";
  let accentColor = params.brandColors?.accent || "#f5d54b";
  let style = "fresh";
  let headlineEn = "FRESH SAVINGS FOR YOU";
  let headlineAr = "عروض طازجة وتوفير مذهل";
  let promoBadge = "SPECIAL OFFER";
  let cols = 3;
  let cap = 6;
  let category = params.category || "Supermarket";

  if (lower.includes("ramadan") || lower.includes("iftar") || lower.includes("eid")) {
    primaryColor = "#2e1065";
    accentColor = "#fbbf24";
    style = "festive";
    headlineEn = "RAMADAN MUBARAK SPECIALS";
    headlineAr = "عروض رمضان الخير والبركة";
    promoBadge = "RAMADAN DEALS";
    category = "Ramadan";
  } else if (lower.includes("clearance") || lower.includes("mega") || lower.includes("crazy")) {
    primaryColor = "#b91c1c";
    accentColor = "#fef08a";
    style = "bold";
    headlineEn = "MEGA CLEARANCE SALE";
    headlineAr = "تصفية كبرى وتخفيضات هائلة";
    promoBadge = "UP TO 70% OFF";
    cols = 3;
    cap = 9;
    category = "Clearance";
  } else if (lower.includes("weekend") || lower.includes("friday") || lower.includes("saturday")) {
    primaryColor = "#ea580c";
    accentColor = "#fde047";
    style = "citrus";
    headlineEn = "WEEKEND SUPER SAVER";
    headlineAr = "عروض نهاية الأسبوع الخيالية";
    promoBadge = "WEEKEND ONLY";
    category = "Weekend Sale";
  } else if (lower.includes("fish") || lower.includes("meat") || lower.includes("butchery")) {
    primaryColor = "#0369a1";
    accentColor = "#7dd3fc";
    style = "blue";
    headlineEn = "FRESH FISH & MEAT FESTIVAL";
    headlineAr = "مهرجان اللحوم والأسماك الطازجة";
    promoBadge = "DAILY FRESH";
  }

  const tId = "ai-" + crypto.randomUUID().slice(0, 8);
  return {
    template: {
      id: tId,
      name: `${params.businessName} · ${params.themePrompt.slice(0, 30)}`,
      color: primaryColor,
      accent: accentColor,
      columns: cols,
      capacity: cap,
      style,
      category,
      description: `Tailored promotional design for ${params.businessName}`,
    },
    headlineEn,
    headlineAr,
    promoBadge,
    marketingCopy: "Exclusive retail promotions valid while stocks last",
    suggestedSections: ["hero", "special_offer", "grid", "footer"],
    bannerBg: primaryColor,
  };
}

/**
 * Server-side AI credit transaction deduction and ledger entry.
 */
export async function deductCredits(
  database: SqlDatabase,
  owner: string,
  amount: number,
  reason: string,
): Promise<boolean> {
  const current = await database
    .prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM credit_ledger WHERE owner=?")
    .bind(owner)
    .first<{ balance: number | string }>();

  const balance = Number(current?.balance ?? 0);
  if (balance < amount) {
    return false;
  }

  const ledgerId = "ai:" + crypto.randomUUID();
  const now = new Date().toISOString();
  await database
    .prepare("INSERT INTO credit_ledger (id, owner, delta, reason, created) VALUES (?, ?, ?, ?, ?)")
    .bind(ledgerId, owner, -Math.abs(amount), reason, now)
    .run();

  return true;
}

export async function addCredits(
  database: SqlDatabase,
  owner: string,
  amount: number,
  reason: string,
): Promise<void> {
  const ledgerId = "topup:" + crypto.randomUUID();
  const now = new Date().toISOString();
  await database
    .prepare("INSERT INTO credit_ledger (id, owner, delta, reason, created) VALUES (?, ?, ?, ?, ?)")
    .bind(ledgerId, owner, Math.abs(amount), reason, now)
    .run();
}
