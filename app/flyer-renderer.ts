import {
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
  const anchor = options.anchor ?? (isAr ? "end" : "start");
  const fill = options.color || "#1e293b";
  const size = options.size || 14;
  const weight = options.weight || 600;
  const family = options.family || "Arial, Helvetica, sans-serif";

  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" font-family="${family}"${
    isAr ? ' direction="rtl"' : ""
  }>${esc(text)}</text>`;
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
    selectedSectionId?: string | null;
    images?: Record<string, string>;
    pageNumber?: number;
    totalPages?: number;
  } = {},
): string {
  const brand = resolveBrand(brandInput);
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

  let defs = bgGradientDef;
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
    ? Math.max(300, (availableH - fixedSectionHeights - 20) / gridSections.length)
    : 450;

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
        isSelectedSec,
      });
      currentY += gridH + 12;
    } else if (sec.type === "footer") {
      const footH = 65;
      const footY = PAGE_H - footH - 12;
      body += renderFooterSection({
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
  const primary = brand.primaryColor;
  const accent = brand.accentColor;

  let s = `<g data-section-id="${sec.id}">`;

  // Hero Card background
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="${primary}" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.12))"/>`;

  // Subtle decorative gloss
  s += `<ellipse cx="${x + width * 0.75}" cy="${y + 50}" rx="${width * 0.4}" ry="90" fill="${accent}" fill-opacity="0.18"/>`;

  // Top masthead bar inside hero
  const topBarH = 62;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${topBarH}" rx="12" fill="rgba(0,0,0,0.15)"/>`;

  // Dynamic Logo or Monogram
  if (logoHref) {
    s += `<image href="${esc(logoHref)}" x="${x + 16}" y="${y + 10}" width="54" height="42" preserveAspectRatio="xMidYMid meet"/>`;
  } else {
    s += `<rect x="${x + 16}" y="${y + 11}" width="42" height="40" rx="8" fill="#ffffff"/>`;
    s += `<text x="${x + 37}" y="${y + 36}" font-size="22" font-weight="900" fill="${primary}" text-anchor="middle">${esc(
      brand.name.charAt(0).toUpperCase(),
    )}</text>`;
  }

  // Store Brand Name (English)
  const brandX = logoHref ? x + 78 : x + 66;
  s += renderSvgText(brand.name.toUpperCase(), brandX, y + 36, {
    size: 20,
    weight: 900,
    color: "#ffffff",
  });

  // Store Arabic Brand Name (RTL)
  if (brand.arabicName) {
    s += renderSvgText(brand.arabicName, x + width - 18, y + 36, {
      size: 20,
      weight: 800,
      color: accent,
      rtl: true,
    });
  } else {
    s += renderSvgText("عروض خاصة", x + width - 18, y + 36, {
      size: 16,
      weight: 800,
      color: accent,
      rtl: true,
    });
  }

  // Main Promotional Headline
  const headline = sec.title || "FRESH PICKS · BIG SAVINGS";
  const headlineSize = clamp(24, Math.floor(width / Math.max(headline.length * 0.52, 10)), 44);
  const headlineY = sec.arabicTitle ? y + 115 : y + 135;
  s += `<text x="${x + width / 2}" y="${headlineY}" font-size="${headlineSize}" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-0.5">${esc(
    headline,
  )}</text>`;

  if (sec.arabicTitle) {
    s += renderSvgText(sec.arabicTitle, x + width / 2, headlineY + 32, {
      size: Math.min(headlineSize, 26),
      weight: 800,
      color: accent,
      anchor: "middle",
      rtl: true,
    });
  }

  // Promotional Subtitle
  const sub = sec.subtitle || "Offers valid across all branches while stocks last";
  const subY = sec.arabicTitle ? headlineY + 54 : y + 172;
  s += renderSvgText(sub, x + width / 2, subY, {
    size: 13,
    weight: 600,
    color: "#ffffff",
    anchor: "middle",
  });

  // Yellow Offer Band at bottom of hero
  const bandH = 44;
  const bandY = y + height - bandH;
  s += `<path d="M ${x} ${bandY} L ${x + width} ${bandY} L ${x + width} ${y + height - 12} Q ${x + width} ${y + height} ${x + width - 12} ${y + height} L ${x + 12} ${y + height} Q ${x} ${y + height} ${x} ${y + height - 12} Z" fill="${accent}"/>`;

  const badgeText = sec.badge || "WEEKLY SPECIAL OFFERS";
  s += renderSvgText(badgeText, x + 20, bandY + 28, {
    size: 14,
    weight: 900,
    color: primary,
  });

  s += renderSvgText(`PRICES IN ${brand.currency} · أفضل الأسعار`, x + width - 20, bandY + 28, {
    size: 12,
    weight: 800,
    color: primary,
    anchor: "end",
    rtl: true,
  });

  if (interactive && isSelected) {
    s += `<rect x="${x - 3}" y="${y - 3}" width="${width + 6}" height="${height + 6}" rx="15" fill="none" stroke="#2563eb" stroke-width="3" stroke-dasharray="6 4" pointer-events="none"/>`;
  }

  s += `</g>`;
  return s;
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
  s += renderSvgText(badge, x + 91, y + 33, {
    size: 12,
    weight: 900,
    color: "#0f172a",
    anchor: "middle",
  });

  // Title
  const title = sec.title || "UP TO 50% OFF ON SELECTED ITEMS";
  s += renderSvgText(title, x + 180, y + 35, {
    size: 18,
    weight: 900,
    color: "#ffffff",
  });

  // Subtitle
  const sub = sec.subtitle || "Limited time promotional deals. Hurry while stocks last!";
  s += renderSvgText(sub, x + 16, y + 68, {
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
  s += renderSvgText(mainTitle, x + 16, y + 26, {
    size: 15,
    weight: 900,
    color: "#ffffff",
  });

  if (sec.subtitle) {
    s += renderSvgText(`- ${sec.subtitle}`, x + 24 + mainTitle.length * 8.5, y + 26, {
      size: 12,
      weight: 700,
      color: brand.accentColor,
    });
  }

  if (sec.badge) {
    s += `<rect x="${x + width - 140}" y="${y + 8}" width="124" height="26" rx="6" fill="${brand.accentColor}"/>`;
    s += renderSvgText(sec.badge, x + width - 78, y + 25, {
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
  s += renderSvgText(badgeText, rightX + 90, y + 37, {
    size: 11,
    weight: 900,
    color: "#ffffff",
    anchor: "middle",
  });

  const name = prod?.name || sec.title || "Featured Premium Product";
  s += renderSvgText(name, rightX, y + 80, {
    size: 20,
    weight: 800,
    color: "#0f172a",
  });

  if (prod?.arabicName) {
    s += renderSvgText(prod.arabicName, rightX, y + 106, {
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
  if (oldP && oldP > newP) {
    s += `<text x="0" y="24" font-size="16" fill="#94a3b8" text-decoration="line-through">${brand.currency} ${oldP.toFixed(2)}</text>`;
  }
  s += `<text x="${oldP && oldP > newP ? 130 : 0}" y="32" font-size="34" font-weight="900" fill="${brand.primaryColor}">${brand.currency} ${newP.toFixed(2)}</text>`;
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
  s += renderSvgText(branchText, textX, y + 50, {
    size: 12,
    weight: 500,
    color: "#334155",
  });

  s += renderSvgText(`Phone: ${brand.phone || "+971 4 123 4567"} · Timings: ${brand.timings}`, textX, y + 70, {
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
  const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
  const textX = align === "center" ? x + width / 2 : align === "right" ? x + width - 16 : x + 16;

  let s = `<g data-section-id="${sec.id}">`;
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="#f8fafc" stroke="#e2e8e1"/>`;
  s += renderSvgText(text, textX, y + height / 2 + 5, {
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
  s += renderSvgText(brand.name, textX, y + 26, {
    size: 14,
    weight: 900,
    color: "#ffffff",
  });

  const branchSummary = brand.branches?.length
    ? brand.branches.map((b) => b.name).join(" · ")
    : "Dubai · Abu Dhabi · Al Ain";
  s += renderSvgText(branchSummary, textX, y + 46, {
    size: 11,
    weight: 600,
    color: brand.accentColor,
  });

  // Terms and disclaimer on right
  const custom = sec.footer?.customText || brand.terms;
  s += renderSvgText(custom, x + width - 16, y + 36, {
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

    const isCellSelected = interactive && selectedCellId === cell.id;

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
    s += renderSvgText(cell.banner.title, x + width / 2, y + height / 2 - 4, {
      size: clamp(12, width * 0.08, 20),
      weight: 900,
      color: cell.banner.textColor || "#ffffff",
      anchor: "middle",
    });
    if (cell.banner.subtitle) {
      s += renderSvgText(cell.banner.subtitle, x + width / 2, y + height / 2 + 16, {
        size: clamp(9, width * 0.05, 13),
        weight: 600,
        color: brand.accentColor,
        anchor: "middle",
      });
    }
  } else if (cell.contentType === "text" && cell.text) {
    const align = cell.text.align || "center";
    const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
    const textX = align === "center" ? x + width / 2 : align === "right" ? x + width - 8 : x + 8;
    s += renderSvgText(cell.text.content, textX, y + height / 2 + 5, {
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

  let s = `<g data-product-id="${offer.id}">`;

  // Card Background
  s += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="#ffffff"/>`;

  // Layout calculations
  const pad = 6;
  const innerW = width - pad * 2;

  // Image height is roughly 48% of card height
  const imgH = clamp(36, height * 0.48, height - 60);
  const imgY = y + pad;

  // Image container with soft backdrop
  s += `<rect x="${x + pad}" y="${imgY}" width="${innerW}" height="${imgH}" rx="4" fill="#fafaf9"/>`;

  if (offer.image) {
    const url = images[offer.image] || offer.image;
    s += `<image href="${esc(url)}" x="${x + pad + 2}" y="${imgY + 2}" width="${innerW - 4}" height="${imgH - 4}" preserveAspectRatio="xMidYMid meet" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"/>`;
  }

  // Discount badge calculation if old price > offer price
  let badgeText = offer.badge;
  if (!badgeText && offer.price && offer.price > offer.offer) {
    const discount = Math.round(((offer.price - offer.offer) / offer.price) * 100);
    if (discount > 0) badgeText = `-${discount}%`;
  }

  if (badgeText) {
    const bW = clamp(40, width * 0.35, 62);
    const bH = 20;
    s += `<rect x="${x + pad + 4}" y="${imgY + 4}" width="${bW}" height="${bH}" rx="4" fill="#dc2626"/>`;
    s += renderSvgText(badgeText, x + pad + 4 + bW / 2, imgY + 18, {
      size: 11,
      weight: 900,
      color: "#ffffff",
      anchor: "middle",
    });
  }

  // Pack badge if exists (e.g. "1 kg")
  if (offer.pack) {
    const packW = clamp(36, width * 0.32, 54);
    s += `<rect x="${x + width - pad - packW - 4}" y="${imgY + 4}" width="${packW}" height="18" rx="3" fill="rgba(255,255,255,0.92)" stroke="#e2e8e1"/>`;
    s += renderSvgText(offer.pack, x + width - pad - packW / 2 - 4, imgY + 16, {
      size: 9,
      weight: 700,
      color: "#475569",
      anchor: "middle",
    });
  }

  // Text content area
  const textAreaY = imgY + imgH + 12;
  const nameSize = clamp(9, Math.min(width * 0.075, 14), 15);

  // English Product Name
  s += renderSvgText(offer.name.slice(0, 32), x + pad, textAreaY, {
    size: nameSize,
    weight: 700,
    color: "#0f172a",
  });

  // Arabic Product Name (if available)
  if (offer.arabicName) {
    s += renderSvgText(offer.arabicName.slice(0, 32), x + width - pad, textAreaY + 14, {
      size: nameSize - 1,
      weight: 600,
      color: "#64748b",
      rtl: true,
    });
  }

  // Price Roundel / Block at bottom
  const priceY = y + height - 8;
  const priceSize = clamp(15, Math.min(width * 0.16, 26), 30);

  // Old price (strike-through)
  const showOld = offer.showOldPrice !== false && offer.price > offer.offer;
  if (showOld) {
    s += `<text x="${x + pad}" y="${priceY - 3}" font-size="11" font-weight="600" fill="#94a3b8" text-decoration="line-through">${currency} ${offer.price.toFixed(
      2,
    )}</text>`;
  }

  // New selling price in striking brand color
  s += `<text x="${x + width - pad}" y="${priceY}" font-size="${priceSize}" font-weight="900" fill="${brandColor}" text-anchor="end">${currency} <tspan font-size="${priceSize * 1.1}">${offer.offer.toFixed(
    2,
  )}</tspan></text>`;

  s += `</g>`;
  return s;
}
