export type Product = {
  id: string;
  name: string;
  arabicName?: string;
  pack: string;
  category: string;
  price: number;
  image: string;
  sku: string;
};
export type Offer = Product & {
  offer: number;
  badge: string;
  showOldPrice?: boolean;
  slot?: number;
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
};
export const templates: Template[] = [
  {
    id: "fresh",
    name: "Fresh market",
    color: "#166534",
    accent: "#f5d54b",
    columns: 3,
    capacity: 6,
    style: "fresh",
  },
  {
    id: "bold",
    name: "Big deal energy",
    color: "#d62e35",
    accent: "#ffda43",
    columns: 3,
    capacity: 9,
    style: "bold",
  },
  {
    id: "night",
    name: "Midnight specials",
    color: "#172554",
    accent: "#b6ed58",
    columns: 2,
    capacity: 6,
    style: "night",
  },
  {
    id: "minimal",
    name: "The essentials",
    color: "#272b29",
    accent: "#e9ece7",
    columns: 2,
    capacity: 4,
    style: "minimal",
  },
  {
    id: "citrus",
    name: "Weekend sunshine",
    color: "#ba4e10",
    accent: "#ffde73",
    columns: 3,
    capacity: 6,
    style: "citrus",
  },
  {
    id: "blue",
    name: "Everyday value",
    color: "#164db0",
    accent: "#bde7ff",
    columns: 3,
    capacity: 9,
    style: "blue",
  },
  {
    id: "artisan-market-v1",
    name: "Artisan market",
    color: "#4b1230",
    accent: "#e8c487",
    columns: 3,
    capacity: 6,
    style: "artisan",
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
    artwork: "/templates/artisan-higgsfield.png",
  },
];
export const defaultBrand: Brand = {
  name: "GREEN BASKET",
  address: "Your neighborhood supermarket",
  phone: "",
  currency: "AED",
  color: "#166534",
  logo: "",
  terms: "Offers valid while stocks last. Images are for illustration.",
};
export const sampleProducts: Product[] = [
  ["bananas", "Fresh bananas", "1 kg", "Fruit", 7.95],
  ["apples", "Royal Gala apples", "1 kg", "Fruit", 12.5],
  ["tomatoes", "Vine tomatoes", "1 kg", "Vegetables", 8.95],
  ["avocado", "Ripe avocados", "2 pieces", "Fruit", 14.95],
  ["oranges", "Sweet oranges", "1 kg", "Fruit", 9.95],
  ["broccoli", "Fresh broccoli", "500 g", "Vegetables", 10.5],
].map(([id, name, pack, category, price]) => ({
  id: String(id),
  name: String(name),
  pack: String(pack),
  category: String(category),
  price: Number(price),
  image: "/products/" + id + ".jpg",
  sku: "",
}));
export function newCampaign(
  brand: Brand,
  products: Product[] = [],
  demo = false,
): Campaign {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    id: crypto.randomUUID(),
    name: demo ? "Fresh finds · weekly offers" : "Untitled campaign",
    headline: "Fresh picks.\nBig savings.",
    start: localDate(start),
    end: localDate(end),
    template: "fresh",
    templateSnapshot: { ...templates[0], color: brand.color },
    items: products.map((p) => ({
      ...p,
      offer: Math.round(p.price * 0.75 * 100) / 100,
      badge: "",
    })),
    brand: { ...brand },
    updated: new Date().toISOString(),
    status: "draft",
  };
}

function localDate(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
