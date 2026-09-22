import { Campaign, Template } from "./model";

import {
  pageItems,
  pageCount,
  pageRects,
  qrSvg,
  clamp,
  shade,
  gradientId,
} from "./flyer-layout";

import { wearFlyer } from "./wear-flyer";
import { renderPageSvg } from "./flyer-renderer";

export const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );

function lines(s: string, max: number, count: number) {
  const result: string[] = [];
  for (const paragraph of s.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      if ((line + " " + word).trim().length > max && line) {
        result.push(line);
        line = word;
      } else line = (line + " " + word).trim();
    }
    result.push(line);
  }
  return result
    .slice(0, count)
    .map((s, i) =>
      i === count - 1 && result.length > count ? s.slice(0, max - 1) + "…" : s,
    );
}

function text(
  s: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  weight = 400,
  anchor = "start",
) {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" direction="${/[\u0600-\u06ff]/.test(s) ? "rtl" : "ltr"}">${esc(s)}</text>`;
}

function baseFlyerSvg(
  c: Campaign,
  t: Template,
  page = 0,
  images: Record<string, string> = {},
) {
  if (t.artwork) return studioFlyer(c, t, page, images);
  const color = t.color,
    accent = t.accent,
    minimal = t.style === "minimal",
    items = pageItems(c, t, page),
    rects = pageRects(c, t, page);
  const ink = minimal ? color : "#fff";
  const id = (suffix: string) => gradientId("flyer", t) + "-" + suffix;

  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 794 1123" width="794" height="1123" role="img" aria-label="${esc(c.name)}"><defs>` +
    `<linearGradient id="${id("head")}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop stop-color="${shade(minimal ? "#f0f0eb" : color, 14)}"/>` +
    `<stop offset="1" stop-color="${shade(minimal ? "#e2e3dd" : color, -20)}"/>` +
    `</linearGradient>` +
    `<linearGradient id="${id("band")}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop stop-color="${shade(accent, 12)}"/><stop offset="1" stop-color="${shade(accent, -12)}"/>` +
    `</linearGradient>` +
    `<linearGradient id="${id("foot")}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop stop-color="${shade(minimal ? "#e9e9e3" : color, -14)}"/>` +
    `<stop offset="1" stop-color="${shade(minimal ? "#e9e9e3" : color, 12)}"/>` +
    `</linearGradient>` +
    `<linearGradient id="${id("card")}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop stop-color="#ffffff"/><stop offset="1" stop-color="#f4f7f2"/>` +
    `</linearGradient>` +
    `<linearGradient id="${id("sheen")}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop stop-color="#ffffff" stop-opacity=".22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id("glow")}" cx="50%" cy="50%" r="50%">` +
    `<stop stop-color="${accent}" stop-opacity=".5"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<filter id="${id("soft")}" x="-12%" y="-12%" width="124%" height="124%">` +
    `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0d2a1c" flood-opacity=".12"/>` +
    `</filter>` +
    `</defs><rect width="794" height="1123" fill="${minimal ? "#fafaf8" : "#fff"}"/><g font-family="Arial,Helvetica,sans-serif">`;

  s += `<rect width="794" height="326" fill="url(#${id("head")})"/>`;
  s += `<ellipse cx="621" cy="118" rx="292" ry="196" fill="url(#${id("glow")})"/>`;
  s += `<rect width="794" height="326" fill="url(#${id("sheen")})"/>`;

  if (c.brand.logo)
    s += `<image x="35" y="29" width="55" height="42" preserveAspectRatio="xMidYMid meet" href="${esc(images[c.brand.logo] || c.brand.logo)}"/>`;

  s += text(c.brand.name, c.brand.logo ? 103 : 38, 58, 20, ink, 800);
  s += text("WEEKLY OFFERS", 755, 56, 12, ink, 600, "end");

  const head = lines(c.headline || "Weekly offers", 25, 3);
  head.forEach((l, i) => {
    s += text(
      l,
      38,
      132 + i * 63,
      Math.min(66, Math.floor(680 / Math.max(l.length * 0.55, 1))),
      minimal ? color : accent,
      900,
    );
  });

  s += `<rect x="0" y="282" width="794" height="44" fill="url(#${id("band")})"/>`;

  const date = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  s += text(`${date(c.start)} – ${date(c.end)}`, 38, 310, 17, color, 700);
  s += text("FRESH FINDS. GREAT PRICES.", 756, 310, 12, color, 600, "end");

  items.forEach((p, i) => {
    if (!p) return;
    const { x, y, w, h } = rects[i];
    const nameSize = clamp(9, Math.min(w * 0.075, h * 0.05), 22),
      priceSize = clamp(15, Math.min(w * 0.18, h * 0.125), 52),
      packSize = clamp(8, h * 0.038, 15),
      nameY = y + h - clamp(60, h * 0.315, 190),
      packY = y + h - clamp(38, h * 0.19, 115),
      priceY = y + h - clamp(8, h * 0.032, 20),
      oldPriceY = priceY - clamp(18, h * 0.096, 44),
      imgTop = y + clamp(8, w * 0.055, 22),
      imgBottom = Math.min(
        nameY - nameSize - 5,
        packY - packSize * 1.35,
        y + h - packSize * 2.4,
      ),
      imgH = Math.max(18, imgBottom - imgTop);

    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${minimal ? 0 : clamp(3, w * 0.022, 14)}" fill="url(#${id("card")})" stroke="${minimal ? "#d5d8d2" : "#dfe6db"}" ${minimal ? "" : `filter="url(#${id("soft")})"`}/>`;

    if (p.image)
      s += `<image x="${x + 12}" y="${imgTop}" width="${w - 24}" height="${imgH}" preserveAspectRatio="xMidYMid meet" href="${esc(images[p.image] || p.image)}"/>`;
    else
      s += text(
        "Add product image",
        x + w / 2,
        imgTop + imgH / 2,
        14,
        "#8a948c",
        400,
        "middle",
      );

    if (p.badge)
      s +=
        `<rect x="${x + 8}" y="${y + 8}" width="${Math.min(w - 16, p.badge.length * 7 + 18)}" height="24" rx="3" fill="url(#${id("band")})"/>` +
        text(p.badge.slice(0, 24), x + 16, y + 25, 12, color, 700);

    const names = lines(p.name, Math.max(10, Math.round(w / (nameSize * 0.56))), 2);
    names.forEach((l, j) => {
      s += text(
        l,
        x + w / 2,
        nameY + j * nameSize * 1.25,
        nameSize,
        "#223128",
        700,
        "middle",
      );
    });

    s += text(p.pack, x + w / 2, packY, packSize, "#6c796e", 400, "middle");

    if (
      p.showOldPrice === true ||
      (p.showOldPrice === undefined && p.price > p.offer)
    ) {
      s += `<text x="${x + w / 2}" y="${oldPriceY}" font-size="${packSize}" fill="#8b928d" text-anchor="middle" text-decoration="line-through">${esc(c.brand.currency)} ${p.price.toFixed(2)}</text>`;
    }

    const price = p.offer.toFixed(2);
    s += text(
      c.brand.currency,
      x + 13,
      priceY - 3,
      Math.max(9, Math.min(12, priceSize * 0.3)),
      color,
      600,
    );
    s += text(
      price,
      x + w - 13,
      priceY,
      Math.min(priceSize, (w - 30) / (price.length * 0.56)),
      color,
      900,
      "end",
    );
  });

  if (!items.length)
    s += text(
      "Add products to start your flyer",
      397,
      665,
      23,
      "#7e8e82",
      400,
      "middle",
    );

  s += `<rect x="0" y="1059" width="794" height="64" fill="url(#${id("foot")})"/>`;

  s += text(
    [c.brand.address, c.brand.phone]
      .filter(Boolean)
      .join("  ·  ")
      .slice(0, 110),
    397,
    1082,
    13,
    ink,
    600,
    "middle",
  );
  s += text(c.brand.terms.slice(0, 135), 397, 1104, 10, ink, 400, "middle");
  return s + "</g></svg>";
}

export function campaignIssues(c: Campaign) {
  const errors: string[] = [];
  if (!c.items.length) errors.push("Add at least one product.");
  if (c.end < c.start)
    errors.push("End date must be on or after the start date.");
  if (!c.name.trim() || !c.brand.name.trim())
    errors.push("Add a campaign and store name.");
  if (
    c.items.some(
      (p) => !p.name.trim() || !Number.isFinite(p.offer) || p.offer < 0,
    )
  )
    errors.push("Check product names and offer prices.");
  return errors;
}

function studioFlyer(
  c: Campaign,
  t: Template,
  page: number,
  images: Record<string, string>,
) {
  const editorial = t.style === "editorial",
    compact = t.style === "boutique",
    cream = "#fbf7ee",
    color = t.color,
    gold = t.accent;

  const header = editorial ? 350 : compact ? 292 : 386,
    ink = editorial ? color : cream;

  const image = (
    url: string,
    x: number,
    y: number,
    w: number,
    h: number,
    crop = false,
  ) =>
    `<image href="${esc(images[url] || url)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${crop ? "xMaxYMax slice" : "xMidYMid meet"}"/>`;

  const g = (suffix: string) => gradientId("studio", t) + "-" + suffix,
    deep = shade(color, -22),
    bright = shade(color, 16);

  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="794" height="1123" role="img" aria-label="${esc(c.name)}"><defs>` +
    `<linearGradient id="${g("head")}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop stop-color="${bright}"/><stop offset="1" stop-color="${deep}"/></linearGradient>` +
    `<linearGradient id="${g("veil")}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop stop-color="${color}" stop-opacity="0"/><stop offset="1" stop-color="${color}" stop-opacity=".95"/>` +
    `</linearGradient>` +
    `<linearGradient id="${g("band")}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop stop-color="${shade(gold, 14)}"/><stop offset="1" stop-color="${shade(gold, -14)}"/>` +
    `</linearGradient>` +
    `<linearGradient id="${g("card")}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop stop-color="#ffffff"/><stop offset="1" stop-color="#f8f4ec"/></linearGradient>` +
    `<linearGradient id="${g("foot")}" x1="0" y1="0" x2="1" y2="0">` +
    `<stop stop-color="${deep}"/><stop offset="1" stop-color="${bright}"/></linearGradient>` +
    `<radialGradient id="${g("glow")}" cx="50%" cy="50%" r="50%">` +
    `<stop stop-color="${gold}" stop-opacity=".42"/><stop offset="1" stop-color="${gold}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<filter id="${g("soft")}" x="-12%" y="-12%" width="124%" height="124%">` +
    `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#2a1608" flood-opacity=".13"/>` +
    `</filter>` +
    `</defs><rect width="794" height="1123" fill="${cream}"/><g font-family="Arial,Helvetica,sans-serif">`;

  s += `<rect width="794" height="${header}" fill="${editorial ? cream : `url(#${g("head")})`}"/>`;
  s += `<ellipse cx="${editorial ? 190 : 200}" cy="${header - 84}" rx="300" ry="180" fill="url(#${g("glow")})"/>`;

  s += image(
    t.artwork!,
    editorial ? 405 : 0,
    0,
    editorial ? 389 : 794,
    header,
    true,
  );

  if (!editorial)
    s += `<rect y="${header - 104}" width="794" height="104" fill="url(#${g("veil")})"/>`;

  if (c.brand.logo) s += image(c.brand.logo, 36, 27, 44, 37);

  s += text(
    c.brand.name.slice(0, editorial ? 25 : 38),
    c.brand.logo ? 90 : 36,
    51,
    editorial ? 14 : 17,
    ink,
    700,
  );

  if (!editorial)
    s += text("THE WEEKLY SELECTION", 754, 49, 10, gold, 600, "end");

  s += `<path d="M36 77 H${editorial ? 360 : 438}" stroke="${gold}" stroke-width="1" opacity=".7"/>`;

  const title = lines(
      c.headline || "Good food.\nGreat prices.",
      editorial ? 17 : 23,
      3,
    ),
    font = editorial ? 49 : compact ? 48 : 60;

  title.forEach((l, i) => {
    s +=
      `<g font-family="${editorial ? "Georgia,serif" : "Arial,Helvetica,sans-serif"}">` +
      text(
        l,
        36,
        compact ? 127 + i * 52 : 148 + i * (editorial ? 54 : 65),
        Math.min(
          font,
          Math.floor((editorial ? 326 : 450) / (Math.max(l.length, 1) * 0.56)),
        ),
        ink,
        editorial ? 400 : 800,
      ) +
      "</g>";
  });

  if (!compact)
    s += text(
      "A little extraordinary. Every week.",
      36,
      header - 30,
      12,
      editorial ? "#8a7057" : gold,
      500,
    );

  const date = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (editorial) {
    s += `<rect x="0" y="${header}" width="794" height="42" fill="url(#${g("head")})"/>`;
    s += text(
      `${date(c.start)} — ${date(c.end)}`,
      397,
      header + 27,
      14,
      cream,
      500,
      "middle",
    );
  } else {
    s += `<rect x="24" y="${header - 18}" width="746" height="42" rx="${compact ? 0 : 21}" fill="url(#${g("band")})"/>`;
    s += text(
      `${date(c.start)} — ${date(c.end)}`,
      397,
      header + 9,
      14,
      color,
      700,
      "middle",
    );
  }

  const start = header + (editorial ? 84 : 69),
    margin = editorial ? 36 : 24,
    cols = t.columns,
    rects = pageRects(c, t, page);

  s += text(
    editorial
      ? "GOOD THINGS, CAREFULLY CHOSEN"
      : compact
        ? "THIS WEEK’S VERY GOOD FINDS"
        : "FRESH FROM YOUR NEIGHBORHOOD",
    margin,
    start - 20,
    11,
    "#806749",
    600,
  );

  const products = pageItems(c, t, page);

  products.forEach((p, i) => {
    if (!p) return;
    const { x, y, w, h } = rects[i];
    const base = compact ? 211 : editorial ? 282 : 276,
      k = clamp(0.55, h / base, 1.6),
      nameSize = clamp(
        9,
        Math.min((cols === 2 ? 19 : 15) * k, w * 0.09, h * 0.11),
        26,
      ),
      packSize = clamp(8, (compact ? 12 : 12) * k, 16),
      priceSize = clamp(
        14,
        Math.min((editorial ? 40 : compact ? 30 : 35) * k, w * 0.4),
        46,
      ),
      nameY = y + h - clamp(50, (compact ? 87 : 102) * k, 240),
      packY = y + h - clamp(28, 57 * k, 140),
      oldY = y + h - clamp(14, 24 * k, 60),
      priceY = y + h - clamp(10, 18 * k, 44),
      imgTop = y + 10;

    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${editorial ? 0 : clamp(4, w * 0.03, 12)}" fill="url(#${g("card")})" ${editorial ? "" : 'stroke="#eadfcf"'} ${editorial ? "" : `filter="url(#${g("soft")})"`}/>`;

    const picture = Math.max(
      16,
      Math.min(nameY - nameSize - 8, packY - packSize * 1.4) - imgTop,
    );

    if (p.image) s += image(p.image, x + 12, imgTop, w - 24, picture);
    else
      s += text(
        "Your product image",
        x + w / 2,
        imgTop + picture / 2,
        13,
        "#a59483",
        400,
        "middle",
      );

    if (p.badge)
      s +=
        `<rect x="${x + 7}" y="${y + 7}" width="${Math.min(w - 14, p.badge.length * 6 + 18)}" height="23" rx="11" fill="url(#${g("band")})"/>` +
        text(p.badge.slice(0, 27), x + 15, y + 23, 11, color, 700);

    const name = lines(
      p.name,
      Math.max(8, Math.round((w - 28) / (nameSize * 0.56))),
      2,
    );
    name.forEach((l, j) => {
      s += text(
        l,
        x + 14,
        nameY + j * nameSize * 1.22,
        nameSize,
        "#362e2b",
        600,
      );
    });

    s += text(p.pack, x + 14, packY, packSize, "#8b7e74", 400);

    if (editorial)
      s += `<path d="M${x + 14} ${priceY - priceSize * 1.15} H${x + w * 0.5}" stroke="#eadfcf"/>`;

    if (
      p.showOldPrice === true ||
      (p.showOldPrice === undefined && p.price > p.offer)
    )
      s += `<text x="${x + 14}" y="${oldY}" font-size="${packSize}" fill="#9d8e83" text-decoration="line-through">${esc(c.brand.currency)} ${p.price.toFixed(2)}</text>`;

    const price = p.offer.toFixed(2),
      size = Math.min(priceSize, (w * 0.53) / (price.length * 0.56));

    s += text(price, x + w - 14, priceY, size, color, 800, "end");
    s += text(
      c.brand.currency,
      x + w - 14,
      priceY - Math.max(20, priceSize * 0.85),
      Math.max(8, Math.min(10, priceSize * 0.28)),
      "#8b6c51",
      600,
      "end",
    );

    if (editorial)
      s += `<rect x="${x}" y="${y + h - 3}" width="${w}" height="3" fill="url(#${g("band")})"/>`;
  });

  if (!products.length)
    s += text(
      "Choose your products to fill this page",
      397,
      700,
      20,
      "#8a7057",
      400,
      "middle",
    );

  s += `<path d="M24 1043 H770" stroke="${gold}"/><rect x="0" y="1059" width="794" height="64" fill="url(#${g("foot")})"/>`;

  s += text(
    [c.brand.address, c.brand.phone]
      .filter(Boolean)
      .join("  ·  ")
      .slice(0, 110),
    397,
    1082,
    12,
    cream,
    600,
    "middle",
  );
  s += text(
    c.brand.terms.slice(0, 135),
    397,
    1103,
    9,
    "#dfcdbd",
    400,
    "middle",
  );

  return s + "</g></svg>";
}

async function embeddedImages(c: Campaign, t: Template) {
  const map: Record<string, string> = {};
  await Promise.all(
    [
      ...new Set(
        [...c.items.map((p) => p.image), c.brand.logo, t.artwork].filter(
          (url): url is string => !!url,
        ),
      ),
    ].map(async (url) => {
      const res = await fetch(url);
      if (!res.ok)
        throw new Error(
          "An image could not be loaded. Check your product images.",
        );
      const blob = await res.blob();
      map[url] = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }),
  );
  return map;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function exportFlyer(
  c: Campaign,
  t: Template,
  format: "png" | "pdf" | "svg",
  page = 0,
): Promise<{ blob: Blob; name: string }> {
  const errors = campaignIssues(c);
  if (errors.length) throw new Error(errors[0]);
  const imgs = await embeddedImages(c, t),
    name = c.name.replace(/[^a-zA-Z0-9_-]/g, "-");
  if (format === "svg")
    return {
      blob: new Blob([flyerSvg(c, t, page, imgs)], { type: "image/svg+xml" }),
      name: `${name}-page-${page + 1}.svg`,
    };
  let pdf: import("jspdf").jsPDF | undefined;
  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  }

  const pages = pageCount(c, t);
  let png: Blob | undefined;
  for (
    let i = format === "pdf" ? 0 : page;
    i < (format === "pdf" ? pages : page + 1);
    i++
  ) {
    const svg = flyerSvg(c, t, i, imgs),
      url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error("Could not render flyer"));
        im.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 2480;
      canvas.height = 3508;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 2480, 3508);
      ctx.drawImage(img, 0, 0, 2480, 3508);
      if (pdf) {
        if (i) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          0,
          0,
          210,
          297,
        );
      } else
        png = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("PNG export failed"))),
            "image/png",
          ),
        );
      canvas.width = canvas.height = 1;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return {
    blob: pdf ? pdf.output("blob") : png!,
    name: pdf ? name + ".pdf" : `${name}-page-${page + 1}.png`,
  };
}

export function flyerSvg(
  c: Campaign,
  t: Template,
  page = 0,
  images: Record<string, string> = {},
  interactive = false,
) {
  if (c.flyerDoc?.pages?.[page]) {
    return renderPageSvg(c.flyerDoc.pages[page], c.brand, {
      interactive,
      images,
    });
  }

  let svg = t.style.startsWith("wear-")
    ? wearFlyer(c, t, page, images)
    : baseFlyerSvg(c, t, page, images);

  if (interactive) svg = svg.replace('role="img"', 'role="group"');
  let overlay = "";
  const items = pageItems(c, t, page);

  pageRects(c, t, page).forEach(({ x, y, w, h }, i) => {
    if (!items[i])
      overlay += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="white" stroke="#d8e2dc"/>${interactive ? `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" font-family="Arial" font-size="14" fill="#708578">+ Choose product</text>` : ""}`;
    if (interactive)
      overlay += `<rect data-slot="${page * t.capacity + i}" role="button" tabindex="0" aria-label="Edit product slot ${page * t.capacity + i + 1}${items[i] ? " — " + esc(items[i]!.name) : ""}" x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="transparent" style="cursor:pointer"/>`;
  });

  if (!t.style.startsWith("wear-") && c.brand.locationUrl)
    overlay += qrSvg(c.brand.locationUrl, 672, t.artwork ? 174 : 183, 78);

  return svg.replace("</svg>", overlay + "</svg>");
}
