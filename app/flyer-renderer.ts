import {
  templates,
  FlyerPage,
  FlyerSection,
  GridModel,
  GridCell,
  Offer,
  BusinessProfile,
  Brand,
  BorderSettings,
  defaultBackgroundPresets,
} from "./model";
import { qrSvg, shade, clamp, PAGE_W, PAGE_H } from "./flyer-layout";

export const esc = (v: unknown) =>
  String(v ?? "").replace(
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

export const escapeXml = esc;

export const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s);

export function renderSvgText(
  text: string,
  x: number,
  y: number,
  options: {
    size?: number;
    weight?: string | number;
    color?: string;
    anchor?: "start" | "middle" | "end";
    rtl?: boolean;
    family?: string;
  } = {},
) {
  const isAr = options.rtl ?? hasArabic(text);
  const anchor = options.anchor ?? "start";
  const fill = options.color || "#1e293b";
  const size = options.size || 14;
  const weight = options.weight || 600;
  const family = options.family || "Arial, Helvetica, sans-serif";

  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" font-family="${family}"${
    isAr ? ' direction="rtl"' : ""
  }>${esc(text)}</text>`;
}

export function fitText(text: string, width: number, size: number): string {
  const max = Math.max(1, Math.floor(width / (size * .66)));
  return text.length > max ? text.slice(0, Math.max(0, max - 1)).trimEnd() + "…" : text;
}

export function resolveBrand(brand?: Brand | BusinessProfile) {
  const p = brand as BusinessProfile | undefined;
  const b = brand as Brand | undefined;
  return {
    name: p?.name || b?.name || "RETAIL STORE",
    arabicName: p?.arabicName || b?.arabicName || "",
    logo: p?.logo || b?.logo || "",
    phone: p?.phone || b?.phone || "",
    currency: p?.defaultCurrency || b?.currency || "AED",
    primaryColor: p?.brandColors?.primary || b?.color || "#166534",
    accentColor: p?.brandColors?.accent || "#f5d54b",
    secondaryColor: p?.brandColors?.secondary || "#ffda43",
    terms: p?.terms || b?.terms || "Offers valid while stocks last. Images are for illustration purposes only.",
    timings: p?.timings || b?.timings || "Open Daily 8:00 AM – 12:00 Midnight",
    branches: p?.branches || b?.branches || [],
    qrDestination: p?.defaultQrDestination || b?.locationUrl || "https://maps.google.com",
  };
}

export function renderPageSvg(
  page: FlyerPage,
  brandInput?: Brand | BusinessProfile,
  options: {
    interactive?: boolean;
    selectedCellId?: string | null;
    selectedCellIds?: string[];
    selectedGridId?: string | null;
    selectedSectionId?: string | null;
    images?: Record<string, string>;
    pageNumber?: number;
    totalPages?: number;
  } = {},
): string {
  const palette = templates.find(t => t.id === page.templateId);
  const brand = { ...resolveBrand(brandInput), ...(palette ? {primaryColor: palette.color, accentColor: palette.accent} : {}) };
  const images = options.images || {};
  const logoHref = images[brand.logo] || brand.logo;

  // Background
  let bgFill = "#ffffff";
  let bgGradientDef = "";
  const bg = page.background;
  if (bg?.type === "solid" && bg.color) {
    bgFill = bg.color;
  } else if (bg?.type === "preset" && bg.presetId) {
    const preset = defaultBackgroundPresets.find((p) => p.id === bg.presetId);
    if (preset?.gradient) {
      bgGradientDef = `<linearGradient id="page-bg-${page.id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${preset.color}"/><stop offset="1" stop-color="${shade(preset.color, -30)}"/></linearGradient>`;
      bgFill = `url(#page-bg-${page.id})`;
    } else if (preset?.color) {
      bgFill = preset.color;
    }
  } else if (bg?.type === "gradient" && bg.color) {
    bgGradientDef = `<linearGradient id="page-bg-${page.id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${bg.color}"/><stop offset="1" stop-color="${shade(bg.color, -25)}"/></linearGradient>`;
    bgFill = `url(#page-bg-${page.id})`;
  }

  const defs = bgGradientDef;
  let body = `<rect width="${PAGE_W}" height="${PAGE_H}" fill="${bgFill}"/>`;

  if (bg?.type === "image" && bg.imageUrl) {
    const imgUrl = images[bg.imageUrl] || bg.imageUrl;
    body += `<image href="${esc(imgUrl)}" x="0" y="0" width="${PAGE_W}" height="${PAGE_H}" preserveAspectRatio="xMidYMid slice" opacity="0.95"/>`;
  }

  // Calculate dynamic section layout vertically
  let currentY = 16;
  const safeMarginX = 20;
  const contentWidth = PAGE_W - safeMarginX * 2;
  const bottomReserve = 70; // For footer if present

  const hasFooter = page.sections.some((s) => s.type === "footer");
  const availableH = PAGE_H - (hasFooter ? bottomReserve : 20);

  // Measure remaining height for grids
  const fixedSectionHeights = page.sections.reduce((acc, sec) => {
    if (sec.type === "hero") return acc + (sec.height || 260);
    if (sec.type === "banner") return acc + (sec.height || 100);
    if (sec.type === "special_offer") return acc + (sec.height || 220);
    if (sec.type === "highlight") return acc + (sec.height || 220);
    if (sec.type === "qr_location") return acc + (sec.height || 95);
    if (sec.type === "text") return acc + (sec.height || 60);
    if (sec.type === "image") return acc + (sec.height || 140);
    return acc;
  }, 0);

  const gridSections = page.sections.filter((s) => s.type === "grid");
  const defaultGridHeight = gridSections.length > 0
    ? Math.max(80, (availableH - fixedSectionHeights - 28 - page.sections.filter(s => s.type !== "footer").length * 12) / gridSections.length)
    : 450;

  const backdrop = body;
  body = "";
  let footerMarkup = "";
  for (let sIdx = 0; sIdx < page.sections.length; sIdx++) {
    const sec = page.sections[sIdx];
    const isSelectedSec = options.interactive && options.selectedSectionId === sec.id;

    if (sec.type === "hero") {
      const heroH = sec.height || 260;
      body += renderHeroSection({
        sec,
        brand,
        logoHref,
        x: safeMarginX,
        y: currentY,
        width: contentWidth,
        height: heroH,
        interactive: options.interactive,
        isSelected: isSelectedSec,
      });
      currentY += heroH + 12;
    } else if (sec.type === "banner") {
      const banH = sec.height || 95;
      body += renderBannerSection({
        sec,
        brand,
        x: safeMarginX,
        y: currentY,
        width: contentWidth,
        height: banH,
        interactive: options.interactive,
        isSelected: isSelectedSec,
      });
      currentY += banH + 10;
    } else if (sec.type === "special_offer") {
      const offerH = sec.height || 220;
      body += renderSpecialOfferSection({
        sec,
        brand,
        images,
        x: safeMarginX,
        y: currentY,
        width: contentWidth,
        height: offerH,
        interactive: options.interactive,
        isSelected: isSelectedSec,
      });
      currentY += offerH + 12;
    } else if (sec.type === "highlight") {
      const highH = sec.height || 220;
      body += renderHighlightSection({
        sec,
        brand,
        images,
        x: safeMarginX,
        y: currentY,
        width: contentWidth,
        height: highH,
        interactive: options.interactive,
        isSelected: isSelectedSec,
      });
      currentY += highH + 12;
    } else if (sec.type === "qr_location") {
      const qrH = sec.height || 95;
      body += renderQrLocationSection({
        sec,
        brand,
        x: safeMarginX,
        y: currentY,
        width: contentWidth,
        height: qrH,
        interactive: options.interactive,
        isSelected: isSelectedSec,
      });
      currentY += qrH + 10;
    } else if (sec.type === "text") {
      const textH = sec.height || 60;
      body += renderTextSection({
        sec,
        x: safeMarginX,
        y: currentY,
        width: contentWidth,
        height: textH,
        interactive: options.interactive,
        isSelected: isSelectedSec,
      });
      currentY += textH + 8;
    } else if (sec.type === "image") {
      const imgH = sec.height || 140;
      body += renderImageSection({
        sec,
        images,
        x: safeMarginX,
        y: currentY,
        width: contentWidth,
        height: imgH,
        interactive: options.interactive,
        isSelected: isSelectedSec,
      });
      currentY += imgH + 10;
    } else if (sec.type === "grid" && sec.grid) {
      const gridH = sec.height || defaultGridHeight;
      body += renderGridSection({
        grid: sec.grid,
        secId: sec.id,
        brand,
        images,
        x: safeMarginX,
        y: currentY,
        width: contentWidth,
        height: gridH,
        interactive: options.interactive,
        selectedCellId: options.selectedCellId,
        selectedCellIds: !options.selectedGridId || options.selectedGridId === sec.grid.id ? options.selectedCellIds : [],
        isSelectedSec,
      });
      currentY += gridH + 12;
    } else if (sec.type === "footer") {
      const footH = 65;
      const footY = PAGE_H - footH - 12;
      footerMarkup += renderFooterSection({
        sec,
        brand,
        logoHref,
        x: safeMarginX,
        y: footY,
        width: contentWidth,
        height: footH,
        interactive: options.interactive,
        isSelected: isSelectedSec,
      });
    }
  }

  const contentScale = Math.min(1, (PAGE_H - (hasFooter ? 100 : 28)) / Math.max(1, currentY));
  body = backdrop + `<g transform="translate(${(PAGE_W * (1 - contentScale)) / 2} 0) scale(${contentScale})">${body}</g>` + footerMarkup;

  // Page pagination indicator
  if (options.pageNumber && options.totalPages && options.totalPages > 1) {
    body += renderSvgText(`Page ${options.pageNumber} of ${options.totalPages}`, PAGE_W - safeMarginX, PAGE_H - 14, {
      size: 10,
      weight: 800,
      color: "#94a3b8",
      anchor: "end",
    });
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${PAGE_W} ${PAGE_H}" width="${PAGE_W}" height="${PAGE_H}" role="img" aria-label="${esc(
      page.name,
    )}" font-family="Arial, Helvetica, sans-serif">` +
    `<defs>${defs}</defs>` +
    `${body}</svg>`
  );
}

function renderHeroSection(p: {
  sec: FlyerSection;
  brand: ReturnType<typeof resolveBrand>;
  logoHref: string;
  x: number;
  y: number;
  width: number;
  height: number;
  interactive?: boolean;
  isSelected?: boolean;
}) {
  const { sec, brand, logoHref, x, y, width, height, interactive, isSelected } = p;
  const primary = sec.background?.color || brand.primaryColor;
  const accent = brand.accentColor;
  const id = `hero-${sec.id}`;
  let s = `<g data-section-id="${sec.id}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${primary}"/><stop offset="1" stop-color="${shade(primary, -12)}"/></linearGradient><clipPath id="${id}-clip"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16"/></clipPath></defs><g clip-path="url(#${id}-clip)">`;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#${id})"/>`;
  s += `<circle cx="${x + width * .94}" cy="${y + height * .5}" r="${height * .85}" fill="${accent}" opacity=".09"/><circle cx="${x + width * .94}" cy="${y + height * .5}" r="${height * .6}" fill="none" stroke="${accent}" stroke-width="1" opacity=".25"/>`;
  if (logoHref) s += `<image href="${esc(logoHref)}" x="${x + 22}" y="${y + 16}" width="40" height="36" preserveAspectRatio="xMidYMid meet"/>`;
  const brandX = x + (logoHref ? 76 : 24);
  s += renderSvgText(fitText(brand.name.toUpperCase(), width * .49, 18), brandX, y + height * .14, {size: 18, weight: 800, color: "#ffffff"});
  if (brand.arabicName) s += renderSvgText(fitText(brand.arabicName, width * .36, 18), x + width - 24, y + height * .14, {size: 18, color: "#ffffff", rtl: true});
  s += `<line x1="${x + 24}" x2="${x + width - 24}" y1="${y + height * .22}" y2="${y + height * .22}" stroke="#ffffff" opacity=".2"/>`;
  const headline = sec.title || "FRESH FINDS. BIG SAVINGS.";
  const size = Math.min(46, height * .17, (width - 56) / Math.max(1, headline.length * .64));
  s += renderSvgText(headline, x + 26, y + height * .47, {size, weight: 900, color: "#ffffff"});
  if (sec.arabicTitle) s += renderSvgText(fitText(sec.arabicTitle, width - 52, 21), x + width - 26, y + height * .6, {size: 21, color: accent, rtl: true});
  s += renderSvgText(fitText(sec.subtitle || "Fresh offers. Exceptional everyday value.", width - 52, 13), x + 26, y + height * .72, {size: 13, color: "#ffffff", weight: 500});
  s += `<rect x="${x}" y="${y + height * .83}" width="${width}" height="${height * .17}" fill="${accent}"/>`;
  s += renderSvgText(fitText(sec.badge || "WEEKLY SPECIAL OFFERS", width * .58, 13), x + 26, y + height * .94, {size: 13, weight: 900, color: primary});
  s += renderSvgText(`PRICES IN ${brand.currency}`, x + width - 26, y + height * .94, {size: 11, weight: 700, color: primary, anchor: "end"});
  s += `</g>`;
  if (interactive && isSelected) s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="none" stroke="#2563eb" stroke-width="3" pointer-events="none"/>`;
  return s + `</g>`;
}

function renderBannerSection(p: {
  sec: FlyerSection;
  brand: ReturnType<typeof resolveBrand>;
  x: number;
  y: number;
  width: number;
  height: number;
  interactive?: boolean;
  isSelected?: boolean;
}) {
  const { sec, brand, x, y, width, height, interactive, isSelected } = p;
  const primary = brand.primaryColor;
  const accent = brand.accentColor;

  let s = `<g data-section-id="${sec.id}">`;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="${primary}" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.1))"/>`;

  // Badge pill
  const badge = sec.badge || "CLEARANCE SALE";
  s += `<rect x="${x + 16}" y="${y + 14}" width="150" height="28" rx="6" fill="${accent}"/>`;
  s += renderSvgText(fitText(badge, 132, 12), x + 91, y + 33, {
    size: 12,
    weight: 900,
    color: "#0f172a",
    anchor: "middle",
  });

  // Title
  const title = sec.title || "UP TO 50% OFF ON SELECTED ITEMS";
  s += renderSvgText(fitText(title, width - 198, 18), x + 180, y + 35, {
    size: 18,
    weight: 900,
    color: "#ffffff",
  });

  // Subtitle
  const sub = sec.subtitle || "Limited time promotional deals. Hurry while stocks last!";
  s += renderSvgText(fitText(sub, width - 32, 12), x + 16, y + 68, {
    size: 12,
    weight: 500,
    color: "#f1f5f9",
  });

  if (interactive && isSelected) {
    s += `<rect x="${x - 2}" y="${y - 2}" width="${width + 4}" height="${height + 4}" rx="12" fill="none" stroke="#2563eb" stroke-width="3" pointer-events="none"/>`;
  }
  s += `</g>`;
  return s;
}

function renderSpecialOfferSection(p: {
  sec: FlyerSection;
  brand: ReturnType<typeof resolveBrand>;
  images: Record<string, string>;
  x: number;
  y: number;
  width: number;
  height: number;
  interactive?: boolean;
  isSelected?: boolean;
}) {
  const { sec, brand, images, x, y, width, height, interactive, isSelected } = p;
  let s = `<g data-section-id="${sec.id}">`;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="#f8fafc" stroke="${brand.primaryColor}" stroke-width="2"/>`;

  // Banner strip
  s += `<rect x="${x}" y="${y}" width="${width}" height="42" rx="10" fill="${brand.primaryColor}"/>`;
  const mainTitle = sec.title || "SPECIAL PROMOTIONAL OFFER";
  s += renderSvgText(fitText(mainTitle, width - 170, 15), x + 16, y + 19, {
    size: 15,
    weight: 900,
    color: "#ffffff",
  });

  if (sec.subtitle) {
    s += renderSvgText(fitText(sec.subtitle, width - 170, 10), x + 16, y + 34, {
      size: 10,
      weight: 700,
      color: brand.accentColor,
    });
  }

  if (sec.badge) {
    s += `<rect x="${x + width - 140}" y="${y + 8}" width="124" height="26" rx="6" fill="${brand.accentColor}"/>`;
    s += renderSvgText(fitText(sec.badge, 112, 11), x + width - 78, y + 25, {
      size: 11,
      weight: 900,
      color: "#0f172a",
      anchor: "middle",
    });
  }

  // Render product cards inside special offer
  const products = sec.specialOffer?.products || [];
  const count = Math.max(1, Math.min(3, products.length || 3));
  const cardGap = 10;
  const cardW = (width - 24 - (count - 1) * cardGap) / count;
  const cardH = height - 58;

  for (let i = 0; i < count; i++) {
    const pX = x + 12 + i * (cardW + cardGap);
    const pY = y + 50;
    const prod = products[i];
    s += renderProductCard({
      offer: prod,
      x: pX,
      y: pY,
      width: cardW,
      height: cardH,
      currency: brand.currency,
      brandColor: brand.primaryColor,
      accentColor: brand.accentColor,
      images,
    });
  }

  if (interactive && isSelected) {
    s += `<rect x="${x - 2}" y="${y - 2}" width="${width + 4}" height="${height + 4}" rx="12" fill="none" stroke="#2563eb" stroke-width="3" pointer-events="none"/>`;
  }
  s += `</g>`;
  return s;
}

function renderHighlightSection(p: {
  sec: FlyerSection;
  brand: ReturnType<typeof resolveBrand>;
  images: Record<string, string>;
  x: number;
  y: number;
  width: number;
  height: number;
  interactive?: boolean;
  isSelected?: boolean;
}) {
  const { sec, brand, images, x, y, width, height, interactive, isSelected } = p;
  const prod = sec.highlight?.product;
  let s = `<g data-section-id="${sec.id}">`;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="#fffbeb" stroke="${brand.accentColor}" stroke-width="2"/>`;

  // Left: Big product image
  const imgW = width * 0.42;
  const imgH = height - 24;
  s += `<rect x="${x + 12}" y="${y + 12}" width="${imgW}" height="${imgH}" rx="8" fill="#ffffff" stroke="#fde68a"/>`;
  if (prod?.image) {
    const url = images[prod.image] || prod.image;
    s += `<image href="${esc(url)}" x="${x + 20}" y="${y + 20}" width="${imgW - 16}" height="${imgH - 16}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  // Right: Promotional copy & price
  const rightX = x + imgW + 28;
  const badgeText = sec.badge || sec.highlight?.badge || "SUPER DEAL OF THE DAY";
  s += `<rect x="${rightX}" y="${y + 20}" width="180" height="26" rx="6" fill="${brand.primaryColor}"/>`;
  s += renderSvgText(fitText(badgeText, 164, 11), rightX + 90, y + 37, {
    size: 11,
    weight: 900,
    color: "#ffffff",
    anchor: "middle",
  });

  const name = prod?.name || sec.title || "Featured Premium Product";
  s += renderSvgText(fitText(name, width - imgW - 44, 20), rightX, y + 80, {
    size: 20,
    weight: 800,
    color: "#0f172a",
  });

  if (prod?.arabicName) {
    s += renderSvgText(fitText(prod.arabicName, width - imgW - 44, 18), x + width - 16, y + 106, {
      size: 18,
      weight: 700,
      color: "#475569",
      rtl: true,
    });
  }

  // Price box
  const newP = prod ? prod.offer : 19.99;
  const oldP = prod?.price;
  s += `<g transform="translate(${rightX} ${y + 130})">`;
  if (prod?.showOldPrice !== false && oldP && oldP > newP) {
    s += `<text x="0" y="24" font-size="16" fill="#94a3b8" text-decoration="line-through">${brand.currency} ${oldP.toFixed(2)}</text>`;
  }
  s += renderSvgText(`${brand.currency} ${newP.toFixed(2)}`, 0, 62, {size: Math.min(34, (width - imgW - 44) / ((brand.currency.length + newP.toFixed(2).length + 1) * .68)), weight: 900, color: brand.primaryColor});
  s += `</g>`;

  if (interactive && isSelected) {
    s += `<rect x="${x - 2}" y="${y - 2}" width="${width + 4}" height="${height + 4}" rx="14" fill="none" stroke="#2563eb" stroke-width="3" pointer-events="none"/>`;
  }
  s += `</g>`;
  return s;
}

function renderQrLocationSection(p: {
  sec: FlyerSection;
  brand: ReturnType<typeof resolveBrand>;
  x: number;
  y: number;
  width: number;
  height: number;
  interactive?: boolean;
  isSelected?: boolean;
}) {
  const { sec, brand, x, y, width, height, interactive, isSelected } = p;
  let s = `<g data-section-id="${sec.id}">`;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>`;

  // QR Code
  const qrSize = height - 16;
  const qrTarget = sec.qrLocation?.customUrl || brand.qrDestination || "https://maps.google.com";
  s += qrSvg(qrTarget, x + 8, y + 8, qrSize);

  // Address and store location details
  const textX = x + qrSize + 20;
  s += renderSvgText("SCAN FOR STORE LOCATION & BRANCH DIRECTIONS", textX, y + 28, {
    size: 13,
    weight: 800,
    color: brand.primaryColor,
  });

  const branchText = brand.branches?.[0]?.address || "Available in Dubai, Abu Dhabi & Al Ain branches";
  s += renderSvgText(fitText(branchText, width - qrSize - 36, 12), textX, y + 50, {
    size: 12,
    weight: 500,
    color: "#334155",
  });

  s += renderSvgText(fitText(`Phone: ${brand.phone} · Timings: ${brand.timings}`, width - qrSize - 36, 11), textX, y + 70, {
    size: 11,
    weight: 600,
    color: "#64748b",
  });

  if (interactive && isSelected) {
    s += `<rect x="${x - 2}" y="${y - 2}" width="${width + 4}" height="${height + 4}" rx="12" fill="none" stroke="#2563eb" stroke-width="3" pointer-events="none"/>`;
  }
  s += `</g>`;
  return s;
}

function renderTextSection(p: {
  sec: FlyerSection;
  x: number;
  y: number;
  width: number;
  height: number;
  interactive?: boolean;
  isSelected?: boolean;
}) {
  const { sec, x, y, width, height, interactive, isSelected } = p;
  const text = sec.textBlock?.content || sec.title || "Promotional Announcement";
  const align = sec.textBlock?.align || "center";
  const rtl = hasArabic(text);
  const anchor = align === "center" ? "middle" : (align === "right") !== rtl ? "end" : "start";
  const textX = align === "center" ? x + width / 2 : align === "right" ? x + width - 16 : x + 16;

  let s = `<g data-section-id="${sec.id}">`;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="#f8fafc" stroke="#e2e8e1"/>`;
  s += renderSvgText(fitText(text, width - 32, sec.textBlock?.size || 15), textX, y + height / 2 + 5, {
    size: sec.textBlock?.size || 15,
    weight: sec.textBlock?.weight || 700,
    color: sec.textBlock?.color || "#1e293b",
    anchor,
  });

  if (interactive && isSelected) {
    s += `<rect x="${x - 2}" y="${y - 2}" width="${width + 4}" height="${height + 4}" rx="8" fill="none" stroke="#2563eb" stroke-width="3" pointer-events="none"/>`;
  }
  s += `</g>`;
  return s;
}

function renderImageSection(p: {
  sec: FlyerSection;
  images: Record<string, string>;
  x: number;
  y: number;
  width: number;
  height: number;
  interactive?: boolean;
  isSelected?: boolean;
}) {
  const { sec, images, x, y, width, height, interactive, isSelected } = p;
  const url = sec.imageBlock?.url ? images[sec.imageBlock.url] || sec.imageBlock.url : "";

  let s = `<g data-section-id="${sec.id}">`;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="#f1f5f9" stroke="#cbd5e1"/>`;
  if (url) {
    s += `<image href="${esc(url)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`;
  } else {
    s += renderSvgText("Image Section Placeholder", x + width / 2, y + height / 2, {
      size: 14,
      color: "#94a3b8",
      anchor: "middle",
    });
  }

  if (interactive && isSelected) {
    s += `<rect x="${x - 2}" y="${y - 2}" width="${width + 4}" height="${height + 4}" rx="10" fill="none" stroke="#2563eb" stroke-width="3" pointer-events="none"/>`;
  }
  s += `</g>`;
  return s;
}

function renderFooterSection(p: {
  sec: FlyerSection;
  brand: ReturnType<typeof resolveBrand>;
  logoHref: string;
  x: number;
  y: number;
  width: number;
  height: number;
  interactive?: boolean;
  isSelected?: boolean;
}) {
  const { sec, brand, logoHref, x, y, width, height, interactive, isSelected } = p;
  let s = `<g data-section-id="${sec.id}">`;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${brand.primaryColor}"/>`;

  // Store Brand on left
  if (logoHref) {
    s += `<image href="${esc(logoHref)}" x="${x + 12}" y="${y + 12}" width="40" height="40" preserveAspectRatio="xMidYMid meet"/>`;
  }
  const textX = logoHref ? x + 62 : x + 16;
  s += renderSvgText(fitText(brand.name, width * .42, 14), textX, y + 26, {
    size: 14,
    weight: 900,
    color: "#ffffff",
  });

  const branchSummary = brand.branches?.length
    ? brand.branches.map((b) => b.name).join(" · ")
    : "Dubai · Abu Dhabi · Al Ain";
  s += renderSvgText(fitText(branchSummary, width * .42, 11), textX, y + 46, {
    size: 11,
    weight: 600,
    color: brand.accentColor,
  });

  // Terms and disclaimer on right
  const custom = sec.footer?.customText || brand.terms;
  s += renderSvgText(fitText(custom, width * .46, 10), x + width - 16, y + 36, {
    size: 10,
    weight: 500,
    color: "#ffffff",
    anchor: "end",
  });

  if (interactive && isSelected) {
    s += `<rect x="${x - 2}" y="${y - 2}" width="${width + 4}" height="${height + 4}" rx="10" fill="none" stroke="#2563eb" stroke-width="3" pointer-events="none"/>`;
  }
  s += `</g>`;
  return s;
}

function renderGridSection(p: {
  grid: GridModel;
  secId: string;
  brand: ReturnType<typeof resolveBrand>;
  images: Record<string, string>;
  x: number;
  y: number;
  width: number;
  height: number;
  interactive?: boolean;
  selectedCellId?: string | null;
  selectedCellIds?: string[];
  isSelectedSec?: boolean;
}) {
  const { grid, secId, brand, images, x, y, width, height, interactive, selectedCellId, isSelectedSec } = p;
  const rows = grid.rows || 3;
  const cols = grid.cols || 3;
  const gap = grid.gap ?? 8;
  const padding = grid.padding ?? 6;

  const totalGapX = (cols - 1) * gap;
  const totalGapY = (rows - 1) * gap;
  const cellW = (width - padding * 2 - totalGapX) / cols;
  const cellH = (height - padding * 2 - totalGapY) / rows;

  let s = `<g data-section-id="${secId}" data-grid-id="${grid.id}">`;

  // Grid background & Outer border
  const outerBorder = grid.outerBorder;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="#ffffff"`;
  if (outerBorder?.enabled && outerBorder.style !== "none") {
    s += ` stroke="${outerBorder.color}" stroke-width="${outerBorder.width}"`;
    if (outerBorder.style === "dashed") s += ` stroke-dasharray="6 4"`;
    else if (outerBorder.style === "dotted") s += ` stroke-dasharray="2 3"`;
  }
  s += `/>`;

  // Render cells
  for (const cell of grid.cells) {
    if (cell.hidden) continue;

    const rSpan = cell.rowSpan || 1;
    const cSpan = cell.colSpan || 1;
    const cX = x + padding + cell.col * (cellW + gap);
    const cY = y + padding + cell.row * (cellH + gap);
    const actualW = cSpan * cellW + (cSpan - 1) * gap;
    const actualH = rSpan * cellH + (rSpan - 1) * gap;

    const isCellSelected = interactive && (p.selectedCellIds ? p.selectedCellIds.includes(cell.id) : selectedCellId === cell.id);

    s += renderCell({
      cell,
      x: cX,
      y: cY,
      width: actualW,
      height: actualH,
      brand,
      images,
      interactive,
      isSelected: isCellSelected,
    });
  }

  if (interactive && isSelectedSec) {
    s += `<rect x="${x - 2}" y="${y - 2}" width="${width + 4}" height="${height + 4}" rx="10" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="5 3" pointer-events="none"/>`;
  }

  s += `</g>`;
  return s;
}

function renderCell(p: {
  cell: GridCell;
  x: number;
  y: number;
  width: number;
  height: number;
  brand: ReturnType<typeof resolveBrand>;
  images: Record<string, string>;
  interactive?: boolean;
  isSelected?: boolean;
}) {
  const { cell, x, y, width, height, brand, images, interactive, isSelected } = p;
  let s = `<g data-cell-id="${cell.id}" data-row="${cell.row}" data-col="${cell.col}">`;

  // Cell Background
  const bg = cell.background || "#ffffff";
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${bg}"/>`;

  // Cell Borders
  const b = cell.borders;
  const drawSide = (side: "top" | "right" | "bottom" | "left", border?: BorderSettings) => {
    if (!border || !border.enabled || border.style === "none") return "";
    let dash = "";
    if (border.style === "dashed") dash = ` stroke-dasharray="5 3"`;
    else if (border.style === "dotted") dash = ` stroke-dasharray="2 2"`;

    if (side === "top")
      return `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="${border.color}" stroke-width="${border.width}"${dash}/>`;
    if (side === "right")
      return `<line x1="${x + width}" y1="${y}" x2="${x + width}" y2="${y + height}" stroke="${border.color}" stroke-width="${border.width}"${dash}/>`;
    if (side === "bottom")
      return `<line x1="${x}" y1="${y + height}" x2="${x + width}" y2="${y + height}" stroke="${border.color}" stroke-width="${border.width}"${dash}/>`;
    if (side === "left")
      return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + height}" stroke="${border.color}" stroke-width="${border.width}"${dash}/>`;
    return "";
  };

  s += drawSide("top", b?.top);
  s += drawSide("right", b?.right);
  s += drawSide("bottom", b?.bottom);
  s += drawSide("left", b?.left);

  // Content inside cell
  if (cell.contentType === "product" && cell.product) {
    s += renderProductCard({
      offer: cell.product,
      x: x + 4,
      y: y + 4,
      width: width - 8,
      height: height - 8,
      currency: brand.currency,
      brandColor: brand.primaryColor,
      accentColor: brand.accentColor,
      images,
    });
  } else if (cell.contentType === "banner" && cell.banner) {
    s += `<rect x="${x + 4}" y="${y + 4}" width="${width - 8}" height="${height - 8}" rx="6" fill="${cell.banner.bg || brand.primaryColor}"/>`;
    s += renderSvgText(fitText(cell.banner.title, width - 16, clamp(12, width * 0.08, 20)), x + width / 2, y + height / 2 - 4, {
      size: clamp(12, width * 0.08, 20),
      weight: 900,
      color: cell.banner.textColor || "#ffffff",
      anchor: "middle",
    });
    if (cell.banner.subtitle) {
      s += renderSvgText(fitText(cell.banner.subtitle, width - 16, clamp(9, width * 0.05, 13)), x + width / 2, y + height / 2 + 16, {
        size: clamp(9, width * 0.05, 13),
        weight: 600,
        color: brand.accentColor,
        anchor: "middle",
      });
    }
  } else if (cell.contentType === "text" && cell.text) {
    const align = cell.text.align || "center";
    const rtl = hasArabic(cell.text.content);
    const anchor = align === "center" ? "middle" : (align === "right") !== rtl ? "end" : "start";
    const textX = align === "center" ? x + width / 2 : align === "right" ? x + width - 8 : x + 8;
    s += renderSvgText(fitText(cell.text.content, width - 16, cell.text.size || 13), textX, y + height / 2 + 5, {
      size: cell.text.size || 13,
      weight: cell.text.weight || 600,
      color: cell.text.color || "#1e293b",
      anchor,
    });
  } else if (cell.contentType === "image" && cell.image) {
    const url = images[cell.image] || cell.image;
    s += `<image href="${esc(url)}" x="${x + 4}" y="${y + 4}" width="${width - 8}" height="${height - 8}" preserveAspectRatio="xMidYMid meet"/>`;
  } else if (interactive) {
    // Empty cell placeholder for editor
    s += `<rect x="${x + 2}" y="${y + 2}" width="${width - 4}" height="${height - 4}" rx="4" fill="rgba(241,245,249,0.5)" stroke="#cbd5e1" stroke-dasharray="3 3"/>`;
    s += `<text x="${x + width / 2}" y="${y + height / 2 + 4}" font-size="12" fill="#94a3b8" text-anchor="middle">+ Add Product</text>`;
  }

  if (interactive) {
    // Transparent click target overlay
    s += `<rect data-cell-target="${cell.id}" x="${x}" y="${y}" width="${width}" height="${height}" fill="transparent" style="cursor:pointer"/>`;
    if (isSelected) {
      s += `<rect x="${x - 1}" y="${y - 1}" width="${width + 2}" height="${height + 2}" rx="6" fill="none" stroke="#2563eb" stroke-width="2.5" pointer-events="none"/>`;
    }
  }

  s += `</g>`;
  return s;
}

export function renderProductCard(p: {
  offer?: Offer;
  x: number;
  y: number;
  width: number;
  height: number;
  currency: string;
  brandColor: string;
  accentColor: string;
  images: Record<string, string>;
}): string {
  const { offer, x, y, width, height, currency, brandColor, accentColor, images } = p;
  if (!offer) {
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="#f8fafc" stroke="#e2e8e1" stroke-dasharray="4 4"/>`;
  }

  const pad = Math.max(3, Math.min(10, width * .045));
  const innerW = width - pad * 2;
  const unit = Math.max(2, Math.min(14, width / 15, height / 17));
  const imageH = Math.max(8, height - unit * 7.3 - pad * 2);
  const textY = y + pad + imageH + unit * 1.25;
  const clip = `card-${esc(offer.id)}-${x}-${y}`;
  let s = `<g data-product-id="${esc(offer.id)}"><defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8"/></clipPath></defs><g clip-path="url(#${clip})">`;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="#ffffff"/>`;
  s += `<rect x="${x + pad}" y="${y + pad}" width="${innerW}" height="${imageH}" rx="6" fill="#f5f7f3"/>`;
  if (offer.image) s += `<image href="${esc(images[offer.image] || offer.image)}" x="${x + pad * 2}" y="${y + pad * 2}" width="${Math.max(1, innerW - pad * 2)}" height="${Math.max(1, imageH - pad * 2)}" preserveAspectRatio="xMidYMid meet"/>`;
  const discount = offer.price > offer.offer ? Math.round((1 - offer.offer / offer.price) * 100) : 0;
  const badge = offer.badge || (discount > 0 ? `-${discount}%` : "");
  if (badge) {
    const badgeW = Math.min(innerW * .65, unit * 7);
    s += `<rect x="${x + pad}" y="${y + pad}" width="${badgeW}" height="${unit * 1.8}" rx="4" fill="${brandColor}"/>`;
    s += renderSvgText(fitText(badge, badgeW - 6, unit * .85), x + pad + badgeW / 2, y + pad + unit * 1.22, {size: unit * .85, weight: 800, color: "#ffffff", anchor: "middle"});
  }
  s += renderSvgText(fitText(offer.name, innerW, unit), x + pad, textY, {size: unit, weight: 700});
  if (offer.arabicName) s += renderSvgText(fitText(offer.arabicName, innerW, unit * .9), x + width - pad, textY + unit * 1.25, {size: unit * .9, color: "#64748b", rtl: true});
  s += renderSvgText(fitText(offer.pack || "", innerW * .45, unit * .8), x + pad, y + height - unit * 4.1, {size: unit * .8, color: "#64748b"});
  if (offer.showOldPrice !== false && offer.price > offer.offer) {
    s += `<text x="${x + width - pad}" y="${y + height - unit * 4.1}" text-anchor="end" font-size="${unit * .85}" fill="#64748b" text-decoration="line-through">${esc(currency)} ${offer.price.toFixed(2)}</text>`;
  }
  s += `<rect x="${x + pad}" y="${y + height - unit * 2.7}" width="${innerW}" height="${unit * 2.4}" rx="5" fill="${esc(accentColor)}" opacity=".28"/>`;
  const price = `${currency} ${offer.offer.toFixed(2)}`;
  const priceSize = Math.min(unit * 1.9, innerW / (price.length * .68));
  s += renderSvgText(price, x + width - pad * 1.6, y + height - unit * .9, {size: priceSize, weight: 900, color: brandColor, anchor: "end"});
  return s + `</g></g>`;
}
