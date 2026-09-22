import qrcode from "qrcode-generator";
import { Box, Campaign, Template } from "./model";

export type Rect = { x: number; y: number; w: number; h: number };

/** A4 portrait page, in flyer units. */
export const PAGE_W = 794;
export const PAGE_H = 1123;
/** Smallest product card a user can drag down to. */
export const MIN_BOX_W = 96;
export const MIN_BOX_H = 104;
/** Keep cards away from the trimmed edge of the sheet. */
const SAFE = 6;

export const clamp = (lo: number, v: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function slotNumber(c: Campaign, index: number) {
  return c.items[index].slot ?? index;
}
export function pageCount(c: Campaign, t: Template) {
  if (c.flyerDoc?.pages && c.flyerDoc.pages.length > 0) {
    return c.flyerDoc.pages.length;
  }
  return Math.max(
    1,
    Math.ceil(
      Math.max(0, ...c.items.map((_, i) => slotNumber(c, i) + 1)) / t.capacity,
    ),
  );
}
export function pageItems(c: Campaign, t: Template, page: number) {
  return Array.from({ length: t.capacity }, (_, i) =>
    c.items.find((_, j) => slotNumber(c, j) === page * t.capacity + i),
  );
}

/** The even grid a template starts from, before any custom placement. */
export function slotRects(t: Template): Rect[] {
  const wear = t.style.startsWith("wear-"),
    editorial = t.style === "editorial",
    compact = t.style === "boutique";
  const header = editorial ? 350 : compact ? 292 : 386;
  const start = wear ? 465 : t.artwork ? header + (editorial ? 84 : 69) : 344;
  const margin = t.artwork && editorial ? 36 : wear ? 18 : 24,
    gap = wear ? 8 : t.artwork && editorial ? 22 : 12;
  const end = wear ? 979 : t.artwork ? 1020 : 1042;
  const rows = Math.ceil(t.capacity / t.columns),
    w = (794 - margin * 2 - gap * (t.columns - 1)) / t.columns,
    h = (end - start - gap * (rows - 1)) / rows;
  return Array.from({ length: t.capacity }, (_, i) => ({
    x: margin + (i % t.columns) * (w + gap),
    y: start + Math.floor(i / t.columns) * (h + gap),
    w,
    h,
  }));
}

/** Force a dragged box to stay whole, on the page, and above the minimum size. */
export function fitBox(box: Box): Box {
  const w = clamp(MIN_BOX_W, box.w, PAGE_W - SAFE * 2);
  const h = clamp(MIN_BOX_H, box.h, PAGE_H - SAFE * 2);
  return {
    x: Math.round(clamp(SAFE, box.x, PAGE_W - SAFE - w)),
    y: Math.round(clamp(SAFE, box.y, PAGE_H - SAFE - h)),
    w: Math.round(w),
    h: Math.round(h),
  };
}

/** Grid rects for one page, with each product's custom box applied on top. */
export function pageRects(c: Campaign, t: Template, page: number): Rect[] {
  const base = slotRects(t);
  const items = pageItems(c, t, page);
  return base.map((rect, i) =>
    items[i]?.box ? { ...fitBox(items[i]!.box as Box) } : rect,
  );
}

export function defaultRectForSlot(t: Template, slot: number): Rect {
  const rects = slotRects(t);
  return rects[slot % rects.length];
}

/** Relative lighten (positive) or darken (negative) of a #rrggbb colour. */
export function shade(hex: string, percent: number) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const num = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(num)) return hex;
  const amount = Math.round((255 * percent) / 100);
  const channel = (c: number) => clamp(0, c + amount, 255);
  const r = channel((num >> 16) & 255),
    g = channel((num >> 8) & 255),
    b = channel(num & 255);
  return (
    "#" +
    [r, g, b]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function gradientId(prefix: string, t: Template) {
  return (
    prefix +
    "-" +
    t.id.replace(/[^a-zA-Z0-9_-]/g, "") +
    "-" +
    t.color.replace("#", "")
  );
}
export function qrSvg(value: string, x: number, y: number, size: number) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    const qr = qrcode(0, "M");
    qr.addData(url.href, "Byte");
    qr.make();
    const n = qr.getModuleCount(),
      unit = size / (n + 8);
    let path = "";
    for (let row = 0; row < n; row++)
      for (let col = 0; col < n; col++)
        if (qr.isDark(row, col)) path += `M${col + 4} ${row + 4}h1v1h-1z`;
    return `<g transform="translate(${x} ${y})"><rect width="${size}" height="${size}" rx="2" fill="white"/><path transform="scale(${unit})" d="${path}" fill="black"/></g>`;
  } catch {
    return "";
  }
}
