import { Campaign, Template } from "./model";
import {
  pageItems,
  pageRects,
  qrSvg,
  clamp,
  shade,
  gradientId,
} from "./flyer-layout";

const esc = (v: unknown) =>
  String(v).replace(
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

type Ink = { size?: number; anchor?: string; weight?: number; rtl?: boolean };

const txt = (v: string, x: number, y: number, fill: string, ink: Ink = {}) =>
  `<text x="${x}" y="${y}" font-size="${ink.size ?? 12}" fill="${fill}" text-anchor="${
    ink.anchor ?? "start"
  }" font-weight="${ink.weight ?? 700}"${
    ink.rtl ? ' direction="rtl"' : ""
  }>${esc(v)}</text>`;

const script = (
  v: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  anchor = "start",
) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-family="Georgia,'Times New Roman',serif" font-style="italic" font-weight="700">${esc(v)}</text>`;

/** Every Wear Mart poster shares this frame and swaps the hero scene. */
type Theme = {
  scene: "geometric" | "school" | "flag" | "sun" | "home" | "tech" | "sparkle";
  headline: string;
  arabic?: string;
  border: string;
  band: string;
  badge?: string;
};

const THEMES: Record<string, Theme> = {
  "wear-adventure": {
    scene: "geometric",
    headline: "MEGA SAVINGS",
    arabic: "عروض كبيرة",
    border: "#f7941d",
    band: "Items available in all 3 Branches",
  },
  "wear-school": {
    scene: "school",
    headline: "BACK TO SCHOOL",
    arabic: "العودة الى المدرسة",
    border: "#f7941d",
    band: "Items available in all 3 Branches",
  },
  "wear-weekend": {
    scene: "sun",
    headline: "WEEKEND DEALS",
    arabic: "عروض نهاية الأسبوع",
    border: "#f7941d",
    band: "Items available in all 3 Branches",
  },
  "wear-fresh": {
    scene: "sun",
    headline: "FRESH ARRIVALS",
    arabic: "وصل حديثاً",
    border: "#7cbf3f",
    band: "Items available in all 3 Branches",
  },
  "wear-home": {
    scene: "home",
    headline: "HOME ESSENTIALS",
    arabic: "مستلزمات المنزل",
    border: "#e0a95c",
    band: "Items available in all 3 Branches",
  },
  "wear-mega": {
    scene: "geometric",
    headline: "SUPER SAVINGS",
    arabic: "توفير كبير",
    border: "#f7941d",
    band: "Items available in all 3 Branches",
  },
  "wear-beauty": {
    scene: "sparkle",
    headline: "BEAUTY EDIT",
    arabic: "عروض الجمال",
    border: "#e58fb2",
    band: "Items available in all 3 Branches",
  },
  "wear-tech": {
    scene: "tech",
    headline: "SMART FINDS",
    arabic: "أجهزة ذكية",
    border: "#4cc9c0",
    band: "Items available in all 3 Branches",
  },
  "wear-festive": {
    scene: "flag",
    headline: "EID AL ETIHAD",
    arabic: "عيد الاتحاد",
    border: "#c9a227",
    band: "Items available in all 3 Branches",
    badge: "54",
  },
  "wear-everyday": {
    scene: "geometric",
    headline: "EVERYDAY VALUE",
    arabic: "أسعار يومية",
    border: "#f7941d",
    band: "Items available in all 3 Branches",
  },
};

const FALLBACK_THEME: Theme = THEMES["wear-everyday"];

function heroScene(theme: Theme, color: string, accent: string) {
  const sky = `url(#sky)`;
  let s = `<rect y="128" width="794" height="301" fill="${sky}"/>`;
  const deep = shade(color, -22),
    warm = "#f7941d";

  switch (theme.scene) {
    case "geometric": {
      s += `<path d="M-40 429 L300 128 L470 128 L120 429 Z" fill="${shade(color, -12)}" opacity=".75"/>`;
      s += `<path d="M250 429 L540 128 L620 128 L330 429 Z" fill="${warm}" opacity=".55"/>`;
      s += `<path d="M470 429 L700 128 L760 128 L530 429 Z" fill="${deep}" opacity=".7"/>`;
      s += `<path d="M0 128 L794 128 L794 150 L0 172 Z" fill="#ffffff" opacity=".08"/>`;
      for (const [x, y, size, fill, opacity] of [
        [96, 210, 34, "#ffffff", 0.75],
        [660, 188, 28, warm, 0.9],
        [724, 320, 22, "#ffffff", 0.6],
        [238, 330, 18, warm, 0.8],
        [560, 250, 24, "#ffffff", 0.45],
      ] as [number, number, number, string, number][]) {
        s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="3" fill="none" stroke="${fill}" stroke-width="4" opacity="${opacity}" transform="rotate(45 ${x + size / 2} ${y + size / 2})"/>`;
      }
      break;
    }
    case "school": {
      s += `<g transform="translate(30 214) rotate(-13)"><rect width="128" height="170" rx="9" fill="#22b2c4"/><rect x="10" y="8" width="108" height="152" rx="3" fill="#fffdf5"/>`;
      for (let i = 0; i < 9; i++)
        s += `<path d="M28 ${30 + i * 14}H108" stroke="#b8d7e1"/>`;
      s += `<path d="M-4 9V160" stroke="#123945" stroke-width="7" stroke-dasharray="3 15"/></g>`;
      s += `<g transform="translate(636 296)"><rect y="47" width="122" height="28" rx="3" fill="#249faf"/><rect x="-14" y="18" width="126" height="27" rx="3" fill="#e74838"/><rect x="5" y="-12" width="110" height="28" rx="3" fill="#ffc84a"/><circle cx="56" cy="-44" r="24" fill="#64a938"/><path d="M57-60Q53-80 68-82" stroke="#294e22" stroke-width="6" fill="none"/></g>`;
      s += `<g transform="translate(80 350)"><circle r="30" fill="#ffffff" opacity=".9"/><circle r="30" fill="none" stroke="#123945" stroke-width="3" opacity=".5"/><path d="M-8-6h16v12h-16z" fill="#123945" opacity=".7"/></g>`;
      s += `<path d="M0 429 L794 200" stroke="#ffffff" stroke-width="2" opacity=".18"/>`;
      break;
    }
    case "flag": {
      s += `<path d="M0 128 L300 128 L120 429 L0 429 Z" fill="#ce1126" opacity=".92"/>`;
      s += `<path d="M120 128 L200 128 L20 429 L0 429 L0 400 Z" fill="#ffffff" opacity=".85"/>`;
      s += `<path d="M214 128 L268 128 L88 429 L34 429 Z" fill="#00843d" opacity=".9"/>`;
      s += `<path d="M290 128 L330 128 L150 429 L110 429 Z" fill="#000000" opacity=".82"/>`;
      s += `<path d="M560 429 L760 128 L794 128 L794 220 Z" fill="#00843d" opacity=".9"/>`;
      s += `<path d="M520 429 L720 128 L760 128 L560 429 Z" fill="#ffffff" opacity=".8"/>`;
      s += `<path d="M660 429 L794 250 L794 300 L720 429 Z" fill="#000000" opacity=".75"/>`;
      for (const [x, y, r] of [
        [640, 190, 26],
        [700, 156, 20],
        [596, 246, 16],
      ] as [number, number, number][]) {
        s += `<g transform="translate(${x} ${y}) rotate(-14)"><path d="M${-r} 0 L${r} 0 L${r * 0.4} ${r * 0.34} L${-r * 0.5} ${r * 0.34} Z" fill="#ffffff" opacity=".95"/><path d="M${r * 0.3} ${-r * 0.1} L${r * 1.9} ${-r * 0.34} L${r * 1.9} 0 L${r * 0.3} ${r * 0.16} Z" fill="#ffffff" opacity=".5"/></g>`;
      }
      break;
    }
    case "sun": {
      s += `<circle cx="397" cy="330" r="150" fill="#ffffff" opacity=".22"/>`;
      s += `<circle cx="397" cy="330" r="104" fill="${accent}" opacity=".55"/>`;
      s += `<path d="M0 384 Q200 340 397 384 T794 384 V429 H0 Z" fill="${shade(color, -26)}" opacity=".75"/>`;
      s += `<path d="M0 408 Q200 372 397 408 T794 408 V429 H0 Z" fill="${shade(color, -14)}" opacity=".8"/>`;
      s += `<path d="M96 429 Q104 372 150 366 Q120 402 132 429 Z" fill="#ffffff" opacity=".35"/>`;
      s += `<path d="M700 429 Q692 366 646 360 Q676 400 664 429 Z" fill="#ffffff" opacity=".35"/>`;
      break;
    }
    case "home": {
      s += `<path d="M0 429 L0 356 L120 288 L240 356 L240 429 Z" fill="#ffffff" opacity=".22"/>`;
      s += `<path d="M286 429 L286 340 L397 268 L508 340 L508 429 Z" fill="#ffffff" opacity=".3"/>`;
      s += `<path d="M554 429 L554 356 L674 288 L794 356 L794 429 Z" fill="#ffffff" opacity=".22"/>`;
      s += `<rect x="360" y="360" width="74" height="69" fill="${shade(color, -20)}" opacity=".8"/>`;
      s += `<circle cx="397" cy="176" r="38" fill="${accent}" opacity=".7"/>`;
      break;
    }
    case "tech": {
      for (let i = 0; i < 9; i++)
        s += `<path d="M${60 + i * 90} 128 V429" stroke="#ffffff" stroke-width="1" opacity=".16"/>`;
      for (let i = 0; i < 4; i++)
        s += `<path d="M0 ${190 + i * 70} H794" stroke="#ffffff" stroke-width="1" opacity=".16"/>`;
      s += `<g transform="translate(120 200)"><rect width="120" height="170" rx="16" fill="${shade(color, -30)}" opacity=".9"/><rect x="10" y="14" width="100" height="142" rx="9" fill="${accent}" opacity=".35"/></g>`;
      s += `<g transform="translate(574 226)"><rect width="150" height="96" rx="12" fill="${shade(color, -30)}" opacity=".9"/><rect x="14" y="16" width="122" height="64" rx="6" fill="#ffffff" opacity=".22"/></g>`;
      s += `<circle cx="420" cy="180" r="18" fill="${accent}" opacity=".8"/><circle cx="470" cy="180" r="8" fill="#ffffff" opacity=".7"/>`;
      break;
    }
    case "sparkle": {
      s += `<circle cx="150" cy="260" r="120" fill="#ffffff" opacity=".2"/>`;
      s += `<circle cx="650" cy="300" r="140" fill="${accent}" opacity=".35"/>`;
      for (const [x, y, r] of [
        [150, 200, 16],
        [232, 300, 10],
        [640, 180, 14],
        [700, 336, 9],
      ] as [number, number, number][]) {
        s += `<path d="M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z" fill="#ffffff" opacity=".85"/>`;
      }
      break;
    }
  }
  return s;
}

function branchIcon(x: number, y: number, color: string) {
  return (
    `<g transform="translate(${x} ${y})" opacity=".85">` +
    `<path d="M0 14 H44 V10 Q44 4 38 4 H26 L20 -4 H8 L4 4 H2 Q0 4 0 6 Z" fill="${color}"/>` +
    `<circle cx="11" cy="16" r="4" fill="#31413f"/><circle cx="33" cy="16" r="4" fill="#31413f"/>` +
    `</g>`
  );
}

export function wearFlyer(
  c: Campaign,
  t: Template,
  page: number,
  images: Record<string, string>,
) {
  const color = t.color,
    accent = t.accent,
    theme = THEMES[t.style] ?? FALLBACK_THEME,
    deep = shade(color, -24),
    bright = shade(color, 14),
    soft = shade(color, -6),
    g = (suffix: string) => gradientId("wear", t) + "-" + suffix;

  const date = (v: string) =>
    new Date(v + "T12:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const arabicDate = (v: string) =>
    new Date(v + "T12:00:00").toLocaleDateString("ar-AE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="794" height="1123" role="img" aria-label="${esc(c.name)}"><defs>` +
    `<linearGradient id="${g("sky")}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bright}"/><stop offset="1" stop-color="${shade(color, -6)}"/></linearGradient>` +
    `<linearGradient id="${g("head")}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${bright}"/><stop offset="1" stop-color="${deep}"/></linearGradient>` +
    `<linearGradient id="${g("band")}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${shade(color, 6)}"/><stop offset="1" stop-color="${deep}"/></linearGradient>` +
    `<linearGradient id="${g("price")}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${bright}"/><stop offset="1" stop-color="${deep}"/></linearGradient>` +
    `<linearGradient id="${g("plate")}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${shade(color, 8)}"/><stop offset="1" stop-color="${shade(color, -30)}"/></linearGradient>` +
    `<radialGradient id="${g("glow")}" cx="50%" cy="50%" r="50%"><stop stop-color="${accent}" stop-opacity=".5"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>` +
    `<filter id="${g("soft")}" x="-14%" y="-14%" width="128%" height="128%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0c2b31" flood-opacity=".14"/></filter>` +
    `</defs><g font-family="Arial,Helvetica,sans-serif"><rect width="794" height="1123" fill="#fffdf6"/>` +
    `<rect width="794" height="94" fill="url(#${g("head")})"/>`;

  // Masthead: brand name, monogram plate, Arabic name.
  s += script(c.brand.name, 30, 62, 40, "#ffffff");
  s += `<rect x="332" y="8" width="130" height="78" rx="10" fill="#ffffff" opacity=".95"/>`;
  s += `<text x="356" y="62" font-size="46" font-weight="900" fill="${color}">W</text>`;
  s += `<text x="404" y="76" font-size="46" font-weight="900" fill="${shade(color, -12)}">M</text>`;
  s += script(c.brand.name, 397, 52, 15, shade(color, -18), "middle");
  // Right-to-left text anchors on its start edge, which sits on the right, so
  // Arabic masthead copy uses text-anchor="start" at the right margin.
  s += `<text x="762" y="62" font-size="40" fill="${accent}" text-anchor="start" direction="rtl">${esc(
    c.brand.arabicName || "وير مارت",
  )}</text>`;

  // Offer line band.
  s += `<rect y="94" width="794" height="34" fill="#ffffff"/>`;
  s += txt(
    `العروض سارية حتى ${arabicDate(c.end)} أو حتى نفاد الكمية`,
    770,
    117,
    color,
    { size: 12, anchor: "start", weight: 600, rtl: true },
  );
  s += txt(
    `Promotional offers valid until ${date(c.end)} or until stocks last. Bulk sale not allowed. Images are for illustration purposes only.`,
    397,
    117,
    "#7b8b8a",
    { size: 9, anchor: "middle", weight: 400 },
  );

  // Hero.
  s += heroScene(theme, color, accent);
  s += `<ellipse cx="397" cy="228" rx="250" ry="150" fill="url(#${g("glow")})"/>`;
  s += `<rect x="222" y="170" width="350" height="214" rx="14" fill="url(#${g("plate")})" fill-opacity=".95" stroke="${accent}" stroke-width="2"/>`;
  s += txt(theme.headline, 397, 206, "#ffffff", {
    size: 22,
    anchor: "middle",
    weight: 900,
  });
  if (theme.arabic)
    s += txt(theme.arabic, 206, 206, "#ffffff", {
      size: 18,
      anchor: "start",
      weight: 800,
      rtl: true,
    });
  s += `<text x="318" y="284" font-size="100" font-weight="900" fill="${accent}">W</text>`;
  s += `<text x="404" y="348" font-size="100" font-weight="900" fill="${accent}">M</text>`;
  s += script(c.brand.name, 397, 376, 24, "#ffffff", "middle");
  if (theme.badge) {
    s += `<circle cx="700" cy="392" r="40" fill="#ffffff" opacity=".95"/>`;
    s += txt(theme.badge, 700, 408, color, {
      size: 44,
      anchor: "middle",
      weight: 900,
    });
  }

  // Branch strip.
  s += `<rect y="429" width="794" height="30" fill="url(#${g("band")})"/>`;
  s += txt(theme.band, 397, 450, "#ffffff", {
    size: 14,
    anchor: "middle",
    weight: 700,
  });
  s += txt("أغراض متوفرة في جميع الفروع", 776, 450, accent, {
    size: 13,
    anchor: "start",
    weight: 600,
    rtl: true,
  });

  // Product cards.
  const products = pageItems(c, t, page);
  pageRects(c, t, page).forEach(({ x, y, w, h }, i) => {
    const p = products[i];
    const pad = clamp(6, Math.min(w, h) * 0.035, 14),
      radius = clamp(6, Math.min(w, h) * 0.06, 18);
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="#ffffff" stroke="${theme.border}" stroke-width="2" stroke-dasharray="6 5" filter="url(#${g("soft")})"/>`;
    if (!p) {
      s += txt("+ product", x + w / 2, y + h / 2, "#9db1ad", {
        size: 13,
        anchor: "middle",
        weight: 400,
      });
      return;
    }

    const footer = clamp(38, h * 0.32, 96),
      priceR = clamp(13, Math.min(w, h) * 0.15, 32),
      priceCx = x + pad + priceR,
      priceCy = y + h - pad - priceR,
      nameZoneLeft = priceCx + priceR + pad * 0.6,
      nameZoneRight = x + w - pad,
      nameCx = (nameZoneLeft + nameZoneRight) / 2,
      nameSize = clamp(9, Math.min(w * 0.05, h * 0.075), 15),
      imgTop = y + pad,
      imgBottom = y + h - footer,
      imgH = Math.max(14, imgBottom - imgTop),
      showOld =
        p.showOldPrice === true ||
        (p.showOldPrice === undefined && p.price > p.offer);

    if (p.image) {
      const cx = x + w / 2;
      s += `<ellipse cx="${cx}" cy="${imgBottom}" rx="${(w - pad * 2) * 0.3}" ry="${imgH * 0.06}" fill="#0c2b31" opacity=".07"/>`;
      s += `<image href="${esc(images[p.image] || p.image)}" x="${x + pad}" y="${imgTop}" width="${w - pad * 2}" height="${imgH}" preserveAspectRatio="xMidYMid meet"/>`;
    }

    if (p.badge)
      s +=
        `<rect x="${x + pad}" y="${y + pad}" width="${Math.min(w - pad * 2, p.badge.length * 6 + 16)}" height="${Math.round(nameSize * 1.9)}" rx="${nameSize}" fill="${theme.border}"/>` +
        txt(p.badge.slice(0, 22), x + pad + 9, y + pad + nameSize * 1.35, "#ffffff", {
          size: nameSize * 0.85,
          weight: 700,
        });

    // Price roundel, with the old price tucked above the new one when the
    // product is discounted so the card never needs an extra row.
    s += `<circle cx="${priceCx}" cy="${priceCy}" r="${priceR}" fill="url(#${g("price")})" stroke="#ffffff" stroke-width="2"/>`;
    if (showOld)
      s += `<text x="${priceCx}" y="${priceCy - priceR * 0.34}" font-size="${priceR * 0.44}" fill="#ffffff" fill-opacity=".8" text-anchor="middle" text-decoration="line-through">${p.price.toFixed(2)}</text>`;
    s += txt(
      p.offer.toFixed(2),
      priceCx,
      priceCy + (showOld ? priceR * 0.46 : priceR * 0.16),
      "#ffffff",
      {
        size: Math.min(
          priceR * 1.05,
          (priceR * 1.75) / (p.offer.toFixed(2).length * 0.56),
        ),
        anchor: "middle",
        weight: 900,
      },
    );
    s += txt(c.brand.currency, priceCx, priceCy + priceR * 0.72, accent, {
      size: Math.max(8, priceR * 0.46),
      anchor: "middle",
      weight: 700,
    });

    // Name stack, laid out upward from the bottom of the card so nothing
    // collides when the card is small.
    const stack: { text: string; fill: string; weight: number; rtl?: boolean; size: number }[] = [];
    if (p.pack)
      stack.push({
        text: p.pack.slice(0, 30),
        fill: "#7b8d8b",
        weight: 400,
        size: nameSize * 0.85,
      });
    if (p.arabicName)
      stack.push({
        text: p.arabicName.slice(0, 34),
        fill: soft,
        weight: 600,
        rtl: true,
        size: nameSize,
      });
    stack.push({
      text: p.name.length > 30 ? p.name.slice(0, 29) + "…" : p.name,
      fill: "#1f3a3d",
      weight: 700,
      size: nameSize,
    });
    let baseline = y + h - pad - 1;
    for (const line of stack) {
      baseline -= line.size * 0.92;
      s += txt(line.text, nameCx, baseline, line.fill, {
        size: line.size,
        anchor: "middle",
        weight: line.weight,
        rtl: line.rtl,
      });
      baseline -= line.size * 0.24;
    }
  });

  if (!products.some(Boolean))
    s += txt("Choose your products to fill this page", 397, 700, "#8aa3a0", {
      size: 18,
      anchor: "middle",
      weight: 400,
    });

  // Branches.
  const branches = c.brand.branches?.length
    ? c.brand.branches
    : [
        {
          name: "Branch 1",
          address: c.brand.address,
          url: c.brand.locationUrl || "",
        },
      ];
  s += `<path d="M18 985 H776" stroke="${theme.border}" stroke-width="2" stroke-dasharray="6 5"/>`;
  const bw = 758 / branches.length;
  branches.slice(0, 3).forEach((b, i) => {
    const x = 18 + i * bw,
      branchUrl = b.url || (i === 0 ? c.brand.locationUrl : undefined);
    s += txt(b.name, x + 8, 1000, color, { size: 13, weight: 800 });
    const lines = b.address.match(/.{1,34}(?:\s|$)|.{1,34}/g) || [];
    lines.slice(0, 3).forEach((line, j) => {
      s += txt(line.trim(), x + 8, 1016 + j * 12, "#4d5a58", {
        size: 10,
        weight: 400,
      });
    });
    if (b.url || branchUrl) {
      const url = branchUrl || b.url;
      s += branchIcon(x + 8, 1046, color);
      s += txt("Scan for location", x + 60, 1058, "#7b8b8a", {
        size: 9,
        weight: 400,
      });
      s += qrSvg(url, x + bw - 70, 992, 60);
    } else {
      s += branchIcon(x + 8, 1046, color);
    }
  });

  s += `<rect y="1070" width="794" height="34" fill="url(#${g("band")})"/>`;
  s += txt(
    "New Stores Timing Everyday: All Branches 9:00 AM till 2:00 AM - Midnight",
    397,
    1092,
    "#ffffff",
    { size: 12, anchor: "middle", weight: 700 },
  );
  s += txt(c.brand.terms.slice(0, 130), 397, 1118, color, {
    size: 9,
    anchor: "middle",
    weight: 400,
  });

  return s + "</g></svg>";
}
