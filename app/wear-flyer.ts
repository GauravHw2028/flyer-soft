import { Campaign, Template } from "./model";
import { pageItems, slotRects, qrSvg } from "./flyer-layout";
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
const txt = (
  v: string,
  x: number,
  y: number,
  size: number,
  color: string,
  anchor = "start",
  weight = 700,
) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}">${esc(v)}</text>`;
export function wearFlyer(
  c: Campaign,
  t: Template,
  page: number,
  images: Record<string, string>,
) {
  const school = t.style === "wear-school",
    adventure = t.style === "wear-adventure",
    color = t.color,
    accent = t.accent,
    gradient =
      "sky-" + t.id.replace(/[^a-zA-Z0-9_-]/g, "") + "-" + color.slice(1);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="794" height="1123" role="img" aria-label="${esc(c.name)}"><defs><linearGradient id="${gradient}" x2="0" y2="1"><stop stop-color="${school ? "#ffcb8c" : color}"/><stop offset="1" stop-color="${school ? "#fff1c4" : adventure ? "#509198" : "#f4e5ce"}"/></linearGradient></defs><g font-family="Arial,Helvetica,sans-serif"><rect width="794" height="1123" fill="#fffdf6"/><rect width="794" height="94" fill="${color}"/>`;
  s += txt(c.brand.name, 32, 62, 42, school ? "white" : accent);
  s += `<text x="761" y="62" font-size="41" fill="${school ? "white" : accent}" text-anchor="start" direction="rtl">${esc(c.brand.arabicName || "")}</text>`;
  if (c.brand.logo)
    s += `<image href="${esc(images[c.brand.logo] || c.brand.logo)}" x="359" y="10" width="75" height="75" preserveAspectRatio="xMidYMid meet"/>`;
  else s += txt("WM", 397, 59, 31, accent, "middle", 900);
  const date = (v: string) =>
    new Date(v + "T12:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  s += txt(
    `${date(c.start)} — ${date(c.end)} · While stocks last`,
    397,
    115,
    13,
    color,
    "middle",
  );
  s += `<rect y="128" width="794" height="301" fill="url(#${gradient})"/>`;
  if (adventure) {
    s += `<path d="M0 425V349L66 264 132 348 195 287 303 425Z" fill="#d4bda1"/><path d="M0 425L66 264 60 373 132 348 159 425Z" fill="#f7e5d0"/><path d="M516 425L623 282 701 354 749 233 794 317V425Z" fill="#b9a287"/><path d="M623 282L651 369 701 354 749 233 753 395 794 317V425Z" fill="#eedec8"/>`;
    for (const [x, y, r] of [
      [96, 209, 56],
      [668, 203, 44],
      [731, 304, 26],
    ])
      s += `<g transform="translate(${x} ${y})"><ellipse rx="${r}" ry="${r * 1.16}" fill="#fff0dc"/><ellipse rx="${r * 0.58}" ry="${r * 1.16}" fill="#bd8d70"/><ellipse rx="${r * 0.23}" ry="${r * 1.16}" fill="#f3e3ca"/><path d="M${-r * 0.45} ${r * 0.94}L-13 ${r * 1.5}H13L${r * 0.45} ${r * 0.94}" fill="none" stroke="#f8e7d4" stroke-width="3"/><rect x="-13" y="${r * 1.48}" width="26" height="17" fill="#dcb897"/></g>`;
  } else if (school) {
    s += `<g transform="translate(28 225) rotate(-13)"><rect width="134" height="178" rx="9" fill="#22b2c4"/><rect x="10" y="8" width="114" height="159" rx="3" fill="#fffdf5"/>${Array.from({ length: 9 }, (_, i) => `<path d="M28 ${30 + i * 14}H108" stroke="#b8d7e1"/>`).join("")}<path d="M-4 9V166" stroke="#123945" stroke-width="7" stroke-dasharray="3 15"/></g><g transform="translate(637 310)"><rect y="47" width="122" height="28" rx="3" fill="#249faf"/><rect x="-14" y="18" width="126" height="27" rx="3" fill="#e74838"/><rect x="5" y="-12" width="110" height="28" rx="3" fill="#ffc84a"/><circle cx="56" cy="-44" r="24" fill="#64a938"/><path d="M57-60Q53-80 68-82" stroke="#294e22" stroke-width="6" fill="none"/></g>`;
  } else {
    s += `<circle cx="45" cy="190" r="155" fill="${accent}" opacity=".3"/><circle cx="743" cy="401" r="178" fill="${accent}" opacity=".4"/><path d="M0 397L794 166" stroke="white" stroke-width="2" opacity=".3"/>`;
  }
  s += `<rect x="215" y="158" width="364" height="233" rx="${adventure ? 0 : 18}" fill="${adventure ? "#164852" : school ? "#fff3d4" : color}" fill-opacity=".93" stroke="${accent}" stroke-width="${adventure ? 6 : 1}"/>`;
  s += txt(
    school ? "BACK TO SCHOOL" : c.brand.name.toUpperCase(),
    397,
    202,
    school ? 24 : 23,
    school ? color : accent,
    "middle",
  );
  s += txt("W", 353, 293, 104, school ? color : accent, "middle", 900);
  s += txt("M", 439, 348, 104, school ? color : accent, "middle", 900);
  s += txt("Wear Mart", 398, school ? 373 : 294, 22, school ? color : "white", "middle");
  s += `<rect y="429" width="794" height="27" fill="${color}"/>`;
  s += txt(
    c.headline.replace(/\n/g, " · ").slice(0, 70) ||
      "Items available in all 3 branches",
    397,
    448,
    14,
    "white",
    "middle",
  );
  const products = pageItems(c, t, page);
  slotRects(t).forEach(({ x, y, w, h }, i) => {
    const p = products[i];
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="white" stroke="${color}" stroke-width="1.7" stroke-dasharray="5 4"/>`;
    if (!p) return;
    const compact = t.capacity >= 9,
      imgH = Math.max(20, h - 100);
    if (p.image)
      s += `<image href="${esc(images[p.image] || p.image)}" x="${x + 9}" y="${y + 7}" width="${w - 18}" height="${imgH}" preserveAspectRatio="xMidYMid meet"/>`;
    if (p.badge)
      s +=
        `<rect x="${x + 10}" y="${y + 8}" width="${Math.min(w - 20, p.badge.length * 6 + 14)}" height="20" rx="8" fill="${color}"/>` +
        txt(p.badge.slice(0, 22), x + 17, y + 22, 10, "white");
    const label = p.name.length > 30 ? p.name.slice(0, 29) + "…" : p.name;
    s += txt(
      label,
      x + w / 2,
      y + h - (p.arabicName ? 82 : 75),
      compact ? 11 : 13,
      "#243b3c",
      "middle",
    );
    if (p.arabicName)
      s += `<text x="${x + w / 2}" y="${y + h - 65}" font-size="12" fill="#243b3c" text-anchor="middle" direction="rtl">${esc(p.arabicName.slice(0, 36))}</text>`;
    s += txt(
      p.pack.slice(0, 32),
      x + w - 12,
      y + h - 55,
      11,
      "#657374",
      "end",
      400,
    );
    s += `<rect x="${x + 10}" y="${y + h - 49}" width="${w - 20}" height="39" rx="19" fill="${accent}"/>`;
    s += txt(c.brand.currency, x + 21, y + h - 24, 10, color);
    s += txt(
      p.offer.toFixed(2),
      x + w - 20,
      y + h - 20,
      compact ? 25 : 30,
      color,
      "end",
      900,
    );
    if (
      p.showOldPrice === true ||
      (p.showOldPrice === undefined && p.price > p.offer)
    )
      s += `<text x="${x + 15}" y="${y + h - 55}" font-size="11" fill="#7a8180" text-decoration="line-through">${p.price.toFixed(2)}</text>`;
  });
  const branches = c.brand.branches?.length
    ? c.brand.branches
    : [
        {
          name: "Visit our store",
          address: c.brand.address,
          url: c.brand.locationUrl || "",
        },
      ];
  const bw = 758 / branches.length;
  branches.slice(0, 3).forEach((b, i) => {
    const x = 18 + i * bw,
      branchUrl = b.url || (i === 0 ? c.brand.locationUrl : undefined),
      has = !!branchUrl;
    s += txt(b.name, x + 8, 1002, 12, color);
    const address = b.address.match(/.{1,27}(?:\s|$)|.{1,27}/g) || [];
    address
      .slice(0, 3)
      .forEach(
        (line, j) =>
          (s += txt(
            line.trim(),
            x + 8,
            1020 + j * 13,
            10,
            "#4d5a58",
            "start",
            400,
          )),
      );
    if (has) s += qrSvg(branchUrl!, x + bw - 65, 991, 63);
  });
  s += `<rect y="1070" width="794" height="30" fill="${color}"/><rect y="1100" width="794" height="5" fill="${accent}"/>`;
  s += txt(
    c.brand.timings || "Visit your nearest branch",
    397,
    1090,
    12,
    "white",
    "middle",
  );
  s += txt(c.brand.terms.slice(0, 130), 397, 1118, 9, color, "middle", 400);
  return s + "</g></svg>";
}
