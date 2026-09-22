export type Product = {
  id: string;
  name: string;
  arabicName?: string;
  pack: string;
  category: string;
  price: number;
  image: string;
  sku: string;
  description?: string;
  promotionalText?: string;
};

/**
 * Free position of one product card on a flyer page.
 * Coordinates are in flyer units (the A4 portrait page is 794 x 1123).
 */
export type Box = { x: number; y: number; w: number; h: number };

export type Offer = Product & {
  offer: number;
  badge: string;
  showOldPrice?: boolean;
  slot?: number;
  box?: Box;
};

export type BranchLocation = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  url?: string;
  mapUrl?: string;
  locationUrl?: string;
  qrDestination?: string;
};

export type Brand = {
  name: string;
  address: string;
  phone: string;
  currency: string;
  color: string;
  logo: string;
  terms: string;
  arabicName?: string;
  locationUrl?: string;
  branches?: { name: string; address: string; url: string }[];
  timings?: string;
};

export type BusinessProfile = {
  id: string;
  name: string;
  arabicName?: string;
  logo: string;
  secondaryLogo?: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  address: string;
  branches: BranchLocation[];
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
  };
  defaultCurrency: string; // "AED"
  defaultLanguage: "en" | "ar" | "bilingual";
  brandColors: {
    primary: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  defaultTypography?: {
    headingFont?: string;
    bodyFont?: string;
  };
  defaultQrDestination?: string;
  terms?: string;
  timings?: string;
};

export type BorderSettings = {
  enabled?: boolean;
  style: "none" | "solid" | "dashed" | "dotted";
  width: number;
  color: string;
};

export type CellTextSettings = {
  content: string;
  color?: string;
  size?: number;
  weight?: string | number;
  align?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
  lineHeight?: number;
  fontFamily?: string;
};

export type GridCell = {
  id: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  hidden?: boolean;
  mergedInto?: string;
  borders?: {
    top?: BorderSettings;
    right?: BorderSettings;
    bottom?: BorderSettings;
    left?: BorderSettings;
  };
  background?: string;
  contentType: "product" | "banner" | "text" | "image" | "empty";
  product?: Offer;
  text?: CellTextSettings;
  banner?: {
    title: string;
    subtitle?: string;
    badge?: string;
    bg?: string;
    textColor?: string;
  };
  image?: string;
};

export type GridModel = {
  id: string;
  rows: number;
  cols: number;
  gap: number;
  padding: number;
  outerBorder: BorderSettings;
  innerBorder: BorderSettings;
  cells: GridCell[];
};

export type SectionType =
  | "hero"
  | "grid"
  | "banner"
  | "special_offer"
  | "text"
  | "image"
  | "highlight"
  | "qr_location"
  | "footer";

export type BackgroundSetting = {
  type: "solid" | "gradient" | "image" | "preset";
  color?: string;
  gradient?: string;
  imageUrl?: string;
  presetId?: string;
};

export type FlyerSection = {
  id: string;
  type: SectionType;
  title?: string;
  arabicTitle?: string;
  subtitle?: string;
  badge?: string;
  background?: BackgroundSetting;
  height?: number;
  grid?: GridModel;
  banner?: {
    title: string;
    subtitle?: string;
    badge?: string;
    cta?: string;
    products?: Offer[];
    style?: string;
  };
  specialOffer?: {
    title: string;
    subtitle?: string;
    badge?: string;
    products: Offer[];
    columns?: number;
  };
  textBlock?: CellTextSettings;
  imageBlock?: {
    url: string;
    fit?: "contain" | "cover";
    caption?: string;
  };
  highlight?: {
    product: Offer;
    headline?: string;
    badge?: string;
  };
  qrLocation?: {
    branchId?: string;
    customUrl?: string;
    note?: string;
  };
  footer?: {
    showBranches?: boolean;
    showTerms?: boolean;
    showQr?: boolean;
    customText?: string;
  };
};

export type FlyerPage = {
  id: string;
  name: string;
  templateId?: string;
  background: BackgroundSetting;
  sections: FlyerSection[];
};

export type FlyerDocument = {
  id: string;
  businessId: string;
  name: string;
  status: "draft" | "ready" | "archived";
  pages: FlyerPage[];
  created: string;
  updated: string;
  headline?: string;
  start?: string;
  end?: string;
  brand?: Brand;
};

export type BusinessRecord = {
  id: string;
  name: string;
  profile: BusinessProfile;
  products: Product[];
  flyers: FlyerDocument[];
  customTemplates: Template[];
};

export type ModernWorkspace = {
  activeBusinessId: string;
  businesses: BusinessRecord[];
  products: Product[];
  campaigns: Campaign[];
  brand: Brand;
  customTemplates: Template[];
};

export type Campaign = {
  id: string;
  name: string;
  headline: string;
  start: string;
  end: string;
  template: string;
  templateSnapshot?: Template;
  items: Offer[];
  brand: Brand;
  updated: string;
  status: "draft" | "ready";
  flyerDoc?: FlyerDocument;
};

export type Template = {
  id: string;
  name: string;
  color: string;
  accent: string;
  columns: number;
  capacity: number;
  style: string;
  artwork?: string;
  description?: string;
  category?: string;
  tags?: string[];
  defaultSections?: SectionType[];
};

export const defaultBackgroundPresets = [
  { id: "bg-grocery-green", name: "Fresh Market Greens", category: "Grocery", gradient: "linear-gradient(135deg, #166534 0%, #0d3b1e 100%)", color: "#166534" },
  { id: "bg-super-red", name: "Supermarket Red Deal", category: "Supermarket", gradient: "linear-gradient(135deg, #dc2626 0%, #881337 100%)", color: "#dc2626" },
  { id: "bg-gold-ramadan", name: "Ramadan Crescent Gold", category: "Ramadan", gradient: "linear-gradient(135deg, #2e1065 0%, #0f172a 60%, #b45309 100%)", color: "#2e1065" },
  { id: "bg-eid-festive", name: "Eid Festival Emerald", category: "Eid", gradient: "linear-gradient(135deg, #064e3b 0%, #022c22 60%, #f59e0b 100%)", color: "#064e3b" },
  { id: "bg-weekend-sun", name: "Weekend Sunshine", category: "Weekend Sale", gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)", color: "#f59e0b" },
  { id: "bg-clearance-bold", name: "Clearance Flame", category: "Clearance", gradient: "linear-gradient(135deg, #18181b 0%, #ef4444 100%)", color: "#18181b" },
  { id: "bg-back-to-school", name: "Back To School Yellow", category: "Seasonal", gradient: "linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)", color: "#1e3a8a" },
  { id: "bg-clean-white", name: "Clean Minimal Studio", category: "Minimal", gradient: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)", color: "#ffffff" },
  { id: "bg-gift-market", name: "Royal Gift Market", category: "Gift Market", gradient: "linear-gradient(135deg, #4a044e 0%, #1e1b4b 100%)", color: "#4a044e" },
  { id: "bg-hyper-blue", name: "Hyper Value Blue", category: "Supermarket", gradient: "linear-gradient(135deg, #1d4ed8 0%, #1e1b4b 100%)", color: "#1d4ed8" },
];

export const templates: Template[] = [
  {
    id: "fresh",
    name: "Fresh market",
    color: "#166534",
    accent: "#f5d54b",
    columns: 3,
    capacity: 6,
    style: "fresh",
    category: "Supermarket",
    defaultSections: ["hero", "grid", "footer"],
  },
  {
    id: "bold",
    name: "Big deal energy",
    color: "#d62e35",
    accent: "#ffda43",
    columns: 3,
    capacity: 9,
    style: "bold",
    category: "Supermarket",
    defaultSections: ["hero", "grid", "footer"],
  },
  {
    id: "night",
    name: "Midnight specials",
    color: "#172554",
    accent: "#b6ed58",
    columns: 2,
    capacity: 6,
    style: "night",
    category: "Weekend Sale",
    defaultSections: ["hero", "grid", "footer"],
  },
  {
    id: "minimal",
    name: "The essentials",
    color: "#272b29",
    accent: "#e9ece7",
    columns: 2,
    capacity: 4,
    style: "minimal",
    category: "Minimal",
    defaultSections: ["hero", "grid", "footer"],
  },
  {
    id: "citrus",
    name: "Weekend sunshine",
    color: "#ba4e10",
    accent: "#ffde73",
    columns: 3,
    capacity: 6,
    style: "citrus",
    category: "Weekend Sale",
    defaultSections: ["hero", "grid", "footer"],
  },
  {
    id: "blue",
    name: "Everyday value",
    color: "#164db0",
    accent: "#bde7ff",
    columns: 3,
    capacity: 9,
    style: "blue",
    category: "Supermarket",
    defaultSections: ["hero", "grid", "footer"],
  },
  {
    id: "ramadan-kareem",
    name: "Ramadan Mubarak Deals",
    color: "#2e1065",
    accent: "#fbbf24",
    columns: 3,
    capacity: 6,
    style: "festive",
    category: "Ramadan",
    defaultSections: ["hero", "special_offer", "grid", "footer"],
  },
  {
    id: "clearance-mega",
    name: "Clearance Mega Sale",
    color: "#b91c1c",
    accent: "#fef08a",
    columns: 3,
    capacity: 9,
    style: "bold",
    category: "Clearance",
    defaultSections: ["banner", "grid", "footer"],
  },
  {
    id: "artisan-market-v1",
    name: "Artisan market",
    color: "#4b1230",
    accent: "#e8c487",
    columns: 3,
    capacity: 6,
    style: "artisan",
    category: "Gift Market",
    artwork: "/templates/artisan-higgsfield.png",
  },
  {
    id: "deli-edit-v1",
    name: "The deli edit",
    color: "#4b1230",
    accent: "#b68d50",
    columns: 2,
    capacity: 4,
    style: "editorial",
    category: "Grocery",
    artwork: "/templates/artisan-higgsfield.png",
  },
  {
    id: "weekend-collection-v1",
    name: "Weekend collection",
    color: "#38172c",
    accent: "#e8c487",
    columns: 3,
    capacity: 9,
    style: "boutique",
    category: "Weekend Sale",
    artwork: "/templates/artisan-higgsfield.png",
  },
];

export const defaultBrand: Brand = {
  name: "GREEN BASKET",
  arabicName: "السلة الخضراء",
  address: "Your neighborhood supermarket",
  phone: "+971 4 123 4567",
  currency: "AED",
  color: "#166534",
  logo: "",
  terms: "Offers valid while stocks last. Images are for illustration.",
  timings: "Open Daily 8:00 AM – 12:00 Midnight",
  locationUrl: "https://maps.google.com",
  branches: [
    { name: "Main Branch", address: "Al Rigga, Deira, Dubai", url: "https://maps.google.com" },
    { name: "Branch 2", address: "Electra Street, Abu Dhabi", url: "https://maps.google.com" },
    { name: "Branch 3", address: "Sanaiya, Al Ain", url: "https://maps.google.com" },
  ],
};

export const sampleProducts: Product[] = [
  ["bananas", "Fresh Bananas", "موز طازج", "1 kg", "Fruit", 7.95],
  ["apples", "Royal Gala Apples", "تفاح رويال جالا", "1 kg", "Fruit", 12.5],
  ["tomatoes", "Vine Tomatoes", "طماطم معلقة", "1 kg", "Vegetables", 8.95],
  ["avocado", "Ripe Hass Avocado", "أفوكادو هاس", "2 pieces", "Fruit", 14.95],
  ["oranges", "Sweet Navel Oranges", "برتقال أبو سرة", "1 kg", "Fruit", 9.95],
  ["broccoli", "Fresh Green Broccoli", "بروكلي طازج", "500 g", "Vegetables", 10.5],
].map(([id, name, arabicName, pack, category, price]) => ({
  id: String(id),
  name: String(name),
  arabicName: String(arabicName),
  pack: String(pack),
  category: String(category),
  price: Number(price),
  image: "/products/" + id + ".png",
  sku: "SKU-" + String(id).toUpperCase(),
}));

export function brandToBusinessProfile(brand: Partial<Brand>, id = "biz-default"): BusinessProfile {
  return {
    id,
    name: brand.name || "My Business",
    arabicName: brand.arabicName || "",
    logo: brand.logo || "",
    secondaryLogo: "",
    phone: brand.phone || "",
    whatsapp: brand.phone || "",
    website: brand.locationUrl || "",
    address: brand.address || "",
    branches: (brand.branches || []).map((b, i) => ({
      id: `branch-${i + 1}`,
      name: b.name,
      address: b.address,
      url: b.url || "",
      locationUrl: b.url || "",
      qrDestination: b.url || "",
    })),
    defaultCurrency: brand.currency || "AED",
    defaultLanguage: "en",
    brandColors: {
      primary: brand.color || "#166534",
      secondary: "#f5d54b",
      accent: "#ffda43",
      background: "#ffffff",
    },
    terms: brand.terms || "Offers valid while stocks last. Images are for illustration purposes.",
    timings: brand.timings || "Open Daily 8:00 AM – 12:00 Midnight",
    defaultQrDestination: brand.locationUrl || "",
  };
}

export function businessProfileToBrand(profile: BusinessProfile): Brand {
  return {
    name: profile.name,
    arabicName: profile.arabicName,
    address: profile.address,
    phone: profile.phone,
    currency: profile.defaultCurrency || "AED",
    color: profile.brandColors?.primary || "#166534",
    logo: profile.logo || "",
    terms: profile.terms || "",
    timings: profile.timings,
    locationUrl: profile.defaultQrDestination || profile.branches?.[0]?.url || "",
    branches: (profile.branches || []).map((b) => ({
      name: b.name,
      address: b.address,
      url: b.url || b.locationUrl || "",
    })),
  };
}

export function createDefaultGrid(rows = 3, cols = 3, products: Offer[] = []): GridModel {
  const cells: GridCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      cells.push({
        id: `cell-${r}-${c}`,
        row: r,
        col: c,
        rowSpan: 1,
        colSpan: 1,
        hidden: false,
        borders: {
          top: { enabled: true, width: 1, color: "#e2e8e1", style: "solid" },
          right: { enabled: true, width: 1, color: "#e2e8e1", style: "solid" },
          bottom: { enabled: true, width: 1, color: "#e2e8e1", style: "solid" },
          left: { enabled: true, width: 1, color: "#e2e8e1", style: "solid" },
        },
        background: "#ffffff",
        contentType: products[idx] ? "product" : "empty",
        product: products[idx],
      });
    }
  }
  return {
    id: crypto.randomUUID(),
    rows,
    cols,
    gap: 8,
    padding: 6,
    outerBorder: { enabled: true, width: 1.5, color: "#cbd5e1", style: "solid" },
    innerBorder: { enabled: true, width: 1, color: "#e2e8e1", style: "solid" },
    cells,
  };
}

export function createDefaultPage(
  name: string,
  templateId = "fresh",
  isFirstPage = true,
  products: Offer[] = [],
): FlyerPage {
  const t = templates.find((tpl) => tpl.id === templateId) || templates[0];
  const sections: FlyerSection[] = [];

  const isGrocery = templateId === "grocery" || templateId === "deli-edit-v1";
  const isClearance = templateId === "clearance" || templateId === "minimal-deal-v1";
  const isWeekend = templateId === "weekend" || templateId === "weekend-collection-v1";

  if (isClearance) {
    sections.push({
      id: crypto.randomUUID(),
      type: "special_offer",
      title: "CLEARANCE SALE",
      subtitle: "UP TO 70% OFF",
      badge: "LIMITED STOCK",
      height: 220,
      specialOffer: {
        title: "CLEARANCE SALE",
        subtitle: "UP TO 70% OFF",
        badge: "LIMITED STOCK",
        products: products.slice(0, 3),
      },
    });
  } else if (isFirstPage && !isGrocery) {
    sections.push({
      id: crypto.randomUUID(),
      type: "hero",
      title: isWeekend ? "WEEKEND MEGA SALE" : "FRESH FINDS. BIG SAVINGS.",
      subtitle: isWeekend
        ? "Huge price cuts across grocery and electronics this weekend only"
        : "Weekly exclusive promotional deals across all departments",
      badge: isWeekend ? "WEEKEND SPECIAL" : "WEEKLY OFFERS",
      background: {
        type: "preset",
        presetId: isWeekend ? "bg-weekend-gold" : "bg-grocery-green",
        color: t.color,
      },
      height: 310,
    });
  }

  const remainingProducts = isClearance ? products.slice(3) : products;
  const gridRows = Math.ceil(t.capacity / t.columns);
  sections.push({
    id: crypto.randomUUID(),
    type: "grid",
    title: isFirstPage ? "Featured Fresh Picks" : "Special Offers",
    grid: createDefaultGrid(gridRows, t.columns, remainingProducts.slice(0, t.capacity)),
  });

  sections.push({
    id: crypto.randomUUID(),
    type: "footer",
    footer: {
      showBranches: true,
      showTerms: true,
      showQr: true,
      customText: "Offers valid while stocks last · Bulk purchase not allowed",
    },
  });

  return {
    id: crypto.randomUUID(),
    name,
    templateId,
    background: { type: "solid", color: "#ffffff" },
    sections,
  };
}

export function migrateCampaignToFlyer(c: Campaign, businessId = "biz-default"): FlyerDocument {
  if (c.flyerDoc && Array.isArray(c.flyerDoc.pages) && c.flyerDoc.pages.length > 0) {
    return {
      ...c.flyerDoc,
      id: c.id,
      businessId,
      name: c.name,
      status: c.status,
      updated: c.updated,
      headline: c.headline,
      start: c.start,
      end: c.end,
      brand: c.brand,
    };
  }

  const t = templates.find((tpl) => tpl.id === c.template) || templates[0];
  const capacity = t.capacity || 6;
  const totalItems = c.items?.length || 0;
  const numPages = Math.max(1, Math.ceil(totalItems / capacity));
  const pages: FlyerPage[] = [];

  for (let p = 0; p < numPages; p++) {
    const pageSlice = c.items.slice(p * capacity, (p + 1) * capacity);
    const isFirst = p === 0;
    const page = createDefaultPage(
      `Page ${p + 1}`,
      c.template || "fresh",
      isFirst,
      pageSlice,
    );
    if (isFirst && c.headline) {
      const hero = page.sections.find((s) => s.type === "hero");
      if (hero) hero.title = c.headline.replace(/\n/g, " ");
    }
    pages.push(page);
  }

  return {
    id: c.id,
    businessId,
    name: c.name,
    status: c.status || "draft",
    pages,
    created: new Date().toISOString(),
    updated: c.updated || new Date().toISOString(),
    headline: c.headline,
    start: c.start,
    end: c.end,
    brand: c.brand,
  };
}

export function flyerToCampaign(f: FlyerDocument): Campaign {
  const items: Offer[] = [];
  let slotCounter = 0;
  for (const page of f.pages) {
    for (const sec of page.sections) {
      if (sec.type === "grid" && sec.grid) {
        for (const cell of sec.grid.cells) {
          if (!cell.hidden && cell.product) {
            items.push({
              ...cell.product,
              slot: slotCounter++,
            });
          }
        }
      } else if (sec.type === "special_offer" && sec.specialOffer?.products) {
        for (const p of sec.specialOffer.products) {
          items.push({ ...p, slot: slotCounter++ });
        }
      }
    }
  }

  return {
    id: f.id,
    name: f.name,
    headline: f.headline || f.pages[0]?.sections.find((s) => s.type === "hero")?.title || "Weekly offers",
    start: f.start || new Date().toISOString().slice(0, 10),
    end: f.end || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    template: f.pages[0]?.templateId || "fresh",
    items,
    brand: f.brand || defaultBrand,
    updated: f.updated,
    status: f.status === "archived" ? "draft" : f.status,
    flyerDoc: f,
  };
}

export function newFlyer(
  businessId: string,
  brand: Brand,
  products: Product[] = [],
  demo = false,
): FlyerDocument {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = localDate(start);
  const endStr = localDate(end);

  const offers: Offer[] = products.map((p) => ({
    ...p,
    offer: Math.round(p.price * 0.75 * 100) / 100,
    badge: "-25%",
    showOldPrice: true,
  }));

  const page1 = createDefaultPage("Page 1 - Cover", "fresh", true, offers.slice(0, 6));
  const page2 = createDefaultPage("Page 2 - Grocery Deals", "blue", false, offers.slice(6, 12));

  return {
    id: crypto.randomUUID(),
    businessId,
    name: demo ? "Fresh Deals · Weekly Flyer" : "Untitled Promotional Flyer",
    status: "draft",
    pages: [page1, page2],
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    headline: "Fresh picks.\nBig savings.",
    start: startStr,
    end: endStr,
    brand,
  };
}

export function newCampaign(
  brand: Brand,
  products: Product[] = [],
  demo = false,
): Campaign {
  const flyer = newFlyer("biz-default", brand, products, demo);
  return flyerToCampaign(flyer);
}

function localDate(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
