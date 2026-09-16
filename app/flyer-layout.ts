import qrcode from "qrcode-generator";
import { Campaign, Template } from "./model";
export function slotNumber(c: Campaign, index: number) {
  return c.items[index].slot ?? index;
}
export function pageCount(c: Campaign, t: Template) {
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
export function slotRects(t: Template) {
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
