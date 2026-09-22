import { z } from "zod";

const image = z
  .string()
  .max(500)
  .refine(
    (v) =>
      v === "" ||
      /^\/products\/[a-z0-9-]+\.(jpg|png)$/.test(v) ||
      /^\/api\/assets\/[0-9a-f-]{36}$/.test(v) ||
      v.startsWith("data:image/") ||
      v.startsWith("/templates/") ||
      v.startsWith("http://") ||
      v.startsWith("https://"),
    "Invalid image reference",
  );

const location = z
  .string()
  .max(500)
  .refine(
    (v) => !v || (/^https?:\/\//.test(v) && URL.canParse(v)),
    "Enter a valid http or https location link",
  );

export const branchSchema = z.object({
  id: z.string().max(80).optional(),
  name: z.string().max(60),
  address: z.string().max(200),
  phone: z.string().max(40).optional(),
  url: location.optional(),
  mapUrl: location.optional(),
  locationUrl: location.optional(),
  qrDestination: z.string().max(500).optional(),
});

export const brandSchema = z.object({
  name: z.string().min(1).max(80),
  address: z.string().max(200),
  phone: z.string().max(50),
  currency: z.string().min(1).max(10),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  logo: image,
  terms: z.string().max(300),
  arabicName: z.string().max(100).optional(),
  timings: z.string().max(120).optional(),
  locationUrl: location.optional(),
  branches: z.array(branchSchema).max(15).optional(),
});

export const businessProfileSchema = z.object({
  id: z.string().max(80),
  name: z.string().min(1).max(80),
  arabicName: z.string().max(100).optional(),
  logo: image,
  secondaryLogo: image.optional(),
  phone: z.string().max(50),
  whatsapp: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  address: z.string().max(200),
  branches: z.array(branchSchema).max(20),
  socialLinks: z
    .object({
      instagram: z.string().max(100).optional(),
      facebook: z.string().max(100).optional(),
      twitter: z.string().max(100).optional(),
      tiktok: z.string().max(100).optional(),
    })
    .optional(),
  defaultCurrency: z.string().min(1).max(10),
  defaultLanguage: z.enum(["en", "ar", "bilingual"]),
  brandColors: z.object({
    primary: z.string().regex(/^#[0-9a-f]{6}$/i),
    secondary: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    background: z.string().optional(),
  }),
  defaultTypography: z
    .object({
      headingFont: z.string().max(50).optional(),
      bodyFont: z.string().max(50).optional(),
    })
    .optional(),
  defaultQrDestination: z.string().max(500).optional(),
  terms: z.string().max(500).optional(),
  timings: z.string().max(150).optional(),
});

export const productSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(150),
  arabicName: z.string().max(150).optional(),
  pack: z.string().max(60),
  category: z.string().max(60),
  price: z.number().finite().min(0).max(999999),
  image,
  sku: z.string().max(100),
  description: z.string().max(300).optional(),
  promotionalText: z.string().max(100).optional(),
});

export const borderSettingsSchema = z.object({
  enabled: z.boolean(),
  width: z.number().min(0).max(20),
  color: z.string(),
  style: z.enum(["solid", "dashed", "dotted", "none"]),
});

export const cellTextSchema = z.object({
  content: z.string().max(1000),
  color: z.string().optional(),
  size: z.number().optional(),
  weight: z.union([z.string(), z.number()]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  vAlign: z.enum(["top", "middle", "bottom"]).optional(),
  lineHeight: z.number().optional(),
  fontFamily: z.string().optional(),
});

export const templateSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  columns: z.number().int().min(2).max(6),
  capacity: z.number().int().min(2).max(24),
  style: z.string().max(40),
  category: z.string().max(40).optional(),
  description: z.string().max(200).optional(),
  tags: z.array(z.string().max(30)).optional(),
  artwork: z
    .string()
    .refine(
      (v) =>
        v === "/templates/artisan-higgsfield.png" ||
        /^\/api\/assets\/[0-9a-f-]{36}$/.test(v) ||
        v.startsWith("/templates/"),
      "Invalid template artwork",
    )
    .optional(),
});

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !isNaN(Date.parse(s)));

export const offerSchema = productSchema.extend({
  offer: z.number().finite().min(0).max(999999),
  badge: z.string().max(50),
  showOldPrice: z.boolean().optional(),
  slot: z.number().int().min(0).max(250).optional(),
  box: z
    .object({
      x: z.number().finite().min(0).max(794),
      y: z.number().finite().min(0).max(1123),
      w: z.number().finite().min(40).max(794),
      h: z.number().finite().min(40).max(1123),
    })
    .optional(),
});

export const backgroundSettingSchema = z.object({
  type: z.enum(["solid", "gradient", "image", "preset"]),
  color: z.string().optional(),
  gradient: z.string().optional(),
  imageUrl: z.string().optional(),
  presetId: z.string().optional(),
});

export const gridCellSchema = z.object({
  id: z.string().max(80),
  row: z.number().int().min(0).max(15),
  col: z.number().int().min(0).max(15),
  rowSpan: z.number().int().min(1).max(15),
  colSpan: z.number().int().min(1).max(15),
  hidden: z.boolean().optional(),
  borders: z
    .object({
      top: borderSettingsSchema.optional(),
      right: borderSettingsSchema.optional(),
      bottom: borderSettingsSchema.optional(),
      left: borderSettingsSchema.optional(),
    })
    .optional(),
  background: z.string().optional(),
  contentType: z.enum(["product", "banner", "text", "image", "empty"]),
  product: offerSchema.optional(),
  text: cellTextSchema.optional(),
  banner: z
    .object({
      title: z.string().max(150),
      subtitle: z.string().max(200).optional(),
      badge: z.string().max(50).optional(),
      bg: z.string().optional(),
      textColor: z.string().optional(),
    })
    .optional(),
  image: z.string().optional(),
});

export const gridModelSchema = z.object({
  id: z.string().max(80),
  rows: z.number().int().min(1).max(12),
  cols: z.number().int().min(1).max(8),
  gap: z.number().min(0).max(50),
  padding: z.number().min(0).max(50),
  outerBorder: borderSettingsSchema,
  innerBorder: borderSettingsSchema,
  cells: z.array(gridCellSchema).max(100),
});

export const flyerSectionSchema = z.object({
  id: z.string().max(80),
  type: z.enum([
    "hero",
    "grid",
    "banner",
    "special_offer",
    "text",
    "image",
    "highlight",
    "qr_location",
    "footer",
  ]),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(300).optional(),
  badge: z.string().max(60).optional(),
  background: backgroundSettingSchema.optional(),
  height: z.number().optional(),
  grid: gridModelSchema.optional(),
  banner: z.any().optional(),
  specialOffer: z.any().optional(),
  textBlock: cellTextSchema.optional(),
  imageBlock: z.any().optional(),
  highlight: z.any().optional(),
  qrLocation: z.any().optional(),
  footer: z.any().optional(),
});

export const flyerPageSchema = z.object({
  id: z.string().max(80),
  name: z.string().max(100),
  templateId: z.string().max(80).optional(),
  background: backgroundSettingSchema,
  sections: z.array(flyerSectionSchema).max(20),
});

export const flyerDocumentSchema = z.object({
  id: z.string().max(80),
  businessId: z.string().max(80),
  name: z.string().max(120),
  status: z.enum(["draft", "ready", "archived"]),
  pages: z.array(flyerPageSchema).max(50),
  created: z.string().max(50),
  updated: z.string().max(50),
  headline: z.string().max(150).optional(),
  start: date.optional(),
  end: date.optional(),
  brand: brandSchema.optional(),
});

export const businessRecordSchema = z.object({
  id: z.string().max(80),
  name: z.string().min(1).max(80),
  profile: businessProfileSchema,
  products: z.array(productSchema).max(2000),
  flyers: z.array(flyerDocumentSchema).max(200),
  customTemplates: z.array(templateSchema).max(100),
});

export const campaignSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(100),
  headline: z.string().max(150),
  start: date,
  end: date,
  template: z.string().max(80),
  templateSnapshot: templateSchema.optional(),
  items: z.array(offerSchema).max(150),
  brand: brandSchema,
  updated: z.string().max(50),
  status: z.enum(["draft", "ready"]),
  flyerDoc: flyerDocumentSchema.optional(),
});

export const workspaceSchema = z
  .object({
    activeBusinessId: z.string().max(80).optional(),
    businesses: z.array(businessRecordSchema).max(50).optional(),
    products: z.array(productSchema).max(2000),
    campaigns: z.array(campaignSchema).max(200),
    brand: brandSchema,
    customTemplates: z.array(templateSchema).max(100),
  })
  .superRefine((v, c) => {
    for (const [k, a] of Object.entries({
      products: v.products,
      campaigns: v.campaigns,
      customTemplates: v.customTemplates,
    })) {
      if (new Set(a.map((x) => x.id)).size !== a.length)
        c.addIssue({ code: "custom", message: "Duplicate " + k + " IDs" });
    }
  });
